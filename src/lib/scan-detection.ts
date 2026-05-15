import { STICKERS_MAP } from '@/data/sticker-data'
import { parseStickerCodeFromText } from '@/lib/sticker-search'

export type ScanPoint = {
  x: number
  y: number
}

export type ScanRoi = {
  x: number
  y: number
  width: number
  height: number
}

export type ScanReading = {
  code: string | null
  confidence: number
  text: string
}

export const CODE_ROI_PERCENT: ScanRoi = {
  x: 0.56,
  y: 0.045,
  width: 0.40,
  height: 0.125,
}

export const CODE_ROI_VARIANTS: ScanRoi[] = [
  CODE_ROI_PERCENT,
  { x: 0.52, y: 0.035, width: 0.44, height: 0.145 },
  { x: 0.58, y: 0.065, width: 0.36, height: 0.125 },
]

export function orderQuadrilateralPoints(points: ScanPoint[]): [ScanPoint, ScanPoint, ScanPoint, ScanPoint] {
  if (points.length !== 4) {
    throw new Error(`Expected 4 points, got ${points.length}`)
  }

  const bySum = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y))
  const byDiff = [...points].sort((a, b) => (a.x - a.y) - (b.x - b.y))

  return [
    bySum[0],
    byDiff[3],
    bySum[3],
    byDiff[0],
  ]
}

export function distance(a: ScanPoint, b: ScanPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function polygonArea(points: ScanPoint[]): number {
  let total = 0
  for (let index = 0; index < points.length; index += 1) {
    const nextIndex = (index + 1) % points.length
    total += points[index].x * points[nextIndex].y - points[nextIndex].x * points[index].y
  }
  return Math.abs(total / 2)
}

export function getQuadrilateralMetrics(points: [ScanPoint, ScanPoint, ScanPoint, ScanPoint]) {
  const [topLeft, topRight, bottomRight, bottomLeft] = points
  const width = (distance(topLeft, topRight) + distance(bottomLeft, bottomRight)) / 2
  const height = (distance(topLeft, bottomLeft) + distance(topRight, bottomRight)) / 2
  const aspectRatio = height === 0 ? 0 : width / height

  return { width, height, aspectRatio, area: polygonArea(points) }
}

function interpolate(a: ScanPoint, b: ScanPoint, ratio: number): ScanPoint {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
  }
}

function pointInQuad(
  [topLeft, topRight, bottomRight, bottomLeft]: [ScanPoint, ScanPoint, ScanPoint, ScanPoint],
  xRatio: number,
  yRatio: number,
): ScanPoint {
  const top = interpolate(topLeft, topRight, xRatio)
  const bottom = interpolate(bottomLeft, bottomRight, xRatio)
  return interpolate(top, bottom, yRatio)
}

export function getCodeBoxPoints(
  points: [ScanPoint, ScanPoint, ScanPoint, ScanPoint],
  roi: ScanRoi = CODE_ROI_PERCENT,
): [ScanPoint, ScanPoint, ScanPoint, ScanPoint] {
  return [
    pointInQuad(points, roi.x, roi.y),
    pointInQuad(points, roi.x + roi.width, roi.y),
    pointInQuad(points, roi.x + roi.width, roi.y + roi.height),
    pointInQuad(points, roi.x, roi.y + roi.height),
  ]
}

export function getPixelRoi(canvasWidth: number, canvasHeight: number, roi: ScanRoi): ScanRoi {
  return {
    x: Math.round(canvasWidth * roi.x),
    y: Math.round(canvasHeight * roi.y),
    width: Math.round(canvasWidth * roi.width),
    height: Math.round(canvasHeight * roi.height),
  }
}

export function parseScanCodeFromText(text: string): string | null {
  const code = parseStickerCodeFromText(text)
  return code && STICKERS_MAP[code] ? code : null
}

export function appendScanReading(history: ScanReading[], reading: ScanReading, limit = 3): ScanReading[] {
  return [...history, reading].slice(-limit)
}

export function getStableScanCode(history: ScanReading[]): string | null {
  const counts = new Map<string, number>()
  for (const reading of history) {
    if (!reading.code) continue
    counts.set(reading.code, (counts.get(reading.code) ?? 0) + 1)
  }

  for (const [code, count] of counts) {
    if (count >= 2) return code
  }

  const latest = history[history.length - 1]
  if (latest?.code && latest.confidence >= 88) return latest.code

  return null
}
