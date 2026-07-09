import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(false)
  const activeSection = ref('forms')

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  function setActiveSection(section: string) {
    activeSection.value = section
    closeSidebar()
  }

  return { sidebarOpen, activeSection, toggleSidebar, closeSidebar, setActiveSection }
})
