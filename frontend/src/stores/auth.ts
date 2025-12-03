import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'

export interface User {
    id: number
    employee_id: string
    name: string
    email: string
    is_admin: boolean
    is_active: boolean
    role?: string  // user, admin, sysadmin
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(localStorage.getItem('token'))
    const isLoading = ref(true)

    const isAuthenticated = computed(() => !!token.value)
    const isSysAdmin = computed(() => user.value?.role === 'sysadmin')
    const isAdmin = computed(() => user.value?.is_admin ?? false)

    const fetchUser = async () => {
        if (token.value) {
            try {
                const response = await api.get('/auth/me', token.value)
                user.value = response
            } catch (error) {
                console.error('Failed to fetch user:', error)
                logout()
            }
        }
        isLoading.value = false
    }

    const login = async (employeeId: string, password: string) => {
        const data = await api.post('/auth/login', { username: employeeId, password })
        token.value = data.access_token
        localStorage.setItem('token', data.access_token)

        try {
            const userResponse = await api.get('/auth/me', data.access_token)
            user.value = userResponse
        } catch (error) {
            console.error('Failed to fetch user details:', error)
        }
    }

    const logout = () => {
        token.value = null
        user.value = null
        localStorage.removeItem('token')
    }

    // Initialize - fetch user if token exists
    fetchUser()

    return {
        user,
        token,
        isLoading,
        isAuthenticated,
        isSysAdmin,
        isAdmin,
        login,
        logout,
        fetchUser
    }
})

