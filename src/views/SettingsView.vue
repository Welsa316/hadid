<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import GymProfileEditor from '@/components/GymProfileEditor.vue'
import { CHANGELOG } from '@/data/changelog'
import { INJURIES } from '@/data/injuries'
import type { GymProfile, WeightUnit } from '@/db/schema'
import { useGymStore } from '@/stores/gym'
import { useSettingsStore } from '@/stores/settings'
import type { Theme } from '@/stores/settings'
import { useSyncStore } from '@/stores/sync'

const router = useRouter()
const settings = useSettingsStore()
const sync = useSyncStore()
const gym = useGymStore()

const currentVersion = CHANGELOG[0]?.version ?? ''

const editingProfile = ref<GymProfile | null>(null)

function openProfileEditor(profile: GymProfile): void {
  editingProfile.value = profile
}

function startNewProfile(): void {
  editingProfile.value = gym.newProfile('New gym')
}

async function saveProfile(profile: GymProfile): Promise<void> {
  await gym.save(profile)
  if (gym.activeId === null) await gym.setActive(profile.id)
  editingProfile.value = null
}

async function deleteProfile(): Promise<void> {
  if (editingProfile.value === null) return
  await gym.remove(editingProfile.value.id)
  editingProfile.value = null
}

const themeOptions: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
]

const unitOptions: ReadonlyArray<{ value: WeightUnit; label: string }> = [
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'kg', label: 'Kilograms (kg)' },
]

// Hide the install guidance once the app is already running installed.
const isStandalone = window.matchMedia('(display-mode: standalone)').matches

const linkCode = ref('')
const copied = ref(false)

const syncStatusText = computed(() => {
  switch (sync.status) {
    case 'syncing':
      return 'Syncing…'
    case 'error':
      return sync.error ?? 'Sync failed'
    case 'idle':
      return sync.lastSyncedAt === null
        ? 'Not synced yet'
        : `Last synced ${new Date(sync.lastSyncedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`
    default:
      return ''
  }
})

async function copyCode(): Promise<void> {
  try {
    await navigator.clipboard.writeText(sync.syncCode)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    /* clipboard unavailable in this context */
  }
}

