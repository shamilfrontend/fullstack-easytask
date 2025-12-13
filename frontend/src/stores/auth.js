import {defineStore} from 'pinia';
import {ref, computed} from 'vue';

import api from '../services/api';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const token = ref(localStorage.getItem('token') || null);
    const isLoading = ref(false);
    let initPromise = null;

    const isAuthenticated = computed(() => !!token.value);

    // Initialize user from token
    const init = async () => {
        // If user is already loaded, return immediately
        if (user.value) {
            return;
        }

        // If initialization is already in progress, wait for it
        if (initPromise) {
            return initPromise;
        }

        if (!token.value) {
            return;
        }

        // Start initialization
        isLoading.value = true;
        initPromise = (async () => {
            try {
                const response = await api.get('/auth/me');
                console.log('response:', response);
                user.value = response.data.user;
            } catch (error) {
                // Token is invalid, clear it
                logout();
            } finally {
                isLoading.value = false;
                initPromise = null;
            }
        })();

        return initPromise;
    };

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', {email, password});
            token.value = response.data.token;
            user.value = response.data.user;
            localStorage.setItem('token', token.value);
            return {success: true};
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Ошибка входа'
            };
        }
    };

    const register = async (name, email, password) => {
        try {
            const response = await api.post('/auth/register', {name, email, password});
            token.value = response.data.token;
            user.value = response.data.user;
            localStorage.setItem('token', token.value);
            return {success: true};
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Ошибка регистрации'
            };
        }
    };

    const logout = () => {
        token.value = null;
        user.value = null;
        initPromise = null;
        isLoading.value = false;
        localStorage.removeItem('token');
    };

    const updateProfile = async (data) => {
        try {
            const response = await api.put('/users/profile', data);
            user.value = response.data.user;
            return {success: true};
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Ошибка обновления профиля'
            };
        }
    };

    const updatePreferences = async (preferences) => {
        try {
            const response = await api.put('/users/profile', {preferences});
            user.value = response.data.user;
            return {success: true};
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Ошибка обновления настроек'
            };
        }
    };

    return {
        user,
        token,
        isAuthenticated,
        isLoading,
        init,
        login,
        register,
        logout,
        updateProfile,
        updatePreferences
    };
});
