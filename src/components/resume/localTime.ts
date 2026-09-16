export function formatLocalTime(at: Date, timeZone: string): string {
  if (Number.isNaN(at.getTime())) return '--:--'

  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(at)
  } catch {
    return '--:--'
  }
}
