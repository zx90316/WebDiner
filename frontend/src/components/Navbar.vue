<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUIVersionStore } from '@/stores/uiVersion'
import TimeDisplay from './TimeDisplay.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiVersionStore = useUIVersionStore()
const isMobileMenuOpen = ref(false)

const handleLogout = () => {
    if (confirm('確定要登出嗎？')) {
        authStore.logout()
        router.push('/login')
    }
}

const isActive = (path: string) => route.path === path

const closeMobileMenu = () => {
    isMobileMenuOpen.value = false
}
</script>

<template>
    <!-- 未登入時顯示簡化的導航列 -->
    <nav v-if="!authStore.user" class="bg-white shadow-md">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-4 md:space-x-8">
                    <h1 class="text-xl font-bold text-blue-600">VSCC 伙食系統</h1>
                </div>
                <div class="flex items-center space-x-4">
                    <router-link
                        to="/login"
                        class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        登入
                    </router-link>
                </div>
            </div>
        </div>
    </nav>

    <!-- 已登入時顯示完整導航列 -->
    <nav v-else class="bg-white shadow-md">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-4 lg:space-x-8">
                    <h1 class="text-lg md:text-xl font-bold text-blue-600">VSCC 伙食系統</h1>
                    <!-- 桌面端導航連結 -->
                    <div class="hidden md:flex space-x-2 lg:space-x-4">
                        <router-link
                            to="/"
                            :class="[
                                'px-2 lg:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap',
                                isActive('/') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                            ]"
                        >
                            點餐
                        </router-link>
                        <router-link
                            to="/my-orders"
                            :class="[
                                'px-2 lg:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap',
                                isActive('/my-orders') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                            ]"
                        >
                            我的訂單
                        </router-link>
                        <router-link
                            to="/extension-directory"
                            :class="[
                                'px-2 lg:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap',
                                isActive('/extension-directory') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                            ]"
                        >
                            📞 分機表
                        </router-link>
                        <router-link
                            v-if="authStore.isAdmin"
                            to="/admin"
                            :class="[
                                'px-2 lg:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap',
                                isActive('/admin') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                            ]"
                        >
                            管理後台
                        </router-link>
                    </div>
                </div>
                <div class="flex items-center space-x-2 lg:space-x-4">
                    <!-- 時間顯示 - 桌面端 -->
                    <div class="hidden lg:block border-r pr-4 mr-2">
                        <TimeDisplay :is-sys-admin="authStore.isSysAdmin" />
                    </div>
                    <!-- UI 版本切換開關 - 桌面端 -->
                    <div class="hidden lg:flex items-center space-x-2 border-r pr-4 mr-2">
                        <span class="text-xs text-gray-500">介面:</span>
                        <button
                            :class="[
                                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                                uiVersionStore.uiVersion === 'legacy' ? 'bg-amber-500' : 'bg-blue-500'
                            ]"
                            :title="uiVersionStore.uiVersion === 'legacy' ? '切換到新版介面' : '切換到舊版介面'"
                            @click="uiVersionStore.toggleUIVersion()"
                        >
                            <span
                                :class="[
                                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                                    uiVersionStore.uiVersion === 'legacy' ? 'translate-x-6' : 'translate-x-1'
                                ]"
                            />
                        </button>
                        <span :class="[
                            'text-xs font-medium',
                            uiVersionStore.uiVersion === 'legacy' ? 'text-amber-600' : 'text-blue-600'
                        ]">
                            {{ uiVersionStore.uiVersion === 'legacy' ? '舊版' : '新版' }}
                        </span>
                    </div>
                    <!-- 用戶資訊 - 桌面端 -->
                    <span class="hidden md:inline text-sm text-gray-600">{{ authStore.user?.name }}</span>
                    <router-link
                        to="/change-password"
                        class="hidden md:inline text-sm text-blue-600 hover:text-blue-800"
                    >
                        修改密碼
                    </router-link>
                    <button
                        class="hidden md:inline text-sm text-red-600 hover:text-red-800"
                        @click="handleLogout"
                    >
                        登出
                    </button>
                    <!-- 移動端漢堡菜單按鈕 -->
                    <button
                        class="md:hidden p-2 rounded-md hover:bg-gray-100"
                        @click="isMobileMenuOpen = !isMobileMenuOpen"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path v-if="isMobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>
            <!-- 移動端菜單 -->
            <div v-if="isMobileMenuOpen" class="md:hidden pb-4 border-t">
                <!-- 導航連結 -->
                <div class="pt-2 space-y-1">
                    <router-link
                        to="/"
                        :class="[
                            'block px-3 py-2 rounded-md text-sm font-medium',
                            isActive('/') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                        ]"
                        @click="closeMobileMenu"
                    >
                        點餐
                    </router-link>
                    <router-link
                        to="/my-orders"
                        :class="[
                            'block px-3 py-2 rounded-md text-sm font-medium',
                            isActive('/my-orders') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                        ]"
                        @click="closeMobileMenu"
                    >
                        我的訂單
                    </router-link>
                    <router-link
                        to="/extension-directory"
                        :class="[
                            'block px-3 py-2 rounded-md text-sm font-medium',
                            isActive('/extension-directory') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                        ]"
                        @click="closeMobileMenu"
                    >
                        📞 分機表
                    </router-link>
                    <router-link
                        v-if="authStore.isAdmin"
                        to="/admin"
                        :class="[
                            'block px-3 py-2 rounded-md text-sm font-medium',
                            isActive('/admin') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                        ]"
                        @click="closeMobileMenu"
                    >
                        管理後台
                    </router-link>
                </div>
                <!-- 分隔線 -->
                <div class="border-t mt-2 pt-2">
                    <!-- 時間顯示 - 移動端 -->
                    <div class="px-3 py-2">
                        <TimeDisplay :is-sys-admin="authStore.isSysAdmin" />
                    </div>
                    <!-- UI 版本切換 - 移動端 -->
                    <div class="flex items-center justify-between px-3 py-2">
                        <span class="text-sm text-gray-600">介面版本</span>
                        <div class="flex items-center space-x-2">
                            <button
                                :class="[
                                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                                    uiVersionStore.uiVersion === 'legacy' ? 'bg-amber-500' : 'bg-blue-500'
                                ]"
                                @click="uiVersionStore.toggleUIVersion()"
                            >
                                <span
                                    :class="[
                                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                                        uiVersionStore.uiVersion === 'legacy' ? 'translate-x-6' : 'translate-x-1'
                                    ]"
                                />
                            </button>
                            <span :class="[
                                'text-xs font-medium',
                                uiVersionStore.uiVersion === 'legacy' ? 'text-amber-600' : 'text-blue-600'
                            ]">
                                {{ uiVersionStore.uiVersion === 'legacy' ? '舊版' : '新版' }}
                            </span>
                        </div>
                    </div>
                    <!-- 用戶資訊 -->
                    <div class="px-3 py-2 text-sm text-gray-600">
                        👤 {{ authStore.user?.name }}
                    </div>
                    <router-link
                        to="/change-password"
                        class="block px-3 py-2 text-sm text-blue-600 hover:bg-gray-100"
                        @click="closeMobileMenu"
                    >
                        修改密碼
                    </router-link>
                    <button
                        class="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                        @click="closeMobileMenu(); handleLogout()"
                    >
                        登出
                    </button>
                </div>
            </div>
        </div>
    </nav>
</template>

