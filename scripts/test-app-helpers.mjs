import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildImportPreview } from '../src/lib/import-preview.ts'
import { albumRowsToState } from '../src/lib/album-state.ts'
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
  getAnnouncementSeenCacheKey,
  readCachedAnnouncementSeen,
  writeCachedAnnouncementSeen,
} from '../src/lib/local-cache.ts'
import {
  getNextAlbumBlockLimit,
  getProgressiveAlbumBlocks,
  hasActiveAlbumViewFilters,
  INITIAL_ALBUM_BLOCK_LIMIT,
} from '../src/lib/album-rendering.ts'
import {
  buildTradeSuggestions,
  buildDuplicateResetChanges,
  getDuplicateCount,
  getNextDuplicateQuantity,
  isFormationSticker,
  validateTradeRules,
} from '../src/lib/trades.ts'
import { canCancelTradeProposal, getTradeStatusLabel } from '../src/lib/trade-display.ts'
import {
  buildStickerPushPayload,
  buildTradePushPayload,
  filterPushRecipients,
  getPushEnvConfig,
} from '../src/lib/push.ts'
import { notifyStickerUpdated } from '../src/lib/push-client.ts'
import { buildDuplicateStickersShareText } from '../src/lib/share-list.ts'

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
  { sticker_code: '00', quantity: 1, action: 'test marco 00 - Logo', created_at: '2026-05-18T12:00:00.000Z' },
  { sticker_code: 'FWC1', quantity: 1, action: 'test marco FWC1 - Emblem', created_at: '2026-05-18T12:10:00.000Z' },
  { sticker_code: 'ARG1', quantity: 1, action: 'test marco ARG1 - Team Logo', created_at: '2026-05-18T12:20:00.000Z' },
  { sticker_code: 'ARG2', quantity: 1, action: 'test marco ARG2 - Player', created_at: '2026-05-18T12:30:00.000Z' },
  { sticker_code: 'BRA1', quantity: 1, action: 'test marco BRA1 - Team Logo', created_at: '2026-05-18T12:40:00.000Z' },
  { sticker_code: 'BRA2', quantity: 1, action: 'test marco BRA2 - Player', created_at: '2026-05-18T12:50:00.000Z' },
  { sticker_code: 'BRA3', quantity: 1, action: 'test marco BRA3 - Player', created_at: '2026-05-18T13:00:00.000Z' },
  { sticker_code: 'ARG2', quantity: 2, action: 'test sumo repetida de ARG2 - Player', created_at: '2026-05-20T12:00:00.000Z' },
  { sticker_code: 'ARG3', quantity: 1, action: 'test marco ARG3 - Player', created_at: '2026-05-19T12:00:00.000Z' },
  { sticker_code: 'ARG3', quantity: 0, action: 'test desmarco ARG3 - Player', created_at: '2026-05-20T12:30:00.000Z' },
], new Date('2026-05-20T15:00:00.000Z'))

assert.equal(insights.progress.owned, 7)
assert.equal(insights.progress.missing, 1)
assert.equal(insights.foils.missing, 0)
assert.equal(insights.completedTeams, 1)
assert.equal(insights.completedSections, 1)
assert.equal(insights.closestTeams[0].code, 'ARG')
assert.equal(insights.groupProgress.find(group => group.label === 'Grupo A')?.percent, 83)
assert.equal(insights.weeklyActivity.total, 10)
assert.equal(insights.weeklyActivity.marked, 9)
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

assert.deepEqual(albumRowsToState(friendRows), {
  ARG1: friendRows[0],
  ARG2: friendRows[1],
  ARG3: friendRows[2],
})

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

assert.equal(getAnnouncementSeenCacheKey('user-1', 'push-notifications-v1').includes('user-1'), true)
assert.equal(readCachedAnnouncementSeen(storage, 'user-1', 'push-notifications-v1'), false)
writeCachedAnnouncementSeen(storage, 'user-1', 'push-notifications-v1')
assert.equal(readCachedAnnouncementSeen(storage, 'user-1', 'push-notifications-v1'), true)
assert.equal(readCachedAnnouncementSeen(storage, 'user-2', 'push-notifications-v1'), false)

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