async function linkDevice(): Promise<void> {
  const code = linkCode.value.trim()
  if (code.length < 8) return
  if (
    !window.confirm(
      'Link this device to that sync code? Your current data will be merged into it.',
    )
  ) {
    return
  }
  await sync.linkDevice(code)
  linkCode.value = ''
}
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">Settings</h1>
    </header>

    <div class="page__body">
      <section class="settings-section">
        <h2 class="settings-section__title">Appearance</h2>
        <div class="settings-segment" role="group" aria-label="Theme">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            class="settings-segment__option"
            :class="{ 'settings-segment__option--active': settings.theme === option.value }"
            :aria-pressed="settings.theme === option.value"
            @click="settings.setTheme(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="settings-section__title">Weight unit</h2>
        <div class="settings-segment" role="group" aria-label="Weight unit">
          <button
            v-for="option in unitOptions"
            :key="option.value"
            type="button"
            class="settings-segment__option"
            :class="{ 'settings-segment__option--active': settings.unit === option.value }"
            :aria-pressed="settings.unit === option.value"
            @click="settings.setUnit(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <p class="settings-note">
          New workouts use this unit. Past workouts keep the unit they were logged in.
        </p>
      </section>

      <section class="settings-section">
        <h2 class="settings-section__title">Rest timer</h2>
        <div class="settings-segment" role="group" aria-label="Auto-start rest timer">
          <button
            v-for="opt in [{ label: 'Auto-start on', value: true }, { label: 'Off', value: false }]"
            :key="String(opt.value)"
            type="button"
            class="settings-segment__option"
            :class="{ 'settings-segment__option--active': settings.restAutoStart === opt.value }"
            :aria-pressed="settings.restAutoStart === opt.value"
            @click="settings.setRestAutoStart(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <label class="settings-rest__field">
          <span class="settings-rest__label">Default rest (seconds)</span>
          <input
            type="number"
            inputmode="numeric"
            min="5"
            step="5"
            :value="settings.defaultRestSeconds"
            class="settings-rest__input"
            @change="(e) => settings.setDefaultRestSeconds(Number((e.target as HTMLInputElement).value))"
          />
        </label>
      </section>

      <section class="settings-section">
        <h2 class="settings-section__title">Injury mode</h2>
        <p class="settings-note">
          Toggle any current injuries. Exercises that may aggravate them will show a
          warning and substitute suggestions during a workout.
        </p>
        <div class="settings-injuries">
          <button
            v-for="injury in INJURIES"
            :key="injury.id"
            type="button"
            class="settings-injury"
            :class="{ 'settings-injury--active': settings.activeInjuries.includes(injury.id) }"
            :aria-pressed="settings.activeInjuries.includes(injury.id)"
            @click="settings.toggleInjury(injury.id)"
          >
            {{ injury.label }}
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="settings-section__title">Weekly volume target</h2>
        <label class="settings-rest__field">
          <span class="settings-rest__label">Sets per muscle per week</span>
          <input
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            :value="settings.weeklySetsTarget"
            class="settings-rest__input"
            @change="(e) => settings.setWeeklySetsTarget(Number((e.target as HTMLInputElement).value))"
          />
        </label>
        <p class="settings-note">Used by the body diagram to color muscle volume.</p>
      </section>

      <section class="settings-section">
        <h2 class="settings-section__title">Gym profile</h2>
        <p v-if="gym.all.length === 0" class="settings-note">Loading…</p>
        <div v-else class="settings-profiles">
          <div v-for="profile in gym.all" :key="profile.id" class="settings-profile">
            <button
              type="button"
              class="settings-profile__select"
              :class="{ 'settings-profile__select--active': profile.id === gym.activeId }"
              @click="gym.setActive(profile.id)"
            >
              <span class="settings-profile__name">{{ profile.name }}</span>
              <span class="settings-profile__meta">
                {{ profile.bar_weight }} {{ profile.unit }} bar · {{ profile.plates.length }} plate sizes
              </span>
            </button>
            <button
              type="button"
              class="settings-profile__edit"
              :aria-label="`Edit ${profile.name}`"
              @click="openProfileEditor(profile)"
            >Edit</button>
          </div>
        </div>
        <button type="button" class="settings-profile-new" @click="startNewProfile">
          + New profile
        </button>
      </section>

      <section v-if="sync.status !== 'disabled'" class="settings-section">
        <h2 class="settings-section__title">Sync</h2>
        <div class="settings-sync">
          <p class="settings-sync__status">
            <span
              class="settings-sync__dot"
              :class="`settings-sync__dot--${sync.status}`"
              aria-hidden="true"
            />
            {{ syncStatusText }}
          </p>

          <p class="settings-sync__label">Your sync code</p>
          <div class="settings-sync__code">
            <code class="settings-sync__value">{{ sync.syncCode }}</code>
            <button type="button" class="settings-sync__action" @click="copyCode">
              {{ copied ? 'Copied' : 'Copy' }}
            </button>
          </div>
          <p class="settings-note">
            Enter this code on another device to sync the same data. It is the only key
            to your data — keep it private.
          </p>

          <label class="settings-sync__label" for="sync-link-input">Link another device</label>
          <div class="settings-sync__code">
            <input
              id="sync-link-input"
              v-model="linkCode"
              type="text"
              class="settings-sync__input"
              placeholder="Paste a sync code"
            />
            <button
              type="button"
              class="settings-sync__action"
              :disabled="linkCode.trim().length < 8"
              @click="linkDevice"
            >
              Link
            </button>
          </div>

          <button
            type="button"
            class="settings-sync__now"
            :disabled="sync.status === 'syncing'"
            @click="sync.syncNow()"
          >
            Sync now
          </button>
        </div>
      </section>

      <section v-if="!isStandalone" class="settings-section">
        <h2 class="settings-section__title">Install</h2>
        <div class="settings-install">
          <p class="settings-install__lead">
            Add Hadid to your home screen to use it full-screen, like a native app. It works
            fully offline.
          </p>
          <p class="settings-install__step">
            <strong>iPhone:</strong> tap the Share button, then Add to Home Screen.
          </p>
          <p class="settings-install__step">
            <strong>Android:</strong> open the browser menu, then Install app.
          </p>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="settings-section__title">What's new</h2>
        <button
          type="button"
          class="settings-link"
          @click="router.push('/settings/changelog')"
        >
          <span>See updates and changes</span>
          <span class="settings-link__arrow" aria-hidden="true">→</span>
        </button>
      </section>

      <section class="settings-section">
        <h2 class="settings-section__title">About</h2>
        <div class="settings-about">
          <p class="settings-about__name">Hadid</p>
          <p class="settings-about__line">Version {{ currentVersion }}</p>
          <p class="settings-about__line">An offline-first workout tracker.</p>
        </div>
      </section>
    </div>

    <GymProfileEditor
      v-if="editingProfile !== null"
      :profile="editingProfile"
      :can-delete="gym.all.length > 1"
      @save="saveProfile"
      @delete="deleteProfile"
      @close="editingProfile = null"
    />
  </main>
