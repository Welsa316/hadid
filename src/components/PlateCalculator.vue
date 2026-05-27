<script setup lang="ts">
import { computed, ref } from 'vue'

import ModalSheet from './ModalSheet.vue'
import { useGymStore } from '@/stores/gym'
import { calculatePlates } from '@/utils/plate-calculator'

const props = defineProps<{ exerciseId: string; initialWeight: number }>()
const emit = defineEmits<{ close: [] }>()

const gym = useGymStore()
const target = ref<number>(props.initialWeight)
const machineDraft = ref<number>(gym.active?.machine_weights[props.exerciseId] ?? 0)

const unit = computed(() => gym.active?.unit ?? 'lb')

const result = computed(() => {
  if (gym.active === null) return null
  return calculatePlates(
    Number(target.value) || 0,
    gym.active.bar_weight,
    gym.active.plates,
    Number(machineDraft.value) || 0,
  )
})

const perSideSummary = computed(() => {
  if (result.value === null) return ''
  if (result.value.perSidePlates.length === 0) return 'Just the bar'
  return result.value.perSidePlates.map((p) => `${p.weight} × ${p.count}`).join(', ')
})

async function saveMachine(): Promise<void> {
  if (gym.active === null) return
  await gym.setMachineWeight(props.exerciseId, Number(machineDraft.value) || 0)
}
</script>

<template>
  <ModalSheet title="Plates" @close="emit('close')">
    <label class="pc-field">
      <span class="pc-field__label">Target ({{ unit }})</span>
      <input
        v-model.number="target"
        type="number"
        inputmode="decimal"
        min="0"
        step="0.5"
        class="pc-input"
      />
    </label>

    <label class="pc-field">
      <span class="pc-field__label">Machine carriage ({{ unit }})</span>
      <input
        v-model.number="machineDraft"
        type="number"
        inputmode="decimal"
        min="0"
        step="0.5"
        class="pc-input"
        @change="saveMachine"
      />
    </label>
    <p class="pc-note">Leave at 0 for a regular barbell exercise.</p>

    <div v-if="gym.active === null" class="pc-empty">No gym profile configured.</div>
    <div v-else-if="result === null" class="pc-empty">
      Target is below the bar ({{ gym.active.bar_weight }} {{ unit }}<span v-if="Number(machineDraft) > 0"> + {{ machineDraft }} machine</span>).
    </div>
    <template v-else>
      <p class="pc-summary">
        <span class="pc-summary__label">Loaded</span>
        <strong>{{ result.achievedWeight }} {{ unit }}</strong>
        <span v-if="!result.isExact" class="pc-summary__note">closest to {{ target }}</span>
      </p>

      <div class="pc-rack" aria-label="Plate arrangement">
        <div class="pc-rack__side pc-rack__side--left">
          <template v-for="(plate, i) in result.perSidePlates" :key="`l-${i}`">
            <span
              v-for="n in plate.count"
              :key="`l-${i}-${n}`"
              class="pc-plate"
              :style="{ height: `${24 + plate.weight * 1.2}px` }"
            >{{ plate.weight }}</span>
          </template>
        </div>
        <div class="pc-rack__bar"></div>
        <div class="pc-rack__side">
          <template v-for="(plate, i) in result.perSidePlates" :key="`r-${i}`">
            <span
              v-for="n in plate.count"
              :key="`r-${i}-${n}`"
              class="pc-plate"
              :style="{ height: `${24 + plate.weight * 1.2}px` }"
            >{{ plate.weight }}</span>
          </template>
        </div>
      </div>

      <p class="pc-perside">Per side: {{ perSideSummary }}</p>
    </template>
  </ModalSheet>
</template>

<style scoped>
.pc-field {
  display: block;
  margin-bottom: var(--space-3);
}

.pc-field__label {
  display: block;
  margin-bottom: var(--space-1);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
}

.pc-input {
  width: 100%;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: max(1rem, 16px);
  text-align: center;
}

.pc-note {
  margin-top: calc(-1 * var(--space-2));
  margin-bottom: var(--space-4);
  color: var(--color-text-faint);
  font-size: var(--text-xs);
}

.pc-empty {
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-dim);
  text-align: center;
}

.pc-summary {
  margin-bottom: var(--space-3);
  font-size: var(--text-lg);
}

.pc-summary__label {
  margin-right: var(--space-2);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
}

.pc-summary__note {
  margin-left: var(--space-2);
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}

.pc-rack {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.pc-rack__bar {
  flex: 0 0 60px;
  height: 6px;
  background-color: var(--color-text-faint);
  border-radius: var(--radius-full);
}

.pc-rack__side {
  display: flex;
  align-items: center;
  gap: 2px;
}

.pc-rack__side--left {
  flex-direction: row-reverse;
}

.pc-plate {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 0 4px;
  background-color: var(--color-accent);
  border-radius: var(--radius-sm);
  color: var(--color-on-accent);
  font-size: var(--text-xs);
  font-weight: 700;
}

.pc-perside {
  margin-top: var(--space-3);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  text-align: center;
}
</style>
