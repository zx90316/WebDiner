<script setup lang="ts">
defineProps<{
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
}>()

defineEmits<{
    click: []
}>()
</script>

<template>
    <button
        :type="type || 'button'"
        :disabled="loading || disabled"
        :class="['relative', loading || disabled ? 'opacity-50 cursor-not-allowed' : '']"
        @click="$emit('click')"
    >
        <span v-if="loading" class="absolute inset-0 flex items-center justify-center">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
        </span>
        <span :class="{ 'invisible': loading }">
            <slot />
        </span>
    </button>
</template>

