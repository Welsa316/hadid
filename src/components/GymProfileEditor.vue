<script setup lang="ts">
import { ref } from 'vue'

import ModalSheet from './ModalSheet.vue'
import type { GymProfile, PlateStack, WeightUnit } from '@/db/schema'
import { BAR_PRESETS, DEFAULT_PLATES } from '@/utils/plate-calculator'

const props = defineProps<{ profile: GymProfile; canDelete: boolean }>()
const emit = defineEmits<{ save: [GymProfile]; close: []; delete: [] }>()

const name = ref(props.profile.name)
const unit = ref<WeightUnit>(props.profile.unit)
const barWeight = ref<number>(props.profile.bar_weight)
const plates = ref<PlateStack[]>(props.profile.plates.map((p) => ({ ...p })))

function switchUnit(next: WeightUnit): void {
  if (next === unit.value) return
  unit.value = next
  const preset = BAR_PRESETS[next][0]
  if (preset !== undefined) barWeight.value = preset.weight
  plates.value = DEFAULT_PLATES[next].map((p) => ({ ...p }))
}

function addPlate(): void {
  plates.value.push({ weight: 0, count: 2 })
}

function removePlate(index: number): void {
  plates.value.splice(index, 1)
}

function commit(): void {
  emit('save', {
    ...props.profile,
    name: name.value.trim().length > 0 ? name.value.trim() : 'My gym',
    unit: unit.value,
    bar_weight: Number(barWeight.value) || 0,
    plates: plates.value
      .filter((p) => Number(p.weight) > 0 && Number(p.count) > 0)
      .map((p) => ({ weight: Number(p.weight), count: Number(p.count) })),
  })
}

function confirmDelete(): void {
  if (window.confirm(`Delete the "${props.profile.name}" profile?`)) emit('delete')
}
</script>

<template>
  <ModalSheet title="Gym profile" @close="emit('close')">
    <template #action>
      <button type="button" class="gp-save" @click="commit">Save</button>
    </template>

    <label class="gp-field">
      <span class="gp-field__label">Name</span>
      <input v-model="name" class="gp-input" placeholder="e.g. Home gym" />
    </label>

    <p class="gp-field__label">Unit</p>
    <div class="gp-segment" role="group" aria-label="Unit">
      <button
        v-for="u in (['lb', 'kg'] as const)"
        :key="u"
        type="button"
        class="gp-segment__option"
        :class="{ 'gp-segment__option--active': unit === u }"
        @click="switchUnit(u)"
      >
        {{ u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)' }}
      </button>
    </div>

    <p class="gp-field__label">Bar weight ({{ unit }})</p>
    <div class="gp-segment gp-segment--wrap">
      <button
        v-for="bar in BAR_PRESETS[unit]"
        :key="bar.weight"
        type="button"
        class="gp-segment__option"
        :class="{ 'gp-segment__option--active': barWeight === bar.weight }"
        @click="barWeight = bar.weight"
      >
        {{ bar.label }}
      </button>
    </div>
    <input v-model.number="barWeight" type="number" inputmode="decimal" min="0" step="0.5" class="gp-input" />

    <p class="gp-field__label">Plates you own ({{ unit }})</p>
    <p class="gp-note">
      Count is how many of each plate you have <strong>total</strong> across both sides.
    </p>
    <div v-for="(plate, idx) in plates" :key="idx" class="gp-row">
      <input
        v-model.number="plate.weight"
        type="number"
        inputmode="decimal"
        min="0"
        step="0.5"
        class="gp-row__input"
        :aria-label="`Plate ${idx + 1} weight`"
      />
      <span class="gp-row__times">×</span>
      <input
        v-model.number="plate.count"
        type="number"
        inputmode="numeric"
        min="0"
        step="2"
        class="gp-row__input"
        :aria-label="`Plate ${idx + 1} count`"
      />
      <button
        type="button"
        class="gp-row__remove"
        aria-label="Remove plate"
        @click="removePlate(idx)"
      >×</button>
    </div>
    <button type="button" class="gp-add" @click="addPlate">+ Add plate</button>

    <button v-if="canDelete" type="button" class="gp-delete" @click="confirmDelete">
      Delete profile
    </button>
  </ModalSheet>
</template>

<style scoped>
.gp-save {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  color: var(--color-accent);
  font-size: var(--text-base);
  font-weight: 700;
}

.gp-field {
  display: block;
}

.gp-field__label {
  display: block;
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
}

.gp-input,
.gp-row__input {
  width: 100%;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: max(1rem, 16px);
}

.gp-segment {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  margin-bottom: var(--space-2);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.gp-segment--wrap {
  flex-wrap: wrap;
}

.gp-segment__option {
  flex: 1 1 0;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
}

.gp-segment__option--active {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.gp-note {
  margin-bottom: var(--space-2);
  color: var(--color-text-faint);
  font-size: var(--text-xs);
}

.gp-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.gp-row__input {
  flex: 1;
  text-align: center;
}

.gp-row__times {
  color: var(--color-text-dim);
}

.gp-row__remove {
  flex-shrink: 0;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  border-radius: var(--radius-full);
  color: var(--color-text-faint);
  font-size: var(--text-lg);
}

.gp-row__remove:active {
  background-color: var(--color-surface);
}

.gp-add {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-top: var(--space-2);
  background-color: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 600;
}

.gp-delete {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-top: var(--space-5);
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  font-weight: 600;
}
</style>
