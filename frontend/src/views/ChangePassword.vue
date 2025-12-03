<script setup lang="ts">
import { ref, reactive } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import LoadingButton from '@/components/LoadingButton.vue'

const authStore = useAuthStore()
const toastStore = useToastStore()
const submitting = ref(false)

const formData = reactive({
    old_password: '',
    new_password: '',
    confirm_password: ''
})

const handleSubmit = async () => {
    if (formData.new_password !== formData.confirm_password) {
        toastStore.showToast('新密碼與確認密碼不符', 'error')
        return
    }

    if (formData.new_password.length < 6) {
        toastStore.showToast('新密碼長度至少需 6 碼', 'error')
        return
    }

    try {
        submitting.value = true
        await api.post('/auth/change-password', {
            old_password: formData.old_password,
            new_password: formData.new_password,
        }, authStore.token!)

        toastStore.showToast('密碼修改成功', 'success')
        formData.old_password = ''
        formData.new_password = ''
        formData.confirm_password = ''
    } catch (error: any) {
        toastStore.showToast(error.message || '密碼修改失敗', 'error')
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <div class="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-6 text-center">修改密碼</h2>
        <form @submit.prevent="handleSubmit">
            <div class="mb-4">
                <label class="block text-gray-700 mb-2 font-medium">舊密碼</label>
                <input
                    v-model="formData.old_password"
                    type="password"
                    class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                />
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 mb-2 font-medium">新密碼</label>
                <input
                    v-model="formData.new_password"
                    type="password"
                    class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                />
            </div>
            <div class="mb-6">
                <label class="block text-gray-700 mb-2 font-medium">確認新密碼</label>
                <input
                    v-model="formData.confirm_password"
                    type="password"
                    class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                />
            </div>
            <LoadingButton
                type="submit"
                :loading="submitting"
                class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
                確認修改
            </LoadingButton>
        </form>
    </div>
</template>

