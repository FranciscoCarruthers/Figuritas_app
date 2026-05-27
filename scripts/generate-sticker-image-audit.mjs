import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import {
  buildStickerImageCatalog,
  parseStickerDataSource,
} from './sticker-image-mapping.mjs'

const ROOT = process.cwd()
const PUBLIC_STICKERS_DIR = path.join(ROOT, 'public', 'stickers')
const OUTPUT_HTML = path.join(ROOT, 'tmp', 'sticker-image-audit.html')
const OUTPUT_CSV = path.join(ROOT, 'tmp', 'sticker-image-audit.csv')
const OUTPUT_CORRECTIONS = path.join(ROOT, 'tmp', 'sticker-image-corrections-template.txt')

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function toWebPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function candidateIdFromPath(candidatePath) {
  const match = /candidate-(\d+)\.webp$/i.exec(candidatePath ?? '')
  return match ? Number(match[1]) : null
}

function teamLabel(sticker) {
  if (sticker.teamCode === 'FWC' || sticker.team === 'Introduction') return 'FWC'
  return `${sticker.teamCode} - ${sticker.team}`
}

function buildRows() {
  const source = fs.readFileSync(path.join(ROOT, 'src', 'data', 'sticker-data.ts'), 'utf8')
  const catalog = buildStickerImageCatalog(parseStickerDataSource(source))
  const manifest = readJsonIfExists(path.join(PUBLIC_STICKERS_DIR, '_manifest.json'), {
    accepted: [],
    missing: [],
  })
  const legacyMap = readJsonIfExists(path.join(ROOT, 'tmp', 'current-asset-candidate-map.json'), [])
  const manifestByCode = new Map((manifest.accepted ?? []).map(item => [item.code, item]))
  const legacyByCode = new Map((legacyMap ?? []).map(item => [item.code, item]))
  const publicFiles = new Set(
    fs.existsSync(PUBLIC_STICKERS_DIR)
      ? fs.readdirSync(PUBLIC_STICKERS_DIR)
        .filter(file => file.endsWith('.webp'))
        .map(file => path.basename(file, '.webp'))
      : [],
  )

  return catalog.stickers.map(sticker => {
    const manifestEntry = manifestByCode.get(sticker.code)
    const legacyEntry = legacyByCode.get(sticker.code)
    const hasPublicImage = publicFiles.has(sticker.code)
    const hasManifestImage = Boolean(manifestEntry)
    const status = !hasPublicImage
      ? 'missing'
      : hasManifestImage
        ? 'ok'
        : 'orphan'
    const candidateId = candidateIdFromPath(manifestEntry?.candidate)
    const legacyCandidateId = legacyEntry?.candidateId ?? null

    return {
      code: sticker.code,
      name: sticker.name,
      team: teamLabel(sticker),
      teamCode: sticker.teamCode,
      type: sticker.type,
      status,
      hasPublicImage,
      hasManifestImage,
      publicImage: hasPublicImage ? `../public/stickers/${sticker.code}.webp` : '',
      candidate: manifestEntry?.candidate ?? '',
      candidateImage: manifestEntry?.candidate
        ? toWebPath(path.relative(path.dirname(OUTPUT_HTML), path.join(ROOT, manifestEntry.candidate)))
        : '',
      candidateId,
      legacyCandidateId,
      page: manifestEntry?.page ?? legacyEntry?.page ?? '',
      reason: manifestEntry?.reason ?? '',
      score: manifestEntry?.score ?? '',
    }
  })
}

