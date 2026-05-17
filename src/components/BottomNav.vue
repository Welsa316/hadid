<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

/** A tab is active on its own route and any nested route (e.g. /history/:id). */
function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <nav class="bottom-nav" aria-label="Primary">
    <div class="bottom-nav__inner">
      <RouterLink
        to="/"
        class="nav-tab"
        :class="{ 'nav-tab--active': isActive('/') }"
        :aria-current="isActive('/') ? 'page' : undefined"
      >
        <svg class="nav-tab__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-5h4v5" />
        </svg>
        <span class="nav-tab__label">Home</span>
      </RouterLink>

      <RouterLink
        to="/calendar"
        class="nav-tab"
        :class="{ 'nav-tab--active': isActive('/calendar') }"
        :aria-current="isActive('/calendar') ? 'page' : undefined"
      >
        <svg class="nav-tab__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 9.5h16M8.5 3v4M15.5 3v4"
          />
        </svg>
        <span class="nav-tab__label">Calendar</span>
      </RouterLink>

      <RouterLink
        to="/history"
        class="nav-tab"
        :class="{ 'nav-tab--active': isActive('/history') }"
        :aria-current="isActive('/history') ? 'page' : undefined"
      >
        <svg class="nav-tab__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
        <span class="nav-tab__label">History</span>
      </RouterLink>

      <RouterLink
        to="/routines"
        class="nav-tab"
        :class="{ 'nav-tab--active': isActive('/routines') }"
        :aria-current="isActive('/routines') ? 'page' : undefined"
      >
        <svg class="nav-tab__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
        </svg>
        <span class="nav-tab__label">Routines</span>
      </RouterLink>

      <RouterLink
        to="/settings"
        class="nav-tab"
        :class="{ 'nav-tab--active': isActive('/settings') }"
        :aria-current="isActive('/settings') ? 'page' : undefined"
      >
        <svg class="nav-tab__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 8h3.4M11.6 8h9.4M3 16h9.4M17.6 16h3.4" />
          <circle cx="9" cy="8" r="2.6" />
          <circle cx="15" cy="16" r="2.6" />
        </svg>
        <span class="nav-tab__label">Settings</span>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-bottom-nav);
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding-bottom: var(--safe-bottom);
}

.bottom-nav__inner {
  display: flex;
  width: 100%;
  max-width: var(--app-max-width);
  height: var(--bottom-nav-height);
  margin-inline: auto;
}

.nav-tab {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--color-text-faint);
  transition: color var(--transition-fast);
}

.nav-tab--active {
  color: var(--color-accent);
}

.nav-tab:active {
  background-color: var(--color-surface-raised);
}

.nav-tab__icon {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-tab__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
</style>
