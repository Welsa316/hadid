<script setup lang="ts">
import { useRouter } from 'vue-router'

import ChangelogList from '@/components/ChangelogList.vue'
import ModalSheet from '@/components/ModalSheet.vue'
import type { ChangelogEntry } from '@/data/changelog'

defineProps<{ entries: ChangelogEntry[] }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()

function viewAll(): void {
  emit('close')
  void router.push('/settings/changelog')
}
</script>

<template>
  <ModalSheet title="What's new" @close="emit('close')">
    <ChangelogList :entries="entries" />
    <button type="button" class="changelog-modal__all" @click="viewAll">
      See all updates →
    </button>
  </ModalSheet>
</template>

<style scoped>
.changelog-modal__all {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-top: var(--space-3);
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 600;
}

.changelog-modal__all:active {
  background-color: var(--color-surface);
}
</style>
