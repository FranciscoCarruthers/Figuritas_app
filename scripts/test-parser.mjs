import fs from 'node:fs'

const seed = fs.readFileSync('supabase/seed.sql', 'utf8')
const codes = new Set([...seed.matchAll(/\('([^']+)', 'fifa-world-cup-2026', 'section-/g)].map(match => match[1]))

const numberTranslation = { B: '8', G: '9', I: '1', L: '1', '|': '1', O: '0', Q: '0', D: '0', S: '5', T: '7', Z: '2' }
const prefixTranslation = { 0: 'O', 1: 'I', 5: 'S', 6: 'G', 8: 'B' }

function normalizeNumber(value) {
  return value
    .toUpperCase()
    .split('')
    .map(char => numberTranslation[char] ?? char)
    .join('')
    .replace(/\D/g, '')
}

function getNumberedStickerCode(prefix, rawNumber) {
  const normalizedNumber = normalizeNumber(rawNumber)
  if (!normalizedNumber) return null

  const code = `${prefix}${Number(normalizedNumber)}`
  return codes.has(code) ? code : null
}

function normalizePrefix(value) {
  return value
    .toUpperCase()
    .split('')
    .map(char => prefixTranslation[char] ?? char)
    .join('')
    .replace(/[^A-Z]/g, '')
}

function parseStickerCode(value) {
  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  const compact = text.replace(/[^A-Z0-9]/g, '')

  if (compact === '00' || normalizeNumber(compact) === '00') return '00'
  if (codes.has(compact)) return compact

  const fwcMatch = compact.match(/^FWC([0-9OQDGISZIL|BT]{1,2})$/)
  if (fwcMatch) {
    const code = getNumberedStickerCode('FWC', fwcMatch[1])
    if (code) return code
  }

  const teamMatch = compact.match(/^([A-Z]{3})([0-9OQDGISZIL|BT]{1,2})$/)
  if (teamMatch) {
    const code = getNumberedStickerCode(teamMatch[1], teamMatch[2])
    if (code) return code
  }

  const noisyTeamMatch = compact.match(/^([A-Z0-9]{3})([0-9OQDGISZIL|BT]{1,2})$/)
  if (noisyTeamMatch) {
    const code = getNumberedStickerCode(normalizePrefix(noisyTeamMatch[1]), noisyTeamMatch[2])
    if (code) return code
  }

  return null
}

function collectStickerCodesFromText(value) {
  const hits = new Set()
  const direct = parseStickerCode(value)
  if (direct) hits.add(direct)

  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  const compact = text.replace(/[^A-Z0-9]/g, '')
  const prefixes = ['FWC', ...new Set([...codes].map(code => code.match(/^[A-Z]+/)?.[0]).filter(Boolean))]

  for (const prefix of prefixes) {
    const spacedPattern = new RegExp(`(?:^|[^A-Z0-9])${prefix}\\s*[-:.]?\\s*([0-9OQDGISZIL|BT]{1,2})(?=$|[^A-Z0-9])`, 'g')
    let match = spacedPattern.exec(text)
    while (match) {
      const code = getNumberedStickerCode(prefix, match[1])
      if (code) hits.add(code)
      match = spacedPattern.exec(text)
    }

    const compactPattern = new RegExp(`${prefix}([0-9OQDGISZIL|BT]{1,2})`, 'g')
    match = compactPattern.exec(compact)
    while (match) {
      const code = getNumberedStickerCode(prefix, match[1])
      if (code) hits.add(code)
      match = compactPattern.exec(compact)
    }
  }

  const noisyPattern = /([A-Z0-9]{3})([0-9OQDGISZIL|BT]{1,2})/g
  let noisyMatch = noisyPattern.exec(compact)
  while (noisyMatch) {
    const code = getNumberedStickerCode(normalizePrefix(noisyMatch[1]), noisyMatch[2])
    if (code) hits.add(code)
    noisyMatch = noisyPattern.exec(compact)
  }

  return [...hits]
}

function parseStickerCodeFromText(value) {
  return collectStickerCodesFromText(value)[0] ?? null
}

const cases = new Map([
  ['ARG15', ['parseStickerCode', 'ARG15']],
  ['ARG 15', ['parseStickerCode', 'ARG15']],
  ['arg-15', ['parseStickerCode', 'ARG15']],
  ['FWC10', ['parseStickerCode', 'FWC10']],
  ['FWC IO', ['parseStickerCode', 'FWC10']],
  ['00', ['parseStickerCode', '00']],
  ['OO', ['parseStickerCode', '00']],
  ['O0', ['parseStickerCode', '00']],
  ['PAR 19', ['parseStickerCodeFromText', 'PAR19']],
  ['PAR19', ['parseStickerCodeFromText', 'PAR19']],
  ['PAR I9', ['parseStickerCodeFromText', 'PAR19']],
  ['PAR IG', ['parseStickerCodeFromText', 'PAR19']],
  ['FIFA WORLD CUP 2026 PAR 19', ['parseStickerCodeFromText', 'PAR19']],
  ['FWC 10', ['parseStickerCodeFromText', 'FWC10']],
  ['ARG 1', ['parseStickerCodeFromText', 'ARG1']],
  ['COL 16', ['parseStickerCodeFromText', 'COL16']],
  ['COL16', ['parseStickerCodeFromText', 'COL16']],
  ['GHA 19', ['parseStickerCodeFromText', 'GHA19']],
  ['GHA I9', ['parseStickerCodeFromText', 'GHA19']],
  ['PAN 19', ['parseStickerCodeFromText', 'PAN19']],
  ['K0R 19', ['parseStickerCodeFromText', 'KOR19']],
  ['GHA 7', ['parseStickerCodeFromText', 'GHA7']],
  ['FIFA Official Licensed Product Industria Argentina 005460', ['parseStickerCodeFromText', null]],
])

for (const [input, [fn, expected]] of cases) {
  const actual = fn === 'parseStickerCodeFromText' ? parseStickerCodeFromText(input) : parseStickerCode(input)
  if (actual !== expected) {
    throw new Error(`${fn} failed for "${input}": expected ${expected}, got ${actual}`)
  }
}

console.log(`Parser validated ${cases.size} OCR variants.`)
