export function clampVolumePercent(value: number) {
  if (!Number.isFinite(value)) return 0

  return Math.min(100, Math.max(0, Math.round(value)))
}

export const VOLUME_DRAG_RANGE = 180

export function getDraggedVolume(startPercent: number, dragPixels: number) {
  return clampVolumePercent(startPercent - (dragPixels / VOLUME_DRAG_RANGE) * 100)
}

const VOLUME_PAGE = 10

export function getSteppedVolume(percent: number, key: string): number | null {
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return clampVolumePercent(percent + 1)
    case 'ArrowDown':
    case 'ArrowLeft':
      return clampVolumePercent(percent - 1)
    case 'PageUp':
      return clampVolumePercent(percent + VOLUME_PAGE)
    case 'PageDown':
      return clampVolumePercent(percent - VOLUME_PAGE)
    case 'Home':
      return 0
    case 'End':
      return 100
    default:
      return null
  }
}
