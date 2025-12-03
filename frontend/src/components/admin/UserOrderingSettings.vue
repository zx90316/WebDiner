<script setup lang="ts">
import { ref } from 'vue'

const message = ref('人員訂餐設定功能開發中...')
</script>

<template>
    <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-6">人員訂餐設定</h2>
        <div class="text-center text-gray-500 py-12">
            <p class="text-4xl mb-4">🚧</p>
            <p>{{ message }}</p>
        </div>
    </div>
</template>

