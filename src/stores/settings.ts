import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { WeightUnit } from '@/db/schema'

export type Theme = 'dark' | 'light'

const THEME_STORAGE_KEY = 'hadid:theme'
const UNIT_STORAGE_KEY = 'hadid:unit'
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

  return { theme, unit, setTheme, setUnit }
})
