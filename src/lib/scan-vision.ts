import {
  CODE_ROI_PERCENT,
  CODE_ROI_VARIANTS,
  getCodeBoxPoints,
  getPixelRoi,
  getQuadrilateralMetrics,
  orderQuadrilateralPoints,
  polygonArea,
  type ScanPoint,
} from '@/lib/scan-detection'
import type { OcrCanvasAttempt } from '@/lib/scan-ocr'

type OpenCvMat = {
  rows: number
  data32S: Int32Array
  delete: () => void
}

type OpenCvMatConstructor = {
  new (): OpenCvMat
  ones: (rows: number, cols: number, type: number) => OpenCvMat
}

type OpenCvMatVector = {
  size: () => number
  get: (index: number) => OpenCvMat
  delete: () => void
}

type OpenCv = {
  BORDER_CONSTANT: number
  CHAIN_APPROX_SIMPLE: number
  COLOR_RGBA2GRAY: number
  CV_8U: number
  CV_32FC2: number
  INTER_LINEAR: number
  RETR_EXTERNAL: number
  Mat: OpenCvMatConstructor
  MatVector: new () => OpenCvMatVector
  Scalar: new (...values: number[]) => unknown
  Size: new (width: number, height: number) => unknown
  Canny: (...args: unknown[]) => void
  GaussianBlur: (...args: unknown[]) => void
  approxPolyDP: (curve: OpenCvMat, approxCurve: OpenCvMat, epsilon: number, closed: boolean) => void
  arcLength: (curve: OpenCvMat, closed: boolean) => number
  cvtColor: (...args: unknown[]) => void
  dilate: (...args: unknown[]) => void
  findContours: (...args: unknown[]) => void
  getPerspectiveTransform: (src: OpenCvMat, dst: OpenCvMat) => OpenCvMat
  imread: (source: HTMLCanvasElement) => OpenCvMat
  imshow: (canvas: HTMLCanvasElement, mat: OpenCvMat) => void
  matFromArray: (rows: number, cols: number, type: number, data: number[]) => OpenCvMat
  warpPerspective: (...args: unknown[]) => void
}

export type ScanVisionStatus = 'loading' | 'no-video' | 'no-card' | 'card-found'

export type ScanVisionResult = {
  status: ScanVisionStatus
  frameWidth: number
  frameHeight: number
  cardPoints: [ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null
  codeBoxPoints: [ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null
  codeCanvases: OcrCanvasAttempt[]
  message: string
}

const TARGET_CARD_WIDTH = 440
const TARGET_CARD_HEIGHT = 610
const MAX_FRAME_WIDTH = 760
const MIN_CARD_AREA_RATIO = 0.055
const MAX_CARD_AREA_RATIO = 0.82
const MIN_CARD_WIDTH = 120
const MIN_CARD_HEIGHT = 170

let cvPromise: Promise<OpenCv> | null = null

async function getOpenCv(): Promise<OpenCv> {
  if (!cvPromise) {
    cvPromise = (async () => {
      const mod = await import('@techstark/opencv-js')
      const candidate = mod.default ?? mod
      const maybePromise = candidate as unknown as { then?: unknown }
      const loaded = typeof maybePromise.then === 'function'
        ? await (candidate as unknown as Promise<unknown>)
        : candidate
      return loaded as unknown as OpenCv
    })()
  }

  return cvPromise
}

function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null

  const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  const context = canvas.getContext('2d')
  if (!context) return null

  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas
}

function pointsFromApprox(approx: OpenCvMat): ScanPoint[] {
  const points: ScanPoint[] = []
  for (let row = 0; row < approx.rows; row += 1) {
    points.push({
      x: approx.data32S[row * 2],
      y: approx.data32S[row * 2 + 1],
    })
  }
  return points
}

function isUsefulCardCandidate(
  points: [ScanPoint, ScanPoint, ScanPoint, ScanPoint],
  frameWidth: number,
  frameHeight: number,
): boolean {
  const metrics = getQuadrilateralMetrics(points)
  const areaRatio = metrics.area / (frameWidth * frameHeight)
  return (
    areaRatio >= MIN_CARD_AREA_RATIO &&
    areaRatio <= MAX_CARD_AREA_RATIO &&
    metrics.width >= MIN_CARD_WIDTH &&
    metrics.height >= MIN_CARD_HEIGHT &&
    metrics.aspectRatio >= 0.46 &&
    metrics.aspectRatio <= 0.92
  )
}

function candidateScore(points: [ScanPoint, ScanPoint, ScanPoint, ScanPoint], frameWidth: number, frameHeight: number) {
  const metrics = getQuadrilateralMetrics(points)
  const areaRatio = metrics.area / (frameWidth * frameHeight)
  const aspectPenalty = Math.abs(metrics.aspectRatio - 0.72)
  return areaRatio * 10 - aspectPenalty
}

function detectCardPoints(cv: OpenCv, frameCanvas: HTMLCanvasElement): [ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null {
  const src = cv.imread(frameCanvas)
  const gray = new cv.Mat()
  const blurred = new cv.Mat()
  const edges = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U)
  let best: [ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.Canny(blurred, edges, 45, 135)
    cv.dilate(edges, edges, kernel)
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index)
      const approx = new cv.Mat()
      try {
        const perimeter = cv.arcLength(contour, true)
        cv.approxPolyDP(contour, approx, perimeter * 0.025, true)
        if (approx.rows !== 4) continue

        const ordered = orderQuadrilateralPoints(pointsFromApprox(approx))
        if (!isUsefulCardCandidate(ordered, frameCanvas.width, frameCanvas.height)) continue

        const score = candidateScore(ordered, frameCanvas.width, frameCanvas.height)
        if (score > bestScore) {
          best = ordered
          bestScore = score
        }
      } finally {
        approx.delete()
        contour.delete()
      }
    }
  } finally {
    src.delete()
    gray.delete()
    blurred.delete()
    edges.delete()
    contours.delete()
    hierarchy.delete()
    kernel.delete()
  }

  return best
}

