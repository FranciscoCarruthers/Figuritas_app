import fs from 'node:fs'

const seed = fs.readFileSync('supabase/seed.sql', 'utf8')
const codes = new Set([...seed.matchAll(/\('([^']+)', 'fifa-world-cup-2026', 'section-/g)].map(match => match[1]))

const numberTranslation = { I: '1', L: '1', '|': '1', O: '0', Q: '0', D: '0', S: '5', Z: '2' }

function normalizeNumber(value) {
  return value
    .toUpperCase()
    .split('')
    .map(char => numberTranslation[char] ?? char)
    .join('')
    .replace(/\D/g, '')
}

function parseStickerCode(value) {
  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  const compact = text.replace(/[^A-Z0-9]/g, '')

  if (compact === '00' || normalizeNumber(compact) === '00') return '00'
  if (codes.has(compact)) return compact

  const fwcMatch = compact.match(/^FWC([0-9OQDISZIL|]{1,2})$/)
  if (fwcMatch) {
    const code = `FWC${Number(normalizeNumber(fwcMatch[1]))}`
    if (codes.has(code)) return code
  }

  const teamMatch = compact.match(/^([A-Z]{3})([0-9OQDISZIL|]{1,2})$/)
  if (teamMatch) {
    const code = `${teamMatch[1]}${Number(normalizeNumber(teamMatch[2]))}`
    if (codes.has(code)) return code
  }

  return null
}

const cases = new Map([
  ['ARG15', 'ARG15'],
  ['ARG 15', 'ARG15'],
  ['arg-15', 'ARG15'],
  ['FWC10', 'FWC10'],
  ['FWC IO', 'FWC10'],
  ['00', '00'],
  ['OO', '00'],
  ['O0', '00'],
])

for (const [input, expected] of cases) {
  const actual = parseStickerCode(input)
  if (actual !== expected) {
    throw new Error(`Parser failed for "${input}": expected ${expected}, got ${actual}`)
  }
}

console.log(`Parser validated ${cases.size} OCR variants.`)
