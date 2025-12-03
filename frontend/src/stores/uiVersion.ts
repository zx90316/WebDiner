import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type UIVersion = 'new' | 'legacy'

const UI_VERSION_KEY = 'vscc_ui_version'

export const useUIVersionStore = defineStore('uiVersion', () => {
    // 從 localStorage 讀取用戶上次選擇的版本，預設為新版
    const saved = localStorage.getItem(UI_VERSION_KEY)
    const uiVersion = ref<UIVersion>((saved === 'legacy' ? 'legacy' : 'new') as UIVersion)

    // 當版本改變時，儲存到 localStorage
    watch(uiVersion, (newVersion) => {
        localStorage.setItem(UI_VERSION_KEY, newVersion)
    })

    const toggleUIVersion = () => {
        uiVersion.value = uiVersion.value === 'new' ? 'legacy' : 'new'
    }

    const setUIVersion = (version: UIVersion) => {
        uiVersion.value = version
    }

    return {
        uiVersion,
        toggleUIVersion,
        setUIVersion
    }
})

