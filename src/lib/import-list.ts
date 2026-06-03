import { getTeamStickers, isBonusTeamCode, STICKERS_MAP } from '../data/sticker-data.ts'

type ParsedMissingList = {
  missingCodes: Set<string>
  lineCount: number
  includedBonusTeamCodes: Set<string>
}

function normalizeLine(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function parseNumbers(value: string): string[] {
  return value
    .split(/[,;|\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function findTeamCode(label: string): string | null {
  const match = normalizeLine(label).match(/\b[A-Z]{2,3}\b/)
  if (!match) return null
  const code = match[0]
  return getTeamStickers(code).length > 0 ? code : null
}

function fwcCodeFromNumber(value: string): string | null {
  if (value === '00') return '00'
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > 19) return null
  return `FWC${number}`
}

function teamCodeFromNumber(teamCode: string, value: string): string | null {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > 20) return null
  const code = `${teamCode}${number}`
  return STICKERS_MAP[code] ? code : null
}

export function parseMissingStickersList(value: string): ParsedMissingList {
  const missingCodes = new Set<string>()
  const includedBonusTeamCodes = new Set<string>()
  let lineCount = 0

  for (const rawLine of value.split(/\r?\n/)) {
    const [rawLabel, rawNumbers] = rawLine.split(':')
    if (!rawLabel || !rawNumbers) continue

    const label = normalizeLine(rawLabel)
    const numbers = parseNumbers(rawNumbers)
    if (numbers.length === 0) continue

    if (label.includes('FWC')) {
      let found = 0
      for (const number of numbers) {
        const code = fwcCodeFromNumber(number)
        if (code && STICKERS_MAP[code]) {
          missingCodes.add(code)
          found += 1
        }
      }
      if (found > 0) lineCount += 1
      continue
    }

    const teamCode = findTeamCode(label)
    if (!teamCode) continue

    let found = 0
    for (const number of numbers) {
      const code = teamCodeFromNumber(teamCode, number)
      if (code) {
        missingCodes.add(code)
        found += 1
      }
    }
    if (found > 0) {
      lineCount += 1
      if (isBonusTeamCode(teamCode)) includedBonusTeamCodes.add(teamCode)
    }
  }

  return { missingCodes, lineCount, includedBonusTeamCodes }
}
