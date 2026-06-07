import './assets/main.css'
import 'vue-sonner/style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Esperar a que el router resuelva la ruta inicial antes de montar.
// Así App.vue ya conoce route.name en el primer render y no monta el layout
// completo (Library/Nav/Player) durante /callback, evitando el bucle de redirección.
router.isReady().then(() => {
  app.mount('#app')
})
