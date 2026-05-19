import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  buildStickerImageCatalog,
  classifyStickerImageText,
  parseStickerDataSource,
} from './sticker-image-mapping.mjs'

const source = fs.readFileSync('src/data/sticker-data.ts', 'utf8')
const catalog = buildStickerImageCatalog(parseStickerDataSource(source))

function expectCode(text, code) {
  const match = classifyStickerImageText(text, catalog)
  assert.equal(match?.sticker.code, code, `${text} should map to ${code}`)
}

expectCode('FIFA WORLD CUP 2026 QUALIFIERS WE ARE ARGENTINA', 'ARG13')
expectCode('FIFA WORLD CUP 2026 BRASIL CBF', 'BRA1')
expectCode('JAMAL MUSIALA 26-2-2003 FC BAYERN MUNCHEN', 'GER15')
expectCode('OFFICIAL EMBLEM FIFA WORLD CUP 2026', 'FWC1')

const brazilFormation = classifyStickerImageText('FIFA WORLD CUP 2026 QUALIFIERS WE ARE BRAZIL', catalog)
assert.equal(brazilFormation?.sticker.code, 'BRA13')
assert.notEqual(brazilFormation?.sticker.code, 'ENG6')

console.log('Image mapping helpers validated.')
