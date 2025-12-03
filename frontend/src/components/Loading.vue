<script setup lang="ts">
defineProps<{
    fullScreen?: boolean
}>()
</script>

<template>
    <div :class="fullScreen
        ? 'fixed inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-50'
        : 'flex items-center justify-center p-8'">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
</template>