</template>

<style scoped>
.settings-section {
  margin-bottom: var(--space-6);
}

.settings-section__title {
  margin-bottom: var(--space-3);
  font-size: var(--text-base);
  color: var(--color-text-dim);
}

.settings-segment {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.settings-segment__option {
  flex: 1;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.settings-segment__option--active {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.settings-segment__option:not(.settings-segment__option--active):active {
  background-color: var(--color-surface-raised);
}

.settings-note {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.settings-about {
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.settings-about__name {
  font-size: var(--text-xl);
  font-weight: 800;
}

.settings-about__line {
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}

.settings-install {
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.settings-install__lead {
  margin-bottom: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}

.settings-install__step {
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}

.settings-install__step strong {
  color: var(--color-text);
  font-weight: 700;
}

.settings-sync {
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.settings-sync__status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
}

.settings-sync__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-text-faint);
}

.settings-sync__dot--idle {
  background-color: var(--color-success);
}

.settings-sync__dot--syncing {
  background-color: var(--color-accent);
}

.settings-sync__dot--error {
  background-color: var(--color-danger);
}

.settings-sync__label {
  display: block;
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.settings-sync__code {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.settings-sync__value {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface-raised);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  word-break: break-all;
}

.settings-sync__input {
  flex: 1;
  min-width: 0;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
}

.settings-sync__action {
  flex-shrink: 0;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  font-size: var(--text-sm);
  font-weight: 600;
}

.settings-sync__action:not(:disabled):active {
  background-color: var(--color-border);
}

.settings-sync__action:disabled {
  color: var(--color-text-faint);
}

.settings-sync__now {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-top: var(--space-4);
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 600;
}

.settings-sync__now:not(:disabled):active {
  background-color: var(--color-surface-raised);
}

.settings-sync__now:disabled {
  color: var(--color-text-faint);
}

.settings-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-weight: 600;
  text-align: left;
}

.settings-link:active {
  background-color: var(--color-surface-raised);
}

.settings-link__arrow {
  flex-shrink: 0;
  color: var(--color-accent);
  font-size: var(--text-base);
}

.settings-profiles {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-profile {
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
}

.settings-profile__select {
  flex: 1;
  min-width: 0;
  padding: var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-align: left;
}

.settings-profile__select--active {
  border-color: var(--color-accent);
}

.settings-profile__name {
  display: block;
  font-weight: 700;
}

.settings-profile__meta {
  display: block;
  margin-top: 2px;
  color: var(--color-text-dim);
  font-size: var(--text-sm);
}

.settings-profile__edit {
  flex-shrink: 0;
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 600;
}

.settings-profile-new {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-top: var(--space-3);
  background-color: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 600;
}

.settings-rest__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.settings-rest__label {
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}

.settings-rest__input {
  width: 100px;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-align: center;
}

.settings-injuries {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.settings-injury {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
}

.settings-injury--active {
  background-color: var(--color-danger);
  border-color: var(--color-danger);
  color: #fff;
}
</style>
