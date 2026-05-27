import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { WeightUnit } from '@/db/schema'

export type Theme = 'dark' | 'light'

const THEME_STORAGE_KEY = 'hadid:theme'
const UNIT_STORAGE_KEY = 'hadid:unit'
const REST_AUTO_START_KEY = 'hadid:rest_auto_start'
const REST_DURATION_KEY = 'hadid:rest_duration'
const WEEKLY_TARGET_KEY = 'hadid:weekly_sets_target'
const THEME_COLORS: Record<Theme, string> = { dark: '#0f0f10', light: '#f6f6f7' }

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* localStorage unavailable — use the default theme */
  }
  return 'dark'
}

function readStoredUnit(): WeightUnit {
  try {
    const stored = localStorage.getItem(UNIT_STORAGE_KEY)
    if (stored === 'lb' || stored === 'kg') return stored
  } catch {
    /* localStorage unavailable — use the default unit */
  }
  return 'lb'
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key)
    if (stored === '1' || stored === 'true') return true
    if (stored === '0' || stored === 'false') return false
  } catch {
    /* localStorage unavailable */
  }
  return fallback
}

function readStoredPositiveInt(key: string, fallback: number): number {
  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      const value = Number(stored)
      if (Number.isFinite(value) && value > 0) return Math.floor(value)
    }
  } catch {
    /* localStorage unavailable */
  }
  return fallback
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta !== null) meta.setAttribute('content', THEME_COLORS[theme])
}

/**
 * Device-local UI and entry preferences. Kept in localStorage (not IndexedDB)
 * so the theme can be read synchronously before first paint, and so each
 * device keeps its own preferences rather than syncing.
 */
export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<Theme>(readStoredTheme())
  const unit = ref<WeightUnit>(readStoredUnit())
  const restAutoStart = ref<boolean>(readStoredBoolean(REST_AUTO_START_KEY, true))
  const defaultRestSeconds = ref<number>(readStoredPositiveInt(REST_DURATION_KEY, 90))
  const weeklySetsTarget = ref<number>(readStoredPositiveInt(WEEKLY_TARGET_KEY, 12))
  applyTheme(theme.value)

  function setTheme(next: Theme): void {
    theme.value = next
    applyTheme(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* localStorage unavailable — the change applies for this session only */
    }
  }

  function setUnit(next: WeightUnit): void {
    unit.value = next
    try {
      localStorage.setItem(UNIT_STORAGE_KEY, next)
    } catch {
      /* localStorage unavailable — the change applies for this session only */
    }
  }

  function setRestAutoStart(next: boolean): void {
    restAutoStart.value = next
    try {
      localStorage.setItem(REST_AUTO_START_KEY, next ? '1' : '0')
    } catch {
      /* localStorage unavailable */
    }
  }

  function setDefaultRestSeconds(next: number): void {
    if (!Number.isFinite(next) || next <= 0) return
    defaultRestSeconds.value = Math.floor(next)
    try {
      localStorage.setItem(REST_DURATION_KEY, String(defaultRestSeconds.value))
    } catch {
      /* localStorage unavailable */
    }
  }

  function setWeeklySetsTarget(next: number): void {
    if (!Number.isFinite(next) || next <= 0) return
    weeklySetsTarget.value = Math.floor(next)
    try {
      localStorage.setItem(WEEKLY_TARGET_KEY, String(weeklySetsTarget.value))
    } catch {
      /* localStorage unavailable */
    }
  }

  return {
    theme,
    unit,
    restAutoStart,
    defaultRestSeconds,
    weeklySetsTarget,
    setTheme,
    setUnit,
    setRestAutoStart,
    setDefaultRestSeconds,
    setWeeklySetsTarget,
  }
})
