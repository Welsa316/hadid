/**
 * Plays a short, friendly beep when the rest timer ends. WebAudio rather
 * than a bundled audio asset so the cue stays tiny and works offline by
 * construction — no fetch, no precache entry.
 */
export function playRestEndCue(): void {
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return
  try {
    const ctx = new window.AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    window.setTimeout(() => {
      void ctx.close()
    }, 600)
  } catch (cause: unknown) {
    console.error('[hadid] audio cue failed', cause)
  }
}
