type StickerImageManifest = {
  accepted?: Array<{ code?: string }>
}

let imageCodePromise: Promise<Set<string>> | null = null
const STICKER_IMAGE_MANIFEST_VERSION = '2026-06-03-cc-images-v2'

async function loadStickerImageCodes() {
  const response = await fetch(`/stickers/_manifest.json?v=${STICKER_IMAGE_MANIFEST_VERSION}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('No se pudo cargar el manifest de imagenes')
  const manifest = await response.json() as StickerImageManifest
  return new Set((manifest.accepted ?? []).map(item => item.code).filter(Boolean) as string[])
}

export function getStickerImageCodes() {
  imageCodePromise ??= loadStickerImageCodes()
  return imageCodePromise
}
