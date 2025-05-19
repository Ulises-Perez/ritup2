import { defineStore } from 'pinia'

interface ConfigState {
  isDarkMode: boolean
  useInvidious: boolean
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    isDarkMode: true,
    useInvidious: false,
  }),

  actions: {
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode
      // Guardar en localStorage
      localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light')
      // Aplicar clase al documento
      document.documentElement.classList.toggle('dark', this.isDarkMode)
    },

    toggleAPI() {
      this.useInvidious = !this.useInvidious
      // Guardar en localStorage
      localStorage.setItem('api', this.useInvidious ? 'invidious' : 'youtube')
    },

    initTheme() {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.isDarkMode = savedTheme === 'dark'
        document.documentElement.classList.toggle('dark', this.isDarkMode)
      }
    },

    initAPI() {
      const savedAPI = localStorage.getItem('api')
      if (savedAPI) {
        this.useInvidious = savedAPI === 'invidious'
      }
    },

    init() {
      this.initTheme()
      this.initAPI()
    },
  },

  getters: {
    currentTheme: (state) => (state.isDarkMode ? 'dark' : 'light'),
    currentAPI: (state) => (state.useInvidious ? 'invidious' : 'youtube'),
  },
})
