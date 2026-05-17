<script setup lang="ts">
// The Hadid brand lockup: a barbell-in-a-rack mark beside the wordmark.
// The mark is drawn in the brand's 1024 artboard coordinates; the viewBox
// crops to the artwork with an even margin. `fill: currentColor` lets the
// mark and word track the surrounding text color, so both themes work.
</script>

<template>
  <span class="brand">
    <svg class="brand__mark" viewBox="160 192 704 640" fill="currentColor" aria-hidden="true">
      <rect x="282" y="212" width="80" height="600" rx="2" />
      <rect x="252" y="782" width="140" height="30" rx="1" />
      <rect x="662" y="212" width="80" height="600" rx="2" />
      <rect x="632" y="782" width="140" height="30" rx="1" />
      <rect x="180" y="492" width="664" height="40" />
      <rect x="230" y="412" width="40" height="200" rx="2" />
      <rect x="180" y="432" width="35" height="160" rx="2" />
      <rect x="754" y="412" width="40" height="200" rx="2" />
      <rect x="809" y="432" width="35" height="160" rx="2" />
    </svg>
    <span class="brand__word">Hadid</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text);
}

.brand__mark {
  height: 36px;
  width: auto;
  flex-shrink: 0;
}

.brand__word {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
}
</style>