const duplicateState = {
  ARG1: { sticker_code: 'ARG1', quantity: 3, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  ARG2: { sticker_code: 'ARG2', quantity: 0, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  ARG3: { sticker_code: 'ARG3', quantity: 0, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  BRA1: { sticker_code: 'BRA1', quantity: 2, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
}
const friendDuplicateState = {
  ARG1: { sticker_code: 'ARG1', quantity: 0, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  ARG2: { sticker_code: 'ARG2', quantity: 2, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
  BRA1: { sticker_code: 'BRA1', quantity: 1, updated_by: null, updated_at: '2026-05-18T10:00:00.000Z' },
}

assert.equal(getDuplicateCount(duplicateState, 'ARG1'), 2)
assert.equal(getDuplicateCount(duplicateState, 'ARG2'), 0)
assert.equal(getDuplicateCount(duplicateState, 'ARG3'), 0)
assert.deepEqual(buildDuplicateResetChanges(duplicateState), [
  { code: 'ARG1', quantity: 1 },
  { code: 'BRA1', quantity: 1 },
])
const duplicateShareText = buildDuplicateStickersShareText(duplicateState)
assert.ok(duplicateShareText.startsWith('FiguritasApp - Lista\nUSA Mex Can 26\nRepetidas\n'))
assert.match(duplicateShareText, /^ARG .+: 1 x2$/m)
assert.match(duplicateShareText, /^BRA .+: 1$/m)
assert.ok(duplicateShareText.endsWith('Descarga la app\nhttps://figuritasappcarru.vercel.app'))
assert.equal(getNextDuplicateQuantity(0, 1), 2)
assert.equal(getNextDuplicateQuantity(1, 1), 2)
assert.equal(getNextDuplicateQuantity(3, -1), 2)
assert.equal(getNextDuplicateQuantity(1, -1), 1)
assert.equal(isFormationSticker({ code: 'ARG13', name: 'Team Photo', team: 'Argentina', teamCode: 'ARG', type: 'photo', isFoil: false, position: 13 }), true)
assert.equal(isFormationSticker({ code: 'FWC13', name: 'History', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 13 }), false)

const suggestions = buildTradeSuggestions(duplicateState, friendDuplicateState, stickers)
assert.deepEqual(suggestions.mineUseful.map(item => [item.sticker.code, item.available]), [['ARG1', 2]])
assert.deepEqual(suggestions.friendUseful.map(item => [item.sticker.code, item.available]), [['ARG2', 1]])
assert.deepEqual(
  validateTradeRules(
    [{ sticker: stickers.find(sticker => sticker.code === 'ARG1'), quantity: 1 }],
    [{ sticker: stickers.find(sticker => sticker.code === 'ARG2'), quantity: 1 }],
    { sameQuantity: true, sameFoils: true, sameFormations: false },
  ),
  { valid: false, messages: ['La cantidad de brillantes tiene que coincidir.'] },
)
assert.deepEqual(
  validateTradeRules(
    [{ sticker: stickers.find(sticker => sticker.code === 'ARG2'), quantity: 1 }],
    [{ sticker: stickers.find(sticker => sticker.code === 'BRA2'), quantity: 1 }],
    { sameQuantity: true, sameFoils: false, sameFormations: false },
  ),
  { valid: true, messages: [] },
)

assert.equal(getTradeStatusLabel({ status: 'accepted', direction: 'incoming', my_applied: false, friend_applied: false }), 'Listo para anotar')
assert.equal(getTradeStatusLabel({ status: 'accepted', direction: 'outgoing', my_applied: true, friend_applied: false }), 'Esperando que el otro lo anote')
assert.equal(getTradeStatusLabel({ status: 'completed', direction: 'outgoing', my_applied: true, friend_applied: true }), 'Completado')
assert.equal(canCancelTradeProposal({ status: 'pending', direction: 'outgoing', my_applied: false, friend_applied: false }), true)
assert.equal(canCancelTradeProposal({ status: 'pending', direction: 'incoming', my_applied: false, friend_applied: false }), false)
assert.equal(canCancelTradeProposal({ status: 'accepted', direction: 'incoming', my_applied: false, friend_applied: false }), true)
assert.equal(canCancelTradeProposal({ status: 'accepted', direction: 'outgoing', my_applied: false, friend_applied: false }), true)
assert.equal(canCancelTradeProposal({ status: 'accepted', direction: 'incoming', my_applied: true, friend_applied: false }), false)
assert.equal(canCancelTradeProposal({ status: 'completed', direction: 'outgoing', my_applied: true, friend_applied: true }), false)

assert.deepEqual(
  buildStickerPushPayload({
    code: 'ARG10',
    name: 'Lionel Messi',
    quantity: 1,
    actorName: 'Carru',
  }),
  {
    title: 'Figurita anotada',
    body: 'Carru marcó ARG10 - Lionel Messi',
    url: '/actividad',
    tag: 'sticker-ARG10',
  },
)
assert.deepEqual(
  buildStickerPushPayload({
    code: 'PAR19',
    name: 'Jugador',
    quantity: 0,
    actorName: '',
  }),
  {
    title: 'Figurita anotada',
    body: 'Se desmarcó PAR19 - Jugador',
    url: '/actividad',
    tag: 'sticker-PAR19',
  },
)

const originalFetch = globalThis.fetch
const stickerPushCalls = []
globalThis.fetch = async (url, init) => {
  stickerPushCalls.push({ url, init })
  return {
    ok: true,
    json: async () => ({ ok: true }),
  }
}
await notifyStickerUpdated({ access_token: 'session-token' }, { code: 'ARG10', quantity: 1 })
assert.equal(stickerPushCalls.length, 1)
assert.equal(stickerPushCalls[0].url, '/api/push/events/sticker-updated')
assert.equal(stickerPushCalls[0].init.headers.Authorization, 'Bearer session-token')
assert.equal(JSON.parse(stickerPushCalls[0].init.body).code, 'ARG10')
globalThis.fetch = originalFetch

assert.deepEqual(
  buildTradePushPayload({
    action: 'created',
    actorName: 'Carru',
    friendUsername: 'nico',
  }),
  {
    title: 'Intercambio',
    body: 'Carru te propuso un intercambio',
    url: '/amigos',
    tag: 'trade-nico-created',
  },
)
assert.deepEqual(
  buildTradePushPayload({
    action: 'accepted',
    actorName: '',
    friendUsername: 'nico',
  }).body,
  'Intercambio aceptado',
)
assert.deepEqual(
  filterPushRecipients([
    { device_id: 'a', endpoint: 'one', enabled: true },
    { device_id: 'b', endpoint: 'two', enabled: true },
    { device_id: 'c', endpoint: 'three', enabled: false },
  ], 'a').map(item => item.endpoint),
  ['two'],
)
assert.deepEqual(getPushEnvConfig({}), { configured: false })
assert.deepEqual(getPushEnvConfig({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'public',
  VAPID_PRIVATE_KEY: 'private',
  VAPID_SUBJECT: 'https://figuritasappcarru.vercel.app',
}), {
  configured: true,
  publicKey: 'public',
  privateKey: 'private',
  subject: 'https://figuritasappcarru.vercel.app',
})

const schema = fs.readFileSync('supabase/schema.sql', 'utf8')
const cancelAcceptedTradesPatch = fs.readFileSync('supabase/cancel-accepted-trades.sql', 'utf8')
for (const expectedSql of [
  'create table if not exists friendships',
  'create table if not exists push_subscriptions',
  'create table if not exists user_announcements',
  'user announcements can be read by owner',
  'user announcements can be inserted by owner',
  'create table if not exists trade_proposals',
  'create table if not exists trade_items',
  'send_friend_request',
  'respond_friend_request',
  'remove_friend',
  'get_friend_summaries',
  'get_friend_album',
  'create_trade_proposal',
  'respond_trade_proposal',
  'apply_trade_proposal',
  'cancel_trade_proposal',
  'requester_applied_at is null',
  'addressee_applied_at is null',
  'get_trade_proposals',
]) {
  assert.ok(schema.includes(expectedSql), `schema should include ${expectedSql}`)
}
assert.ok(cancelAcceptedTradesPatch.includes('requester_applied_at is null'), 'cancel accepted trades patch should block already applied trades')
assert.ok(cancelAcceptedTradesPatch.includes('grant execute on function cancel_trade_proposal(uuid) to authenticated'), 'cancel accepted trades patch should grant rpc access')

console.log('App helpers validated.')
