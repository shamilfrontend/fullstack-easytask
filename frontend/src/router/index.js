import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '../stores/auth';

const routes = [
    {
        path: '/',
        redirect: '/boards'
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue'),
        meta: {requiresGuest: true}
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('../views/Register.vue'),
        meta: {requiresGuest: true}
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import('../views/ForgotPassword.vue'),
        meta: {requiresGuest: true}
    },
    {
        path: '/reset-password/:token',
        name: 'ResetPassword',
        component: () => import('../views/ResetPassword.vue'),
        meta: {requiresGuest: true}
    },
    {
        path: '/boards',
        name: 'Boards',
        component: () => import('../views/Boards.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/board/:id',
        name: 'Board',
        component: () => import('../views/Board.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue'),
        meta: {requiresAuth: true}
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();

    // Initialize auth store if token exists but user is not loaded
    if (authStore.token && !authStore.user && !authStore.isLoading) {
        await authStore.init();
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next({name: 'Login', query: {redirect: to.fullPath}});
    } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
        next({name: 'Boards'});
    } else {
        next();
    }
});

export default router;
