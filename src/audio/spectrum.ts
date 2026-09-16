export type BandBins = readonly [start: number, end: number]

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`)
  }
}

export function getBandBins(
  bandCount: number,
  binCount: number,
  sampleRate: number,
  lowHz: number,
  highHz: number,
): readonly BandBins[] {
  assertPositiveInteger(bandCount, 'bandCount')
  assertPositiveInteger(binCount, 'binCount')
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError('sampleRate must be finite and greater than zero')
  }
  if (!(lowHz > 0) || !(highHz > lowHz)) {
    throw new RangeError('lowHz must be above zero and below highHz')
  }

  const perBin = sampleRate / 2 / binCount
  const growth = highHz / lowHz
  const bands: BandBins[] = []
  let start = Math.min(binCount - 1, Math.max(0, Math.floor(lowHz / perBin)))

  for (let index = 0; index < bandCount; index += 1) {
    const edge = lowHz * growth ** ((index + 1) / bandCount)
    const end = Math.min(binCount, Math.max(start + 1, Math.round(edge / perBin)))

    bands.push([start, end])
    start = Math.min(binCount - 1, end)
  }

  return bands
}

export function getBandLevels(spectrum: Uint8Array, bands: readonly BandBins[]): number[] {
  return bands.map(([start, end]) => {
    let loudest = 0
    for (let bin = start; bin < end; bin += 1) {
      const value = spectrum[bin] ?? 0
      if (value > loudest) loudest = value
    }

    return loudest / 255
  })
}

export function chaseLevel(
  previous: number,
  target: number,
  riseRate: number,
  fallRate: number,
  delta: number,
) {
  const rate = target > previous ? riseRate : fallRate
  if (!(rate > 0) || !(delta > 0)) return target

  return previous + (target - previous) * (1 - Math.exp(-rate * delta))
}

export function getLitRows(level: number, rows: number) {
  if (!Number.isFinite(level)) return 0

  return Math.round(Math.min(1, Math.max(0, level)) * rows)
}

export function getPeakRow(
  previousPeak: number,
  litRows: number,
  fallPerSecond: number,
  delta: number,
) {
  const sunk = previousPeak - fallPerSecond * Math.max(0, delta)

  return Math.max(litRows, sunk, 0)
}
