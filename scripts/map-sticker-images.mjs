import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sharp = require('sharp')
const { createWorker, PSM } = require('tesseract.js')

const source = fs.readFileSync('src/data/sticker-data.ts', 'utf8')

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function findArrayAfter(marker) {
  const markerIndex = source.indexOf(marker)
  if (markerIndex === -1) throw new Error(`Missing marker: ${marker}`)
  const assignmentIndex = source.indexOf('=', markerIndex)
  const start = source.indexOf('[', assignmentIndex)
  let depth = 0
  let quote = null
  let escaped = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === '\'' || char === '"') {
      quote = char
      continue
    }
    if (char === '[') depth += 1
    if (char === ']') depth -= 1
    if (depth === 0) return source.slice(start, index + 1)
  }

  throw new Error(`Unclosed array after: ${marker}`)
}

function parseArray(marker) {
  return Function(`"use strict"; return (${findArrayAfter(marker)});`)()
}

function makeTeamStickers(team) {
  const stickers = []
  stickers.push({ code: `${team.code}1`, name: 'Team Logo', team: team.name, teamCode: team.code, type: 'logo', position: 1 })
  for (let index = 0; index < 11; index += 1) {
    stickers.push({ code: `${team.code}${index + 2}`, name: team.players[index], team: team.name, teamCode: team.code, type: 'player', position: index + 2 })
  }
  stickers.push({ code: `${team.code}13`, name: 'Team Photo', team: team.name, teamCode: team.code, type: 'photo', position: 13 })
  for (let index = 11; index < 18; index += 1) {
    stickers.push({ code: `${team.code}${index + 3}`, name: team.players[index], team: team.name, teamCode: team.code, type: 'player', position: index + 3 })
  }
  return stickers
}

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function compact(value) {
  return normalize(value).replace(/\s+/g, '')
}

function distance(left, right) {
  if (Math.abs(left.length - right.length) > 5) return 99
  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0))
  for (let index = 0; index <= left.length; index += 1) matrix[index][0] = index
  for (let index = 0; index <= right.length; index += 1) matrix[0][index] = index

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      )
    }
  }

  return matrix[left.length][right.length]
}

function makeScorer(stickers) {
  const tokenCounts = new Map()
  for (const sticker of stickers.filter(item => item.type === 'player')) {
    for (const token of normalize(sticker.name).split(/\s+/).filter(item => item.length >= 5)) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1)
    }
  }

  return function score(text, sticker) {
    const textCompact = compact(text)
    const nameCompact = compact(sticker.name)
    if (!nameCompact) return 0
    if (textCompact.includes(nameCompact)) return 1000 + nameCompact.length

    const textWords = normalize(text).split(/\s+/).filter(item => item.length > 2)
    const nameWords = normalize(sticker.name).split(/\s+/).filter(item => item.length > 2)
    let scoreValue = 0
    let uniqueTokenHit = false

    for (const nameWord of nameWords) {
      let best = 0
      for (const textWord of textWords) {
        const typoDistance = distance(textWord, nameWord)
        if (textWord === nameWord || textWord.includes(nameWord) || nameWord.includes(textWord)) {
          best = Math.max(best, nameWord.length)
        } else if (nameWord.length >= 5 && textWord.length >= 5 && typoDistance <= 2) {
          best = Math.max(best, nameWord.length - typoDistance)
        }
      }
      if (best > 0 && nameWord.length >= 5 && tokenCounts.get(nameWord) === 1) uniqueTokenHit = true
      scoreValue += best
    }

    if (uniqueTokenHit && scoreValue >= 5) return 600 + scoreValue
    return scoreValue
  }
}

async function ocrCandidate(worker, candidate) {
  const metadata = await sharp(candidate.path).metadata()
  const imageWidth = metadata.width ?? 1
  const imageHeight = metadata.height ?? 1
  const regions = [
    { left: 0.04, top: 0.7, width: 0.92, height: 0.16, mode: PSM.SINGLE_BLOCK },
    { left: 0.02, top: 0.61, width: 0.96, height: 0.33, mode: PSM.SINGLE_BLOCK },
  ]
  const texts = []

  for (const region of regions) {
    const left = Math.max(0, Math.round(imageWidth * region.left))
    const top = Math.max(0, Math.round(imageHeight * region.top))
    const width = Math.max(1, Math.min(imageWidth - left, Math.round(imageWidth * region.width)))
    const height = Math.max(1, Math.min(imageHeight - top, Math.round(imageHeight * region.height)))
    const crop = await sharp(candidate.path)
      .extract({ left, top, width, height })
      .resize({ width: 1000 })
      .grayscale()
      .normalise()
      .sharpen()
      .toBuffer()
    await worker.setParameters({ tessedit_pageseg_mode: region.mode })
    const result = await worker.recognize(crop)
    const text = result.data.text.trim().replace(/\s+/g, ' ')
    if (text) texts.push(text)
  }

  return texts.join(' ')
}

async function main() {
  const candidatesPath = getArg('--candidates')
  const outDir = getArg('--out', 'public/stickers')
  const allowPartial = hasFlag('--allow-partial')

  if (!candidatesPath) throw new Error('Usage: node scripts/map-sticker-images.mjs --candidates path/to/candidates.json [--allow-partial]')

  const intro = parseArray('const INTRO_STICKERS')
  const teams = parseArray('const TEAM_DATA')
  const stickers = [...intro, ...teams.flatMap(makeTeamStickers)]
  const score = makeScorer(stickers)
  const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'))
  const worker = await createWorker('eng')
  await worker.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -.()|', tessedit_pageseg_mode: PSM.SINGLE_BLOCK })

  const accepted = new Map()

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const text = await ocrCandidate(worker, candidate)
    const ranked = stickers
      .filter(sticker => sticker.type === 'player')
      .map(sticker => ({ sticker, score: score(text, sticker) }))
      .sort((a, b) => b.score - a.score)
    const best = ranked[0]
    const second = ranked[1]
    const reliable = best && (
      best.score >= 1000 ||
      (best.score >= 600 && best.score > second.score + 50) ||
      (best.score >= 10 && best.score > second.score + 2)
    )

    if (reliable) {
      const previous = accepted.get(best.sticker.code)
      if (!previous || best.score > previous.score) {
        accepted.set(best.sticker.code, { candidate, sticker: best.sticker, score: best.score, text })
      }
    }

    if ((index + 1) % 50 === 0) console.log(`OCR ${index + 1}/${candidates.length}`)
  }

  await worker.terminate()

  fs.mkdirSync(outDir, { recursive: true })
  for (const existing of fs.readdirSync(outDir).filter(file => file.endsWith('.webp'))) {
    fs.rmSync(path.join(outDir, existing))
  }

  for (const item of accepted.values()) {
    await sharp(item.candidate.path)
      .resize({ width: 520, height: 700, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(outDir, `${item.sticker.code}.webp`))
  }

  const mappedCodes = new Set(accepted.keys())
  const missing = stickers.filter(sticker => !mappedCodes.has(sticker.code)).map(sticker => sticker.code)
  fs.writeFileSync(
    path.join(outDir, '_manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), mapped: accepted.size, total: stickers.length, missing }, null, 2),
  )

  if (accepted.size !== stickers.length && !allowPartial) {
    throw new Error(`Mapped ${accepted.size}/${stickers.length}. Re-run with --allow-partial to write the reliable subset.`)
  }

  console.log(`Mapped ${accepted.size}/${stickers.length} sticker images`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
