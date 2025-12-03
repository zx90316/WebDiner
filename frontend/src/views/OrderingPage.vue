<script setup lang="ts">
import { useUIVersionStore } from '@/stores/uiVersion'
import CalendarOrdering from './CalendarOrdering.vue'
import LegacyCalendarOrdering from './LegacyCalendarOrdering.vue'

const uiVersionStore = useUIVersionStore()
</script>

<template>
    <LegacyCalendarOrdering v-if="uiVersionStore.uiVersion === 'legacy'" />
    <CalendarOrdering v-else />
</template>

