import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { registerServiceWorker } from './pwa/registerSW'
import './assets/styles/main.css'
import 'katex/dist/katex.min.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')

registerServiceWorker()
