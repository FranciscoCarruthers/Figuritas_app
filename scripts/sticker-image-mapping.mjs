export function findArrayAfter(source, marker) {
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

export function parseStickerDataSource(source) {
  return {
    intro: Function(`"use strict"; return (${findArrayAfter(source, 'const INTRO_STICKERS')});`)(),
    teams: Function(`"use strict"; return (${findArrayAfter(source, 'const TEAM_DATA')});`)(),
  }
}

export function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

export function compact(value) {
  return normalize(value).replace(/\s+/g, '')
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

const TEAM_ALIASES = {
  BRA: ['BRAZIL', 'BRASIL', 'CBF'],
  CIV: ['IVORY COAST', 'COTE D IVOIRE', 'COTE DIVOIRE'],
  COD: ['CONGO DR', 'DR CONGO', 'CONGO'],
  CPV: ['CAPE VERDE', 'CABO VERDE'],
  CUW: ['CURACAO', 'CURASAO'],
  CZE: ['CZECHIA', 'CZECH REPUBLIC'],
  ENG: ['ENGLAND'],
  GER: ['GERMANY', 'DEUTSCHER', 'DEUTSCHLAND', 'DFB'],
  KOR: ['SOUTH KOREA', 'KOREA'],
  KSA: ['SAUDI ARABIA', 'SAUDI'],
  NED: ['NETHERLANDS', 'HOLLAND'],
  RSA: ['SOUTH AFRICA', 'AFRICA'],
  SCO: ['SCOTLAND'],
  ESP: ['SPAIN', 'ESPANA'],
  SUI: ['SWITZERLAND', 'SUISSE', 'SCHWEIZ'],
  TUR: ['TURKIYE', 'TURKEY'],
  USA: ['USA', 'UNITED STATES'],
}

const INTRO_ALIASES = {
  '00': ['PANINI LOGO'],
  FWC1: ['OFFICIAL EMBLEM', 'EMBLEM'],
  FWC2: ['OFFICIAL EMBLEM', 'EMBLEM'],
  FWC3: ['OFFICIAL MASCOTS', 'MASCOTS', 'MAPLE', 'ZAYU', 'CLUTCH'],
  FWC4: ['OFFICIAL SLOGAN', 'SLOGAN'],
  FWC5: ['OFFICIAL BALL'],
  FWC6: ['CANADA HOST CITIES'],
  FWC7: ['MEXICO HOST CITIES'],
  FWC8: ['USA HOST CITIES', 'UNITED STATES HOST CITIES'],
  FWC9: ['ITALY 1934'],
  FWC10: ['URUGUAY 1950'],
  FWC11: ['WEST GERMANY 1954', 'GERMANY 1954'],
  FWC12: ['BRAZIL 1962', 'BRASIL 1962'],
  FWC13: ['WEST GERMANY 1974', 'GERMANY 1974'],
  FWC14: ['ARGENTINA 1986'],
  FWC15: ['BRAZIL 1994', 'BRASIL 1994'],
  FWC16: ['BRAZIL 2002', 'BRASIL 2002'],
  FWC17: ['ITALY 2006'],
  FWC18: ['GERMANY 2014'],
  FWC19: ['ARGENTINA 2022'],
}

export function buildStickerImageCatalog(data) {
  const teams = data.teams.map(team => ({
    ...team,
    aliases: [...new Set([team.code, team.name, ...(TEAM_ALIASES[team.code] ?? [])].map(normalize))]
      .sort((left, right) => compact(right).length - compact(left).length),
  }))
  const teamStickers = teams.flatMap(makeTeamStickers)
  const stickers = [...data.intro, ...teamStickers]
  const stickerByCode = new Map(stickers.map(sticker => [sticker.code, sticker]))
  const teamsByCode = new Map(teams.map(team => [team.code, team]))
  const tokenCounts = new Map()

  for (const sticker of stickers.filter(item => item.type === 'player')) {
    for (const token of normalize(sticker.name).split(/\s+/).filter(item => item.length >= 5)) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1)
    }
  }

  return { intro: data.intro, teams, stickers, stickerByCode, teamsByCode, tokenCounts }
}

