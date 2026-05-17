import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { router } from './router'
import { initDB } from './db/schema'

import './styles/tokens.css'
import './styles/globals.css'

async function bootstrap(): Promise<void> {
  // Open IndexedDB before mounting so a storage failure surfaces immediately
  // rather than silently breaking data writes once the user is logging.
  await initDB()

  createApp(App).use(createPinia()).use(router).mount('#app')
}

bootstrap().catch((error: unknown) => {
  console.error('[hadid] startup failed', error)
  const root = document.getElementById('app')
  if (root !== null) {
    root.textContent = 'Hadid could not start. Please reload the page.'
  }
})
