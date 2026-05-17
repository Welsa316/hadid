import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'dark' | 'light'

const THEME_STORAGE_KEY = 'hadid:theme'
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

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta !== null) meta.setAttribute('content', THEME_COLORS[theme])
}

/**
 * Device-local UI preferences. The theme is kept in localStorage (not
 * IndexedDB) so it can be read synchronously before first paint and stays
 * per-device rather than syncing.
 */
export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<Theme>(readStoredTheme())
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

  return { theme, setTheme }
})
