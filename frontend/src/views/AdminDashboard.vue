<script setup lang="ts">
import { ref } from 'vue'
import VendorManager from '@/components/admin/VendorManager.vue'
import VendorMenuEditor from '@/components/admin/VendorMenuEditor.vue'
import UserManagement from '@/components/admin/UserManagement.vue'
import DepartmentManager from '@/components/admin/DepartmentManager.vue'
import HolidayManager from '@/components/admin/HolidayManager.vue'
import StatsView from '@/components/admin/StatsView.vue'
import RemindersView from '@/components/admin/RemindersView.vue'
import UserOrderingSettings from '@/components/admin/UserOrderingSettings.vue'
import OrderAnnouncementView from '@/components/admin/OrderAnnouncementView.vue'

const activeTab = ref('vendors')

const tabs = [
    { id: 'vendors', name: '廠商管理', icon: '🏪' },
    { id: 'menu', name: '菜單設定', icon: '🍽️' },
    { id: 'departments', name: '部門管理', icon: '🏢' },
    { id: 'users', name: '用戶管理', icon: '👥' },
    { id: 'orders', name: '人員訂餐設定', icon: '📅' },
    { id: 'holidays', name: '節假日管理', icon: '🗓️' },
    { id: 'announcement', name: '訂餐公告', icon: '📋' },
    { id: 'stats', name: '統計資料', icon: '📊' },
    { id: 'reminders', name: '訂餐提醒', icon: '📧' },
]
</script>

<template>
    <div class="min-h-screen bg-gray-50 py-8">
        <div class="container mx-auto px-4">
            <h1 class="text-3xl font-bold mb-8">管理後台</h1>

            <div class="mb-6 bg-white rounded-lg shadow">
                <div class="flex border-b overflow-x-auto">
                    <button
                        v-for="tab in tabs"
                        :key="tab.id"
                        :class="[
                            'flex items-center gap-2 px-6 py-4 font-medium transition whitespace-nowrap',
                            activeTab === tab.id
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        ]"
                        @click="activeTab = tab.id"
                    >
                        <span>{{ tab.icon }}</span>
                        <span>{{ tab.name }}</span>
                    </button>
                </div>

                <div class="p-6">
                    <VendorManager v-if="activeTab === 'vendors'" />
                    <VendorMenuEditor v-else-if="activeTab === 'menu'" />
                    <DepartmentManager v-else-if="activeTab === 'departments'" />
                    <UserManagement v-else-if="activeTab === 'users'" />
                    <UserOrderingSettings v-else-if="activeTab === 'orders'" />
                    <HolidayManager v-else-if="activeTab === 'holidays'" />
                    <OrderAnnouncementView v-else-if="activeTab === 'announcement'" />
                    <StatsView v-else-if="activeTab === 'stats'" />
                    <RemindersView v-else-if="activeTab === 'reminders'" />
                </div>
            </div>
        </div>
    </div>
</template>

