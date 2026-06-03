import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

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
expectCode('COCA COLA LAMINE YAMAL', 'CC1')
expectCode('COCA COLA LAUTARO MARTINEZ', 'CC14')

const manifest = JSON.parse(fs.readFileSync('public/stickers/_manifest.json', 'utf8'))
const acceptedCodes = new Set(manifest.accepted.map((item) => item.code))

for (let number = 1; number <= 14; number += 1) {
  const code = `CC${number}`
  assert.ok(fs.existsSync(path.join('public', 'stickers', `${code}.webp`)), `${code} should have an image asset`)
  assert.ok(acceptedCodes.has(code), `${code} should be accepted in the image manifest`)
}

const brazilFormation = classifyStickerImageText('FIFA WORLD CUP 2026 QUALIFIERS WE ARE BRAZIL', catalog)
assert.equal(brazilFormation?.sticker.code, 'BRA13')
assert.notEqual(brazilFormation?.sticker.code, 'ENG6')

console.log('Image mapping helpers validated.')
