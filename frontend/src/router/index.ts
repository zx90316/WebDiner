import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/LoginPage.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/',
            name: 'home',
            component: () => import('@/views/OrderingPage.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/my-orders',
            name: 'my-orders',
            component: () => import('@/views/MyOrders.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/extension-directory',
            name: 'extension-directory',
            component: () => import('@/views/ExtensionDirectory.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/admin',
            name: 'admin',
            component: () => import('@/views/AdminDashboard.vue'),
            meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
            path: '/change-password',
            name: 'change-password',
            component: () => import('@/views/ChangePassword.vue'),
            meta: { requiresAuth: true }
        }
    ]
})

// Navigation guard
router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()
    
    // Wait for auth to be initialized
    if (authStore.isLoading) {
        const unwatch = authStore.$subscribe((_, state) => {
            if (!state.isLoading) {
                unwatch()
                checkAuth()
            }
        })
    } else {
        checkAuth()
    }

    function checkAuth() {
        if (to.meta.requiresAuth && !authStore.token) {
            next({ name: 'login' })
        } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
            next({ name: 'home' })
        } else if (to.name === 'login' && authStore.token) {
            next({ name: 'home' })
        } else {
            next()
        }
    }
})

export default router

