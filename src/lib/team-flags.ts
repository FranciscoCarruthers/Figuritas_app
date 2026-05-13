const flagFromCodePoints = (...points: number[]) => String.fromCodePoint(...points)

const ENGLAND_FLAG = flagFromCodePoints(
  0x1f3f4,
  0xe0067,
  0xe0062,
  0xe0065,
  0xe006e,
  0xe0067,
  0xe007f,
)

const SCOTLAND_FLAG = flagFromCodePoints(
  0x1f3f4,
  0xe0067,
  0xe0062,
  0xe0073,
  0xe0063,
  0xe0074,
  0xe007f,
)

export const TEAM_FLAG_EMOJIS: Record<string, string> = {
  ALG: '🇩🇿',
  ARG: '🇦🇷',
  AUS: '🇦🇺',
  AUT: '🇦🇹',
  BEL: '🇧🇪',
  BIH: '🇧🇦',
  BRA: '🇧🇷',
  CAN: '🇨🇦',
  CIV: '🇨🇮',
  COD: '🇨🇩',
  COL: '🇨🇴',
  CPV: '🇨🇻',
  CRO: '🇭🇷',
  CUW: '🇨🇼',
  CZE: '🇨🇿',
  ECU: '🇪🇨',
  EGY: '🇪🇬',
  ENG: ENGLAND_FLAG,
  ESP: '🇪🇸',
  FRA: '🇫🇷',
  GER: '🇩🇪',
  GHA: '🇬🇭',
  HAI: '🇭🇹',
  IRN: '🇮🇷',
  IRQ: '🇮🇶',
  JOR: '🇯🇴',
  JPN: '🇯🇵',
  KOR: '🇰🇷',
  KSA: '🇸🇦',
  MAR: '🇲🇦',
  MEX: '🇲🇽',
  NED: '🇳🇱',
  NOR: '🇳🇴',
  NZL: '🇳🇿',
  PAN: '🇵🇦',
  PAR: '🇵🇾',
  POR: '🇵🇹',
  QAT: '🇶🇦',
  RSA: '🇿🇦',
  SCO: SCOTLAND_FLAG,
  SEN: '🇸🇳',
  SUI: '🇨🇭',
  SWE: '🇸🇪',
  TUN: '🇹🇳',
  TUR: '🇹🇷',
  URU: '🇺🇾',
  USA: '🇺🇸',
  UZB: '🇺🇿',
}

export function getTeamFlagEmoji(teamCode: string): string {
  const code = teamCode.toUpperCase()
  return TEAM_FLAG_EMOJIS[code] ?? ''
}
