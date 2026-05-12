import { STICKERS, STICKERS_MAP, TEAMS } from '@/data/sticker-data'
import type { Sticker } from '@/lib/types'

const NUMBER_TRANSLATION: Record<string, string> = {
  I: '1',
  L: '1',
  '|': '1',
  O: '0',
  Q: '0',
  D: '0',
  S: '5',
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

export function parseStickerCode(value: string): string | null {
  const text = normalizeText(value)
  const compact = text.replace(/[^A-Z0-9]/g, '')

  if (compact === '00' || normalizeNumber(compact) === '00') return '00'
  if (STICKERS_MAP[compact]) return compact

  const fwcMatch = compact.match(/^FWC([0-9OQDISZIL|]{1,2})$/)
  if (fwcMatch) {
    const code = `FWC${Number(normalizeNumber(fwcMatch[1]))}`
    if (STICKERS_MAP[code]) return code
  }

  const teamMatch = compact.match(/^([A-Z]{3})([0-9OQDISZIL|]{1,2})$/)
  if (teamMatch) {
    const code = `${teamMatch[1]}${Number(normalizeNumber(teamMatch[2]))}`
    if (STICKERS_MAP[code]) return code
  }

  return null
}

export function findStickerCandidates(value: string): Sticker[] {
  const hits = new Map<string, Sticker>()
  const direct = parseStickerCode(value)

  if (direct) hits.set(direct, STICKERS_MAP[direct])

  const text = normalizeText(value)
  const codes = ['FWC', ...TEAMS.map(team => team.code)]

  for (const teamCode of codes) {
    const pattern = new RegExp(`${teamCode}\\s*[-:.]?\\s*([0-9OQDISZIL|]{1,2})`, 'g')
    let match = pattern.exec(text)

    while (match) {
      const number = Number(normalizeNumber(match[1]))
      const code = `${teamCode}${number}`
      if (STICKERS_MAP[code]) hits.set(code, STICKERS_MAP[code])
      match = pattern.exec(text)
    }
  }

  for (const sticker of STICKERS) {
    if (text.includes(normalizeText(sticker.code))) {
      hits.set(sticker.code, sticker)
    }
  }

  return [...hits.values()].slice(0, 6)
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