function includesCompact(textCompact, phrase) {
  return textCompact.includes(compact(phrase))
}

function findTeamAlias(textCompact, team, { allowShort = false } = {}) {
  return team.aliases.find(alias => {
    const value = compact(alias)
    return (allowShort || value.length > 3) && textCompact.includes(value)
  })
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

function scorePlayerText(text, sticker, tokenCounts) {
  const textCompact = compact(text)
  const nameCompact = compact(sticker.name)
  if (!nameCompact) return 0
  if (textCompact.includes(nameCompact)) return 1000 + nameCompact.length

  const textWords = normalize(text).split(/\s+/).filter(item => item.length > 2)
  const nameWords = normalize(sticker.name).split(/\s+/).filter(item => item.length > 2)
  let score = 0
  let strongHits = 0
  let uniqueTokenHit = false

  for (const nameWord of nameWords) {
    let best = 0
    for (const textWord of textWords) {
      const typoDistance = distance(textWord, nameWord)
      if (textWord === nameWord || textWord.includes(nameWord) || nameWord.includes(textWord)) {
        best = Math.max(best, nameWord.length)
      } else if (nameWord.length >= 5 && textWord.length >= 5 && typoDistance <= 1) {
        best = Math.max(best, nameWord.length - typoDistance)
      }
    }
    if (best >= Math.min(5, nameWord.length)) strongHits += 1
    if (best > 0 && nameWord.length >= 5 && tokenCounts.get(nameWord) === 1) uniqueTokenHit = true
    score += best
  }

  if (nameWords.length === 1 && score >= 6) return 700 + score
  if (uniqueTokenHit && score >= 5) return 700 + score
  if (strongHits >= 2 && score >= 9) return 700 + score
  return 0
}

export function classifyStickerImageText(text, catalog) {
  const normalized = normalize(text)
  const textCompact = compact(text)
  const candidates = []
  const hasWeAre = textCompact.includes('WEARE') || textCompact.includes('QUALIFIERS')
  const looksLikePlayerCard = /\b\d{1,2}\s+\d{1,2}\s+\d{4}\b/.test(normalized) ||
    textCompact.includes('KG') ||
    /\b\d{3,4}M\b/.test(textCompact)

  for (const team of catalog.teams) {
    const alias = findTeamAlias(textCompact, team)
    if (!alias) continue

    if (hasWeAre) {
      candidates.push({
        sticker: catalog.stickerByCode.get(`${team.code}13`),
        score: 1400 + compact(alias).length,
        reason: 'team-photo',
      })
      continue
    }

    if (!looksLikePlayerCard && (textCompact.includes('FIFAWORLDCUP') || normalized.includes('FOOTBALL') || normalized.includes('ASSOCIATION'))) {
      candidates.push({
        sticker: catalog.stickerByCode.get(`${team.code}1`),
        score: 900 + compact(alias).length,
        reason: 'team-logo',
      })
    }
  }

  if (!looksLikePlayerCard) {
    for (const [code, aliases] of Object.entries(INTRO_ALIASES)) {
      const alias = aliases.find(item => includesCompact(textCompact, item))
      if (alias) {
        candidates.push({
          sticker: catalog.stickerByCode.get(code),
          score: 1100 + compact(alias).length,
          reason: 'intro',
        })
      }
    }
  }

  if (!hasWeAre) {
    for (const sticker of catalog.stickers.filter(item => item.type === 'player')) {
      const score = scorePlayerText(text, sticker, catalog.tokenCounts)
      if (score > 0) candidates.push({ sticker, score, reason: 'player' })
    }
  }

  const valid = candidates.filter(item => item.sticker)
  valid.sort((left, right) => right.score - left.score)
  const best = valid[0]
  const second = valid[1]
  if (!best) return null
  if (best.score < 700) return null
  if (second && best.score < 1100 && best.score <= second.score + 2) return null
  return best
}