function renderHtml(rows) {
  const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})
  const generatedAt = new Date().toLocaleString('es-AR')
  const rowJson = JSON.stringify(rows)
    .replaceAll('<', '\\u003c')
    .replaceAll('&', '\\u0026')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Auditoria imagenes FiguritasApp</title>
  <style>
    :root {
      color-scheme: light;
      --red: #c90013;
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --soft: #f8fafc;
      --warn: #b45309;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--soft);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 3;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,0.94);
      backdrop-filter: blur(12px);
      padding: 18px;
    }
    h1 { margin: 0; font-size: 24px; letter-spacing: -0.02em; }
    .summary { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: white;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 800;
    }
    .pill.ok { color: #166534; }
    .pill.missing { color: var(--red); }
    .pill.orphan { color: var(--warn); }
    .tools {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) auto auto auto;
      gap: 10px;
      margin-top: 14px;
    }
    input, select, button {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: white;
      color: var(--ink);
      font: inherit;
      padding: 11px 12px;
    }
    button { cursor: pointer; font-weight: 800; }
    button.active { border-color: var(--red); background: var(--red); color: white; }
    main { padding: 18px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 14px;
    }
    .card {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: white;
      box-shadow: 0 8px 20px rgba(15,23,42,0.05);
    }
    .card.missing { border-color: rgba(201,0,19,0.35); }
    .card.orphan { border-color: rgba(180,83,9,0.45); }
    .image {
      display: grid;
      min-height: 230px;
      place-items: center;
      background: #eef2f7;
      padding: 10px;
    }
    .image img {
      display: block;
      max-width: 100%;
      max-height: 320px;
      border-radius: 8px;
      object-fit: contain;
    }
    .empty {
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      color: var(--muted);
      padding: 26px 12px;
      text-align: center;
      font-weight: 800;
    }
    .body { padding: 12px; }
    .code {
      color: var(--red);
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.12em;
    }
    .name { margin-top: 4px; font-size: 17px; font-weight: 900; line-height: 1.15; }
    .team { margin-top: 4px; color: var(--muted); font-size: 13px; font-weight: 700; }
    .meta {
      display: grid;
      gap: 4px;
      margin-top: 10px;
      color: #475569;
      font-size: 12px;
      line-height: 1.35;
    }
    .badge {
      display: inline-flex;
      width: fit-content;
      border-radius: 999px;
      padding: 4px 8px;
      background: #e2e8f0;
      color: #334155;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .badge.ok { background: #dcfce7; color: #166534; }
    .badge.missing { background: #fee2e2; color: #991b1b; }
    .badge.orphan { background: #fef3c7; color: #92400e; }
    .candidate-link {
      color: var(--red);
      font-weight: 800;
      text-decoration: none;
    }
    @media (max-width: 720px) {
      .tools { grid-template-columns: 1fr 1fr; }
      .tools input { grid-column: 1 / -1; }
      main, header { padding-inline: 12px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Auditoria local de imagenes</h1>
    <div class="summary">
      <span class="pill">Total: ${rows.length}</span>
      <span class="pill ok">OK: ${counts.ok ?? 0}</span>
      <span class="pill missing">Sin imagen: ${counts.missing ?? 0}</span>
      <span class="pill orphan">Asset huerfano: ${counts.orphan ?? 0}</span>
      <span class="pill">Generado: ${htmlEscape(generatedAt)}</span>
    </div>
    <div class="tools">
      <input id="search" type="search" placeholder="Buscar codigo, jugador, pais o candidato">
      <button type="button" class="active" data-filter="all">Todas</button>
      <button type="button" data-filter="missing">Sin imagen</button>
      <button type="button" data-filter="orphan">Huerfanas</button>
    </div>
  </header>
  <main>
    <div id="grid" class="grid"></div>
  </main>
  <script>
    const rows = ${rowJson};
    const grid = document.getElementById('grid');
    const search = document.getElementById('search');
    let activeFilter = 'all';

    function matches(row) {
      if (activeFilter !== 'all' && row.status !== activeFilter) return false;
      const query = search.value.trim().toLowerCase();
      if (!query) return true;
      return [
        row.code,
        row.name,
        row.team,
        row.type,
        row.status,
        row.candidateId,
        row.legacyCandidateId,
        row.page,
        row.reason,
      ].some(value => String(value ?? '').toLowerCase().includes(query));
    }

    function render() {
      const visible = rows.filter(matches);
      grid.innerHTML = visible.map(row => \`
        <article class="card \${row.status}">
          <div class="image">
            \${row.publicImage
              ? \`<img src="\${row.publicImage}" alt="\${row.code} \${row.name}" loading="lazy">\`
              : '<div class="empty">Sin imagen</div>'}
          </div>
          <div class="body">
            <span class="badge \${row.status}">\${row.status}</span>
            <div class="code">\${row.code}</div>
            <div class="name">\${row.name}</div>
            <div class="team">\${row.team}</div>
            <div class="meta">
              <span>Tipo: \${row.type}</span>
              <span>Manifest: \${row.hasManifestImage ? 'si' : 'no'}</span>
              <span>Candidato: \${row.candidateId ? '#' + row.candidateId : '-'}</span>
              <span>Legacy: \${row.legacyCandidateId ? '#' + row.legacyCandidateId : '-'}</span>
              <span>Pagina: \${row.page || '-'}</span>
              <span>Razon: \${row.reason || '-'}</span>
              \${row.candidateImage ? \`<a class="candidate-link" href="\${row.candidateImage}" target="_blank" rel="noreferrer">Abrir candidato origen</a>\` : ''}
            </div>
          </div>
        </article>
      \`).join('');
    }

    search.addEventListener('input', render);
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
        render();
      });
    });
    render();
  </script>
</body>
</html>`
}

function writeCsv(rows) {
  const header = [
    'code',
    'name',
    'team',
    'type',
    'status',
    'has_public_image',
    'has_manifest_image',
    'candidate_id',
    'legacy_candidate_id',
    'page',
    'reason',
    'score',
  ]
  const lines = [
    header.map(csvCell).join(','),
    ...rows.map(row => [
      row.code,
      row.name,
      row.team,
      row.type,
      row.status,
      row.hasPublicImage ? 'yes' : 'no',
      row.hasManifestImage ? 'yes' : 'no',
      row.candidateId ?? '',
      row.legacyCandidateId ?? '',
      row.page,
      row.reason,
      row.score,
    ].map(csvCell).join(',')),
  ]
  fs.writeFileSync(OUTPUT_CSV, `${lines.join('\n')}\n`)
}

function writeCorrectionsTemplate(rows) {
  const orphanRows = rows.filter(row => row.status === 'orphan')
  const missingRows = rows.filter(row => row.status === 'missing')
  const lines = [
    '# FiguritasApp - plantilla de correcciones de imagenes',
    '#',
    '# Como completarla:',
    '# CODIGO_ACTUAL=KEEP        si la imagen es correcta para ese mismo codigo y hay que aceptarla.',
    '# CODIGO_ACTUAL=CODIGO_REAL si la imagen pertenece a otra figurita.',
    '# CODIGO_ACTUAL=SKIP        si la imagen es duplicada, mala, o no sirve.',
    '#',
    '# Ejemplos:',
    '# ENG6=BRA13',
    '# BIH15=KEEP',
    '# RSA10=SKIP',
    '',
    '# Huerfanas: tienen archivo de imagen, pero no estan aceptadas por el manifest confiable.',
    '# Estas son las mas faciles de corregir mirando el HTML.',
  ]

  for (const row of orphanRows) {
    lines.push(`# ${row.code} | ${row.name} | ${row.team} | legacy #${row.legacyCandidateId ?? '-'} | pagina ${row.page || '-'}`)
    lines.push(`${row.code}=`)
  }

  lines.push('')
  lines.push('# Sin imagen: no tienen archivo publico asociado todavia.')
  lines.push('# Si en otro reporte/candidato ves una imagen que corresponde a una de estas, pasamelo como:')
  lines.push('# candidate_id=CODIGO_REAL')
  lines.push('# o decime el codigo de la figurita y el id visual que estas viendo.')

  for (const row of missingRows) {
    lines.push(`# ${row.code} | ${row.name} | ${row.team}`)
  }

  fs.writeFileSync(OUTPUT_CORRECTIONS, `${lines.join('\n')}\n`)
}

function main() {
  fs.mkdirSync(path.dirname(OUTPUT_HTML), { recursive: true })
  const rows = buildRows()
  fs.writeFileSync(OUTPUT_HTML, renderHtml(rows))
  writeCsv(rows)
  writeCorrectionsTemplate(rows)

  const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})

  console.log(`Sticker image audit generated:
  HTML: ${OUTPUT_HTML}
  CSV:  ${OUTPUT_CSV}
  Corrections: ${OUTPUT_CORRECTIONS}
  OK: ${counts.ok ?? 0}
  Missing: ${counts.missing ?? 0}
  Orphan: ${counts.orphan ?? 0}`)
}

main()
