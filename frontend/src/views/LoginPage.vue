<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const employeeId = ref('')
const password = ref('')
const error = ref('')

const handleSubmit = async () => {
    try {
        error.value = ''
        await authStore.login(employeeId.value, password.value)
        router.push('/')
    } catch (err: any) {
        error.value = err.message || '登入失敗'
    }
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <div class="bg-white p-8 rounded shadow-md w-full max-w-md">
            <h2 class="text-2xl font-bold mb-6 text-center">VSCC 伙食系統 登入</h2>
            <div v-if="error" class="bg-red-100 text-red-700 p-3 rounded mb-4">{{ error }}</div>
            <form @submit.prevent="handleSubmit">
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">工號</label>
                    <input
                        v-model="employeeId"
                        type="text"
                        class="w-full p-2 border rounded"
                        required
                    />
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 mb-2">密碼</label>
                    <input
                        v-model="password"
                        type="password"
                        class="w-full p-2 border rounded"
                        required
                    />
                </div>
                <button
                    type="submit"
                    class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                    登入
                </button>
            </form>
        </div>
    </div>
</template>

