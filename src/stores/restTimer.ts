import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { playRestEndCue } from '@/utils/audio-cue'

const ENDS_AT_KEY = 'hadid:rest_ends_at'

function readStoredEndsAt(): number | null {
  try {
    const stored = localStorage.getItem(ENDS_AT_KEY)
    if (stored === null) return null
    const value = Number(stored)
    return Number.isFinite(value) && value > Date.now() ? value : null
  } catch {
    return null
  }
}

function writeStoredEndsAt(value: number | null): void {
  try {
    if (value === null) localStorage.removeItem(ENDS_AT_KEY)
    else localStorage.setItem(ENDS_AT_KEY, String(value))
  } catch {
    /* localStorage unavailable — the timer still runs for the session */
  }
}

function maybeRequestPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission().catch(() => {})
  }
}

/**
 * Owns the single in-progress rest timer. The endsAt timestamp is persisted
 * to localStorage so a tab eviction or accidental reload restores the timer
 * with the correct remaining time — the bar never "ticks down" from a
 * cached number, it recomputes from the wall clock.
 */
export const useRestTimerStore = defineStore('rest_timer', () => {
  const endsAt = ref<number | null>(readStoredEndsAt())
  const now = ref(Date.now())
  let interval: number | undefined

  const remainingSeconds = computed(() => {
    if (endsAt.value === null) return 0
    return Math.max(0, Math.ceil((endsAt.value - now.value) / 1000))
  })

  const active = computed(() => remainingSeconds.value > 0)

  function tick(): void {
    now.value = Date.now()
    if (endsAt.value !== null && now.value >= endsAt.value) {
      endsAt.value = null
      writeStoredEndsAt(null)
      stopInterval()
      onTimerEnded()
    }
  }

  function startInterval(): void {
    if (interval !== undefined) return
    interval = window.setInterval(tick, 250)
  }

  function stopInterval(): void {
    if (interval !== undefined) {
      window.clearInterval(interval)
      interval = undefined
    }
  }

  function onTimerEnded(): void {
    playRestEndCue()
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate([180, 80, 180])
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Rest over', { body: 'Time for your next set.' })
      } catch (cause: unknown) {
        console.error('[hadid] notification failed', cause)
      }
    }
  }

  function start(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    maybeRequestPermission()
    const ends = Date.now() + Math.round(seconds) * 1000
    endsAt.value = ends
    now.value = Date.now()
    writeStoredEndsAt(ends)
    startInterval()
  }

  function skip(): void {
    endsAt.value = null
    writeStoredEndsAt(null)
    stopInterval()
  }

  function adjust(deltaSeconds: number): void {
    if (endsAt.value === null) return
    const next = Math.max(Date.now() + 1000, endsAt.value + deltaSeconds * 1000)
    endsAt.value = next
    writeStoredEndsAt(next)
    now.value = Date.now()
  }

  if (endsAt.value !== null) startInterval()

  return { active, remainingSeconds, endsAt, start, skip, adjust }
})
