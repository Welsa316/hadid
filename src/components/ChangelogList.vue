<script setup lang="ts">
import type { ChangelogEntry } from '@/data/changelog'

defineProps<{ entries: ChangelogEntry[] }>()

const SECTION_LABELS = { new: 'New', improved: 'Improved', fixed: 'Fixed' } as const
type Section = keyof typeof SECTION_LABELS

/** Returns the non-empty change sections for a release, in display order. */
function sectionsFor(changes: ChangelogEntry['changes']): Array<{ kind: Section; items: string[] }> {
  const result: Array<{ kind: Section; items: string[] }> = []
  for (const kind of ['new', 'improved', 'fixed'] as const) {
    const items = changes[kind]
    if (items !== undefined && items.length > 0) result.push({ kind, items })
  }
  return result
}

function formattedDate(iso: string): string {
  // Parse as local-midnight so the printed month never drifts a day across UTC.
  const date = new Date(`${iso}T00:00:00`)
  return date.toLocaleDateString([], { month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="changelog">
    <article v-for="entry in entries" :key="entry.version" class="changelog__entry">
      <header class="changelog__header">
        <h3 class="changelog__version">v{{ entry.version }}</h3>
        <span class="changelog__date">{{ formattedDate(entry.date) }}</span>
      </header>
      <section
        v-for="section in sectionsFor(entry.changes)"
        :key="section.kind"
        class="changelog__section"
      >
        <h4 class="changelog__section-title">{{ SECTION_LABELS[section.kind] }}</h4>
        <ul class="changelog__list">
          <li v-for="item in section.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </article>
  </div>
</template>

<style scoped>
.changelog__entry {
  margin-bottom: var(--space-4);
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.changelog__entry:last-child {
  margin-bottom: 0;
}

.changelog__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.changelog__version {
  font-size: var(--text-lg);
  font-weight: 800;
}

.changelog__date {
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}

.changelog__section {
  margin-top: var(--space-3);
}

.changelog__section-title {
  margin-bottom: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.changelog__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: var(--space-4);
  color: var(--color-text);
  font-size: var(--text-sm);
  line-height: 1.45;
}
</style>
