import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'

import {
  buildStickerImageCatalog,
  classifyStickerImageText,
  parseStickerDataSource,
} from './sticker-image-mapping.mjs'

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

function toPosixPath(value) {
  return value.replaceAll(path.sep, '/')
}

async function imageBuffer(filePath, options = {}) {
  let pipeline = sharp(filePath)

  if (options.rotate) pipeline = pipeline.rotate(options.rotate)
  if (options.crop) pipeline = pipeline.extract(options.crop)

  return pipeline
    .resize({ width: options.width ?? 1300, withoutEnlargement: true })
    .grayscale()
    .normalise()
    .sharpen()
    .toBuffer()
}

async function recognize(worker, buffer, mode = PSM.SINGLE_BLOCK) {
  await worker.setParameters({ tessedit_pageseg_mode: mode })
  const result = await worker.recognize(buffer)
  return result.data.text.trim().replace(/\s+/g, ' ')
}

async function ocrCandidate(worker, candidate) {
  const metadata = await sharp(candidate.path).metadata()
  const width = metadata.width ?? 1
  const height = metadata.height ?? 1
  const regions = []

  regions.push({ label: 'full', buffer: await imageBuffer(candidate.path), mode: PSM.SINGLE_BLOCK })

  if (height > width) {
    const bottom = {
      left: Math.max(0, Math.round(width * 0.02)),
      top: Math.max(0, Math.round(height * 0.58)),
      width: Math.max(1, Math.round(width * 0.96)),
      height: Math.max(1, Math.round(height * 0.38)),
    }
    regions.push({ label: 'bottom', buffer: await imageBuffer(candidate.path, { crop: bottom, width: 1100 }), mode: PSM.SINGLE_BLOCK })
    regions.push({ label: 'rot-90', buffer: await imageBuffer(candidate.path, { rotate: -90 }), mode: PSM.SINGLE_BLOCK })
    regions.push({ label: 'rot90', buffer: await imageBuffer(candidate.path, { rotate: 90 }), mode: PSM.SINGLE_BLOCK })
  } else {
    regions.push({ label: 'landscape', buffer: await imageBuffer(candidate.path, { width: 1400 }), mode: PSM.SINGLE_BLOCK })
  }

  const texts = []
  for (const region of regions) {
    const text = await recognize(worker, region.buffer, region.mode)
    if (text) texts.push(text)
  }

  return texts.join(' ')
}

async function writeStickerAsset(item, outDir) {
  let pipeline = sharp(item.candidate.path)

  if (item.match.sticker.type === 'photo') {
    const metadata = await pipeline.metadata()
    if ((metadata.height ?? 0) > (metadata.width ?? 0)) {
      pipeline = pipeline.rotate(90)
    }
  }

  await pipeline
    .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, effort: 6 })
    .toFile(path.join(outDir, `${item.match.sticker.code}.webp`))
}

async function main() {
  const candidatesPath = getArg('--candidates')
  const outDir = getArg('--out', 'public/stickers')
  const overridesPath = getArg('--overrides', 'scripts/sticker-image-overrides.json')
  const allowPartial = hasFlag('--allow-partial')
  const replaceExisting = hasFlag('--replace')

  if (!candidatesPath) {
    throw new Error('Usage: node scripts/map-sticker-images.mjs --candidates path/to/candidates.json [--allow-partial]')
  }

  const catalog = buildStickerImageCatalog(parseStickerDataSource(source))
  const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'))
  const overrides = fs.existsSync(overridesPath)
    ? JSON.parse(fs.readFileSync(overridesPath, 'utf8'))
    : {}
  const worker = await createWorker('eng')
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -.()|',
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
  })

  const accepted = new Map()
  const rejected = []

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const overrideCode = overrides[String(candidate.id)]
    if (overrideCode) {
      const sticker = catalog.stickerByCode.get(overrideCode)
      if (!sticker) throw new Error(`Unknown override code ${overrideCode} for candidate ${candidate.id}`)
      accepted.set(sticker.code, {
        candidate,
        match: { sticker, score: 2500, reason: 'manual-override' },
        text: `manual override ${overrideCode}`,
      })
      continue
    }

    const text = await ocrCandidate(worker, candidate)
    const match = classifyStickerImageText(text, catalog)

    if (match) {
      const previous = accepted.get(match.sticker.code)
      if (!previous || match.score > previous.match.score) {
        accepted.set(match.sticker.code, { candidate, match, text })
      }
    } else {
      rejected.push({ candidate, text })
    }

    if ((index + 1) % 25 === 0) console.log(`OCR ${index + 1}/${candidates.length}`)
  }

  await worker.terminate()

  fs.mkdirSync(outDir, { recursive: true })
  if (replaceExisting) {
    for (const existing of fs.readdirSync(outDir).filter(file => file.endsWith('.webp'))) {
      fs.rmSync(path.join(outDir, existing))
    }
  }

  for (const item of accepted.values()) {
    await writeStickerAsset(item, outDir)
  }

  const availableCodes = new Set(
    fs.readdirSync(outDir)
      .filter(file => file.endsWith('.webp') && !file.startsWith('_'))
      .map(file => path.basename(file, '.webp')),
  )
  const missing = catalog.stickers.filter(sticker => !availableCodes.has(sticker.code)).map(sticker => sticker.code)
  const acceptedRows = [...accepted.values()]
    .sort((left, right) => left.match.sticker.code.localeCompare(right.match.sticker.code, 'en', { numeric: true }))
    .map(item => ({
      code: item.match.sticker.code,
      name: item.match.sticker.name,
      type: item.match.sticker.type,
      reason: item.match.reason,
      score: item.match.score,
      candidate: toPosixPath(item.candidate.path),
      page: item.candidate.page,
    }))

  fs.writeFileSync(
    path.join(outDir, '_manifest.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      mapped: accepted.size,
      available: availableCodes.size,
      total: catalog.stickers.length,
      candidates: candidates.length,
      missing,
      accepted: acceptedRows,
      rejectedCount: rejected.length,
      rejected: rejected.slice(0, 200).map(item => ({
        candidate: toPosixPath(item.candidate.path),
        page: item.candidate.page,
      })),
    }, null, 2),
  )

  if (accepted.size !== catalog.stickers.length && !allowPartial) {
    throw new Error(`Mapped ${accepted.size}/${catalog.stickers.length}. Re-run with --allow-partial to write the reliable subset.`)
  }

  console.log(`Mapped ${accepted.size}/${catalog.stickers.length} sticker images`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
