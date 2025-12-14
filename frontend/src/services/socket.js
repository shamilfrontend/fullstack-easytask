import { io } from 'socket.io-client';

import { useAuthStore } from '../stores/auth';

let socket = null;

export const initSocket = () => {
    const authStore = useAuthStore();

    if (!authStore.token) {
        return null;
    }

    socket = io('http://localhost:5001', {
        auth: {
            token: authStore.token
        }
    });

    socket.on('connect', () => {
        console.log('Socket connected');
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
