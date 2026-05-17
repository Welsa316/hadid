<script setup lang="ts"></script>

<template>
  <span class="pr-badge">PR</span>
</template>

<style scoped>
.pr-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 2px var(--space-2);
  background-color: var(--color-accent);
  border-radius: var(--radius-full);
  color: var(--color-on-accent);
  font-size: var(--text-xs);
  font-weight: 800;
  letter-spacing: 0.05em;
}
</style>
