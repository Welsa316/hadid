/** Date helpers. The app stores instants as epoch milliseconds and buckets
 *  workouts by *local* calendar day, so day math is always done in local time. */

/** Local calendar day of an epoch-millis instant, as `YYYY-MM-DD`. */
export function localDateOf(epochMs: number): string {
  const date = new Date(epochMs)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today's local calendar day, as `YYYY-MM-DD`. */
export function todayLocalDate(): string {
  return localDateOf(Date.now())
}

/** Formats an elapsed duration (seconds) as `M:SS` or `H:MM:SS`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`
}

/** Formats a workout's date as `Today`, `Yesterday`, or e.g. `Mon, May 12`. */
export function formatWorkoutDate(epochMs: number): string {
  const date = localDateOf(epochMs)
  if (date === todayLocalDate()) return 'Today'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === localDateOf(yesterday.getTime())) return 'Yesterday'

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  if (new Date(epochMs).getFullYear() !== new Date().getFullYear()) {
    options.year = 'numeric'
  }
  return new Date(epochMs).toLocaleDateString(undefined, options)
}

/** Compact elapsed duration for summaries: `45m` or `1h 20m`. */
export function formatDurationShort(totalSeconds: number): string {
  const minutes = Math.max(0, Math.round(totalSeconds / 60))
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
