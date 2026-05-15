import { parseScanCodeFromText } from '@/lib/scan-detection'

type OcrMode = 'contrast' | 'threshold' | 'invert-threshold' | 'invert'

type TesseractWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string; confidence: number } }>
  setParameters: (parameters: Record<string, string | number>) => Promise<unknown>
  terminate: () => Promise<unknown>
}

export type OcrCanvasAttempt = {
  id: string
  canvas: HTMLCanvasElement
}

export type OcrScanResult = {
  code: string | null
  confidence: number
  text: string
  debugText: string
  previewCanvas: HTMLCanvasElement | null
}

const OCR_MODES: OcrMode[] = ['contrast', 'threshold', 'invert-threshold', 'invert']

let workerPromise: Promise<TesseractWorker> | null = null

async function getOcrWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import('tesseract.js')
      const worker = await createWorker('eng') as TesseractWorker
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      })
      return worker
    })()
  }

  return workerPromise
}

export async function disposeOcrWorker() {
  if (!workerPromise) return
  const worker = await workerPromise
  workerPromise = null
  await worker.terminate()
}

function processedPixel(value: number, mode: OcrMode): number {
  if (mode === 'threshold') return value > 150 ? 255 : 0
  if (mode === 'invert-threshold') return value > 150 ? 0 : 255
  if (mode === 'invert') return 255 - value
  return Math.max(0, Math.min(255, (value - 128) * 2.35 + 128))
}

function makeProcessedCanvas(source: HTMLCanvasElement, mode: OcrMode): HTMLCanvasElement {
  const scale = Math.max(2, Math.ceil(520 / Math.max(1, source.width)))
  const canvas = document.createElement('canvas')
  canvas.width = source.width * scale
  canvas.height = source.height * scale
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return source

  context.imageSmoothingEnabled = true
  context.drawImage(source, 0, 0, canvas.width, canvas.height)

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData
  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
    const value = processedPixel(gray, mode)
    data[index] = value
    data[index + 1] = value
    data[index + 2] = value
    data[index + 3] = 255
  }
  context.putImageData(imageData, 0, 0)

  return canvas
}

function expandAttempts(attempts: OcrCanvasAttempt[]): OcrCanvasAttempt[] {
  return attempts.flatMap(attempt => OCR_MODES.map(mode => ({
    id: `${attempt.id}/${mode}`,
    canvas: makeProcessedCanvas(attempt.canvas, mode),
  })))
}

export async function recognizeStickerCode(attempts: OcrCanvasAttempt[]): Promise<OcrScanResult> {
  const worker = await getOcrWorker()
  const expandedAttempts = expandAttempts(attempts)
  const debugParts: string[] = []
  let best: OcrScanResult = {
    code: null,
    confidence: 0,
    text: '',
    debugText: '',
    previewCanvas: expandedAttempts[0]?.canvas ?? null,
  }

  for (const attempt of expandedAttempts) {
    const result = await worker.recognize(attempt.canvas)
    const text = result.data.text.trim()
    const confidence = Math.max(0, Math.round(result.data.confidence || 0))
    const code = parseScanCodeFromText(text)
    debugParts.push(`${attempt.id}: ${text || 'sin texto'} (${confidence})`)

    if (code && confidence >= best.confidence) {
      best = {
        code,
        confidence,
        text,
        debugText: debugParts.join('\n'),
        previewCanvas: attempt.canvas,
      }
    }

    if (code && confidence >= 72) break
  }

  return {
    ...best,
    debugText: debugParts.join('\n'),
  }
}
