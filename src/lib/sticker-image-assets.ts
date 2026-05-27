type StickerImageManifest = {
  accepted?: Array<{ code?: string }>
}

let imageCodePromise: Promise<Set<string>> | null = null

async function loadStickerImageCodes() {
  const response = await fetch('/stickers/_manifest.json', { cache: 'force-cache' })
  if (!response.ok) throw new Error('No se pudo cargar el manifest de imagenes')
  const manifest = await response.json() as StickerImageManifest
  return new Set((manifest.accepted ?? []).map(item => item.code).filter(Boolean) as string[])
}

export function getStickerImageCodes() {
  imageCodePromise ??= loadStickerImageCodes()
  return imageCodePromise
}
