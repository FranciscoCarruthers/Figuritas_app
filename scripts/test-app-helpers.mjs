import assert from 'node:assert/strict'
import { buildImportPreview } from '../src/lib/import-preview.ts'
import { buildAlbumInsights } from '../src/lib/stats-insights.ts'

const stickers = [
  { code: '00', name: 'Logo', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 0 },
  { code: 'FWC1', name: 'Emblem', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 1 },
  { code: 'ARG1', name: 'Team Logo', team: 'Argentina', teamCode: 'ARG', type: 'logo', isFoil: true, position: 1 },
  { code: 'ARG2', name: 'Player', team: 'Argentina', teamCode: 'ARG', type: 'player', isFoil: false, position: 2 },
  { code: 'ARG3', name: 'Player', team: 'Argentina', teamCode: 'ARG', type: 'player', isFoil: false, position: 3 },
  { code: 'BRA1', name: 'Team Logo', team: 'Brazil', teamCode: 'BRA', type: 'logo', isFoil: true, position: 1 },
  { code: 'BRA2', name: 'Player', team: 'Brazil', teamCode: 'BRA', type: 'player', isFoil: false, position: 2 },
  { code: 'BRA3', name: 'Player', team: 'Brazil', teamCode: 'BRA', type: 'player', isFoil: false, position: 3 },
]

const groups = [
  { label: 'Introducción', teams: [{ code: 'FWC', name: 'Introducción' }] },
  { label: 'Grupo A', teams: [{ code: 'ARG', name: 'Argentina' }, { code: 'BRA', name: 'Brazil' }] },
]

const state = {
  '00': { sticker_code: '00', quantity: 1, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  FWC1: { sticker_code: 'FWC1', quantity: 1, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  ARG1: { sticker_code: 'ARG1', quantity: 1, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  ARG2: { sticker_code: 'ARG2', quantity: 1, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  BRA1: { sticker_code: 'BRA1', quantity: 1, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  BRA2: { sticker_code: 'BRA2', quantity: 1, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  BRA3: { sticker_code: 'BRA3', quantity: 1, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
}

const preview = buildImportPreview(stickers, state, new Set(['BRA2']))
assert.deepEqual(preview, {
  total: 8,
  ownedAfter: 7,
  missingAfter: 1,
  unchanged: 6,
  changesToOwned: 1,
  changesToMissing: 1,
  totalChanges: 2,
})

const insights = buildAlbumInsights(stickers, groups, state, [
  { quantity: 1, created_at: '2026-05-18T12:00:00.000Z' },
  { quantity: 1, created_at: '2026-05-18T13:00:00.000Z' },
  { quantity: 1, created_at: '2026-05-16T12:00:00.000Z' },
  { quantity: 1, created_at: '2026-05-15T12:00:00.000Z' },
  { quantity: 0, created_at: '2026-05-17T12:00:00.000Z' },
], new Date('2026-05-20T15:00:00.000Z'))

assert.equal(insights.progress.owned, 7)
assert.equal(insights.progress.missing, 1)
assert.equal(insights.foils.missing, 0)
assert.equal(insights.completedTeams, 1)
assert.equal(insights.completedSections, 1)
assert.equal(insights.closestTeams[0].code, 'ARG')
assert.equal(insights.groupProgress.find(group => group.label === 'Grupo A')?.percent, 83)
assert.equal(insights.weeklyActivity.total, 5)
assert.equal(insights.weeklyActivity.marked, 4)
assert.equal(insights.weeklyActivity.unmarked, 1)
assert.equal(insights.dailyMarked.length, 7)
assert.deepEqual(
  insights.dailyMarked.map(day => [day.key, day.marked]),
  [
    ['2026-05-14', 0],
    ['2026-05-15', 0],
    ['2026-05-16', 0],
    ['2026-05-17', 0],
    ['2026-05-18', 7],
    ['2026-05-19', 0],
    ['2026-05-20', 0],
  ],
)
assert.ok(insights.recommendations.some(item => item.kind === 'almost-team' && item.code === 'ARG'))

console.log('App helpers validated.')
