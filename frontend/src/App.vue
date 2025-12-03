<script setup lang="ts">
import Navbar from '@/components/Navbar.vue'
import ToastContainer from '@/components/ToastContainer.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <router-view />
    <ToastContainer />
  </div>
</template>