function warpCardCanvas(
  cv: OpenCv,
  frameCanvas: HTMLCanvasElement,
  points: [ScanPoint, ScanPoint, ScanPoint, ScanPoint],
): HTMLCanvasElement {
  const src = cv.imread(frameCanvas)
  const dst = new cv.Mat()
  const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    points[0].x, points[0].y,
    points[1].x, points[1].y,
    points[2].x, points[2].y,
    points[3].x, points[3].y,
  ])
  const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    TARGET_CARD_WIDTH, 0,
    TARGET_CARD_WIDTH, TARGET_CARD_HEIGHT,
    0, TARGET_CARD_HEIGHT,
  ])
  const transform = cv.getPerspectiveTransform(srcPoints, dstPoints)
  const canvas = document.createElement('canvas')
  canvas.width = TARGET_CARD_WIDTH
  canvas.height = TARGET_CARD_HEIGHT

  try {
    cv.warpPerspective(
      src,
      dst,
      transform,
      new cv.Size(TARGET_CARD_WIDTH, TARGET_CARD_HEIGHT),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(),
    )
    cv.imshow(canvas, dst)
  } finally {
    src.delete()
    dst.delete()
    srcPoints.delete()
    dstPoints.delete()
    transform.delete()
  }

  return canvas
}

function cropCanvas(source: HTMLCanvasElement, roi: { x: number; y: number; width: number; height: number }) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, roi.width)
  canvas.height = Math.max(1, roi.height)
  const context = canvas.getContext('2d')
  if (!context) return canvas

  context.drawImage(
    source,
    roi.x,
    roi.y,
    roi.width,
    roi.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return canvas
}

function normalizePoints(points: [ScanPoint, ScanPoint, ScanPoint, ScanPoint], width: number, height: number) {
  return points.map(point => ({
    x: point.x / width,
    y: point.y / height,
  })) as [ScanPoint, ScanPoint, ScanPoint, ScanPoint]
}

export async function extractStickerCodeCanvases(video: HTMLVideoElement | null): Promise<ScanVisionResult> {
  if (!video) {
    return {
      status: 'no-video',
      frameWidth: 0,
      frameHeight: 0,
      cardPoints: null,
      codeBoxPoints: null,
      codeCanvases: [],
      message: 'Abri la camara para empezar.',
    }
  }

  const frameCanvas = captureVideoFrame(video)
  if (!frameCanvas) {
    return {
      status: 'no-video',
      frameWidth: 0,
      frameHeight: 0,
      cardPoints: null,
      codeBoxPoints: null,
      codeCanvases: [],
      message: 'Esperando imagen de la camara...',
    }
  }

  const cv = await getOpenCv()
  const cardPoints = detectCardPoints(cv, frameCanvas)
  if (!cardPoints || polygonArea(cardPoints) === 0) {
    return {
      status: 'no-card',
      frameWidth: frameCanvas.width,
      frameHeight: frameCanvas.height,
      cardPoints: null,
      codeBoxPoints: null,
      codeCanvases: [],
      message: 'Buscando figurita...',
    }
  }

  const warpedCard = warpCardCanvas(cv, frameCanvas, cardPoints)
  const codeCanvases = CODE_ROI_VARIANTS.map((roi, index) => ({
    id: `codigo-${index + 1}`,
    canvas: cropCanvas(warpedCard, getPixelRoi(warpedCard.width, warpedCard.height, roi)),
  }))

  return {
    status: 'card-found',
    frameWidth: frameCanvas.width,
    frameHeight: frameCanvas.height,
    cardPoints: normalizePoints(cardPoints, frameCanvas.width, frameCanvas.height),
    codeBoxPoints: normalizePoints(getCodeBoxPoints(cardPoints, CODE_ROI_PERCENT), frameCanvas.width, frameCanvas.height),
    codeCanvases,
    message: 'Leyendo codigo...',
  }
}
