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
