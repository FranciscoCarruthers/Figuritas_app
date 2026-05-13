import { STICKERS, STICKERS_MAP, TEAMS } from '@/data/sticker-data'
import type { Sticker } from '@/lib/types'

const NUMBER_TRANSLATION: Record<string, string> = {
  B: '8',
  G: '9',
  I: '1',
  L: '1',
  '|': '1',
  O: '0',
  Q: '0',
  D: '0',
  S: '5',
  T: '7',
  Z: '2',
}

function normalizeNumber(value: string): string {
  return value
    .toUpperCase()
    .split('')
    .map(char => NUMBER_TRANSLATION[char] ?? char)
    .join('')
    .replace(/\D/g, '')
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function getNumberedStickerCode(prefix: string, rawNumber: string): string | null {
  const normalizedNumber = normalizeNumber(rawNumber)
  if (!normalizedNumber) return null

  const code = `${prefix}${Number(normalizedNumber)}`
  return STICKERS_MAP[code] ? code : null
}

export function parseStickerCode(value: string): string | null {
  const text = normalizeText(value)
  const compact = text.replace(/[^A-Z0-9]/g, '')

  if (compact === '00' || normalizeNumber(compact) === '00') return '00'
  if (STICKERS_MAP[compact]) return compact

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

  return null
}

function collectStickerCodesFromText(value: string): string[] {
  const hits = new Set<string>()
  const direct = parseStickerCode(value)

  if (direct) hits.add(direct)

  const text = normalizeText(value)
  const codes = ['FWC', ...TEAMS.map(team => team.code)]

  for (const teamCode of codes) {
    const pattern = new RegExp(`(?:^|[^A-Z0-9])${teamCode}\\s*[-:.]?\\s*([0-9OQDGISZIL|BT]{1,2})(?=$|[^A-Z0-9])`, 'g')
    let match = pattern.exec(text)

    while (match) {
      const code = getNumberedStickerCode(teamCode, match[1])
      if (code) hits.add(code)
      match = pattern.exec(text)
    }
  }

  const compact = text.replace(/[^A-Z0-9]/g, '')
  for (const teamCode of codes) {
    const pattern = new RegExp(`${teamCode}([0-9OQDGISZIL|BT]{1,2})`, 'g')
    let match = pattern.exec(compact)

    while (match) {
      const code = getNumberedStickerCode(teamCode, match[1])
      if (code) hits.add(code)
      match = pattern.exec(compact)
    }
  }

  return [...hits].slice(0, 6)
}

export function parseStickerCodeFromText(value: string): string | null {
  return collectStickerCodesFromText(value)[0] ?? null
}

export function findStickerCandidates(value: string): Sticker[] {
  return collectStickerCodesFromText(value).map(code => STICKERS_MAP[code])
}

export function searchStickers(query: string): Sticker[] {
  const normalized = normalizeText(query)
  const compactQuery = normalized.replace(/\s+/g, '')
  if (!normalized.trim()) return []

  return STICKERS.filter(sticker => {
    const haystack = normalizeText(`${sticker.code} ${sticker.name} ${sticker.team} ${sticker.teamCode}`)
    const compactHaystack = haystack.replace(/\s+/g, '')
    return haystack.includes(normalized) || compactHaystack.includes(compactQuery)
  })
}
