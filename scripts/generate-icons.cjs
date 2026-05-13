const sharp = require('sharp')

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <circle cx="256" cy="168" r="78" fill="#fee2e2"/>
  <path d="M176 176h160v178c0 25-20 45-45 45h-70c-25 0-45-20-45-45V176Z" fill="#f8fafc"/>
  <path d="M203 226h106M203 272h106M203 318h76" stroke="#7f1d1d" stroke-width="26" stroke-linecap="round"/>
  <path d="M176 176h160v50H176z" fill="#b91c1c"/>
</svg>
`

Promise.all([
  sharp(Buffer.from(svg)).resize(192, 192).png().toFile('public/icon-192.png'),
  sharp(Buffer.from(svg)).resize(512, 512).png().toFile('public/icon-512.png'),
  sharp(Buffer.from(svg)).resize(512, 512).png().toFile('public/maskable-icon-512.png'),
  sharp(Buffer.from(svg)).resize(180, 180).png().toFile('public/apple-touch-icon.png'),
]).then(() => {
  console.log('PWA icons generated')
})
