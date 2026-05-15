function orderQuadrilateralPoints(points) {
  if (points.length !== 4) throw new Error(`Expected 4 points, got ${points.length}`)
  const bySum = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y))
  const byDiff = [...points].sort((a, b) => (a.x - a.y) - (b.x - b.y))
  return [bySum[0], byDiff[3], bySum[3], byDiff[0]]
}

function pointInQuad([topLeft, topRight, bottomRight, bottomLeft], xRatio, yRatio) {
  const top = {
    x: topLeft.x + (topRight.x - topLeft.x) * xRatio,
    y: topLeft.y + (topRight.y - topLeft.y) * xRatio,
  }
  const bottom = {
    x: bottomLeft.x + (bottomRight.x - bottomLeft.x) * xRatio,
    y: bottomLeft.y + (bottomRight.y - bottomLeft.y) * xRatio,
  }
  return {
    x: top.x + (bottom.x - top.x) * yRatio,
    y: top.y + (bottom.y - top.y) * yRatio,
  }
}

function getCodeBoxPoints(points, roi = { x: 0.56, y: 0.045, width: 0.40, height: 0.125 }) {
  return [
    pointInQuad(points, roi.x, roi.y),
    pointInQuad(points, roi.x + roi.width, roi.y),
    pointInQuad(points, roi.x + roi.width, roi.y + roi.height),
    pointInQuad(points, roi.x, roi.y + roi.height),
  ]
}

function getStableScanCode(history) {
  const counts = new Map()
  for (const reading of history) {
    if (!reading.code) continue
    counts.set(reading.code, (counts.get(reading.code) ?? 0) + 1)
  }
  for (const [code, count] of counts) {
    if (count >= 2) return code
  }
  const latest = history[history.length - 1]
  if (latest?.code && latest.confidence >= 88) return latest.code
  return null
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const ordered = orderQuadrilateralPoints([
  { x: 210, y: 620 },
  { x: 190, y: 120 },
  { x: 520, y: 105 },
  { x: 550, y: 640 },
])

assert(ordered[0].x === 190 && ordered[0].y === 120, 'top-left point should be first')
assert(ordered[1].x === 520 && ordered[1].y === 105, 'top-right point should be second')
assert(ordered[2].x === 550 && ordered[2].y === 640, 'bottom-right point should be third')
assert(ordered[3].x === 210 && ordered[3].y === 620, 'bottom-left point should be fourth')

const codeBox = getCodeBoxPoints(ordered)
assert(codeBox[0].x > ordered[0].x && codeBox[0].y >= ordered[1].y, 'code ROI should be inside upper card area')
assert(codeBox[1].x > codeBox[0].x, 'code ROI should extend to the right')
assert(codeBox[2].y > codeBox[1].y, 'code ROI should extend downward')

assert(getStableScanCode([
  { code: 'COL16', confidence: 42, text: 'COL 16' },
  { code: null, confidence: 0, text: '' },
  { code: 'COL16', confidence: 38, text: 'COL I6' },
]) === 'COL16', '2 of 3 readings should stabilize')

assert(getStableScanCode([
  { code: 'COL16', confidence: 42, text: 'COL 16' },
  { code: 'GHA19', confidence: 44, text: 'GHA 19' },
  { code: null, confidence: 0, text: '' },
]) === null, 'unstable readings should not stabilize')

assert(getStableScanCode([
  { code: 'PAN19', confidence: 91, text: 'PAN 19' },
]) === 'PAN19', 'high-confidence single reading should stabilize')

console.log('Scan helpers validated.')
