<script setup lang="ts"></script>

<template>
  <main class="home">
    <div class="home__brand">
      <h1 class="home__wordmark">Hadid</h1>
      <p class="home__tagline">Train. Log. Progress.</p>
    </div>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: var(--space-6);
}

.home__brand {
  text-align: center;
}

.home__wordmark {
  margin: 0;
  font-size: var(--text-4xl);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--color-text);
}

.home__tagline {
  margin: var(--space-2) 0 0;
  font-size: var(--text-base);
  color: var(--color-text-dim);
}
</style>
