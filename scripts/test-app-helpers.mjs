import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildImportPreview } from '../src/lib/import-preview.ts'
import {
  buildSelfFriendSummary,
  buildFriendAlbumState,
  formatFriendLastUpdate,
  sortFriendRanking,
} from '../src/lib/friends.ts'
import { buildAlbumBlocks } from '../src/lib/sticker-blocks.ts'
import { buildAlbumInsights } from '../src/lib/stats-insights.ts'
import {
  getAlbumCacheKey,
  getProfileCacheKey,
  readCachedAlbum,
  readCachedProfile,
  writeCachedAlbum,
  writeCachedProfile,
  clearCachedAlbum,
  clearCachedProfile,
} from '../src/lib/local-cache.ts'
import {
  getNextAlbumBlockLimit,
  getProgressiveAlbumBlocks,
  hasActiveAlbumViewFilters,
  INITIAL_ALBUM_BLOCK_LIMIT,
} from '../src/lib/album-rendering.ts'

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

const friendRows = [
  { sticker_code: 'ARG1', quantity: 1, updated_at: '2026-05-18T10:00:00.000Z' },
  { sticker_code: 'ARG2', quantity: 0, updated_at: '2026-05-18T10:00:00.000Z' },
  { sticker_code: 'ARG3', quantity: 2, updated_at: '2026-05-18T10:00:00.000Z' },
]
const friendState = buildFriendAlbumState(friendRows)
assert.equal(friendState.ARG1.quantity, 1)
assert.equal(friendState.ARG3.quantity, 2)
assert.equal(friendState.ARG2, undefined)

assert.equal(formatFriendLastUpdate('2026-05-20T14:59:40.000Z', new Date('2026-05-20T15:00:00.000Z')), 'ahora')
assert.equal(formatFriendLastUpdate('2026-05-20T14:30:00.000Z', new Date('2026-05-20T15:00:00.000Z')), 'hace 30 min')
assert.equal(formatFriendLastUpdate('2026-05-20T10:00:00.000Z', new Date('2026-05-20T15:00:00.000Z')), 'hace 5 h')
assert.equal(formatFriendLastUpdate('2026-05-18T10:00:00.000Z', new Date('2026-05-20T15:00:00.000Z')), 'hace 2 d')

assert.deepEqual(
  sortFriendRanking([
    buildSelfFriendSummary('test', state, { total: 8, owned: 7, missing: 1, percent: 88 }),
    { username: 'nico', status: 'accepted', missing_count: 25, percent: 97 },
    { username: 'carru', status: 'accepted', missing_count: 10, percent: 99 },
    { username: 'pendiente', status: 'pending', missing_count: 0, percent: 0 },
    { username: 'agus', status: 'accepted', missing_count: 10, percent: 98 },
  ].filter(Boolean)).map(friend => friend.username),
  ['test', 'carru', 'agus', 'nico'],
)

assert.equal(buildSelfFriendSummary(null, state, { total: 8, owned: 7, missing: 1, percent: 88 }), null)
assert.equal(
  buildSelfFriendSummary('test', state, { total: 8, owned: 7, missing: 1, percent: 88 })?.last_updated_at,
  '2026-05-18T10:00:00.000Z',
)

const blocks = buildAlbumBlocks(groups, teamCode => stickers.filter(sticker => sticker.teamCode === teamCode))
assert.deepEqual(
  blocks.map(block => block.id),
  ['fwc-specials', 'fwc-ball-countries', 'ARG', 'BRA', 'fwc-history'],
)
assert.deepEqual(blocks.at(-1)?.stickers.map(sticker => sticker.code), [])

class MemoryStorage {
  data = new Map()
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null
  }
  setItem(key, value) {
    this.data.set(key, String(value))
  }
  removeItem(key) {
    this.data.delete(key)
  }
}

const storage = new MemoryStorage()
const profile = { user_id: 'user-1', username: 'test', album_id: 'album-1' }
writeCachedProfile(storage, 'user-1', profile, '2026-05-20T15:00:00.000Z')
assert.deepEqual(readCachedProfile(storage, 'user-1'), {
  profile,
  savedAt: '2026-05-20T15:00:00.000Z',
})
assert.equal(readCachedProfile(storage, 'user-2'), null)
storage.setItem(getProfileCacheKey('user-1'), JSON.stringify({ version: 0, userId: 'user-1', profile, savedAt: 'x' }))
assert.equal(readCachedProfile(storage, 'user-1'), null)
storage.setItem(getProfileCacheKey('user-1'), '{bad json')
assert.equal(readCachedProfile(storage, 'user-1'), null)
writeCachedProfile(storage, 'user-1', profile, '2026-05-20T15:00:00.000Z')
clearCachedProfile(storage, 'user-1')
assert.equal(readCachedProfile(storage, 'user-1'), null)

writeCachedAlbum(storage, 'album-1', state, '2026-05-20T15:01:00.000Z')
assert.deepEqual(readCachedAlbum(storage, 'album-1'), {
  albumState: state,
  savedAt: '2026-05-20T15:01:00.000Z',
})
assert.equal(readCachedAlbum(storage, 'album-2'), null)
storage.setItem(getAlbumCacheKey('album-1'), JSON.stringify({ version: 0, albumId: 'album-1', albumState: state, savedAt: 'x' }))
assert.equal(readCachedAlbum(storage, 'album-1'), null)
storage.setItem(getAlbumCacheKey('album-1'), '{bad json')
assert.equal(readCachedAlbum(storage, 'album-1'), null)
writeCachedAlbum(storage, 'album-1', state, '2026-05-20T15:01:00.000Z')
clearCachedAlbum(storage, 'album-1')
assert.equal(readCachedAlbum(storage, 'album-1'), null)

assert.equal(INITIAL_ALBUM_BLOCK_LIMIT, 8)
assert.equal(hasActiveAlbumViewFilters({
  query: '',
  filter: 'all',
  sectionFilter: 'Todas',
  collapseCompleted: false,
  foilsMissingOnly: false,
}), false)
assert.equal(hasActiveAlbumViewFilters({
  query: 'arg',
  filter: 'all',
  sectionFilter: 'Todas',
  collapseCompleted: false,
  foilsMissingOnly: false,
}), true)
assert.deepEqual(
  getProgressiveAlbumBlocks(blocks, { hasActiveFilters: false, limit: 2 }).map(block => block.id),
  ['fwc-specials', 'fwc-ball-countries'],
)
assert.deepEqual(
  getProgressiveAlbumBlocks(blocks, { hasActiveFilters: true, limit: 2 }).map(block => block.id),
  ['fwc-specials', 'fwc-ball-countries', 'ARG', 'BRA', 'fwc-history'],
)
assert.equal(getNextAlbumBlockLimit(8, 18), 16)
assert.equal(getNextAlbumBlockLimit(16, 18), 18)

const schema = fs.readFileSync('supabase/schema.sql', 'utf8')
for (const expectedSql of [
  'create table if not exists friendships',
  'send_friend_request',
  'respond_friend_request',
  'remove_friend',
  'get_friend_summaries',
  'get_friend_album',
]) {
  assert.ok(schema.includes(expectedSql), `schema should include ${expectedSql}`)
}

console.log('App helpers validated.')
