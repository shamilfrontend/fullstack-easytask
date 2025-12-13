import {defineStore} from 'pinia';
import {ref, computed} from 'vue';

import api from '../services/api';
import { ElMessage } from 'element-plus';

export const useBoardsStore = defineStore('boards', () => {
    const boards = ref([]);
    const currentBoard = ref(null);
    const loading = ref(false);
    const error = ref(null);

    const boardsCount = computed(() => boards.value.length);

    const publicBoards = computed(() =>
        boards.value.filter(board => board.visibility === 'public')
    );

    const privateBoards = computed(() =>
        boards.value.filter(board => board.visibility === 'private')
    );

    // Fetch all boards
    const fetchBoards = async () => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api.get('/boards');
            boards.value = response.data.boards || [];
            return {success: true};
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка загрузки досок';
            ElMessage.error(error.value);
            return {success: false, error: error.value};
        } finally {
            loading.value = false;
        }
    };

    // Fetch single board
    const fetchBoard = async (boardId) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await api.get(`/boards/${boardId}`);
            if (response.data.success && response.data.board) {
                currentBoard.value = response.data.board;

                // Ensure lists have cards array
                const boardLists = response.data.board.lists || [];
                currentBoard.value.lists = boardLists.map(list => ({
                    ...list,
                    cards: Array.isArray(list.cards) ? list.cards : []
                }));

                return {success: true, board: currentBoard.value};
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка загрузки доски';
            return {success: false, error: error.value};
        } finally {
            loading.value = false;
        }
    };

    // Create board
    const createBoard = async (boardData) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await api.post('/boards', boardData);
            const newBoard = response.data.board;
            boards.value.unshift(newBoard);
            ElMessage.success('Доска создана');

            return {
                success: true,
                board: newBoard
            };
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка создания доски';
            ElMessage.error(error.value);
            return {success: false, error: error.value};
        } finally {
            loading.value = false;
        }
    };

    // Update board
    const updateBoard = async (boardId, updates) => {
        error.value = null;

        try {
            const response = await api.put(`/boards/${boardId}`, updates);
            const updatedBoard = response.data.board;

            // Update in boards list
            const index = boards.value.findIndex(b => b._id === boardId);
            if (index !== -1) {
                boards.value[index] = updatedBoard;
            }

            // Update current board if it's the same
            if (currentBoard.value && currentBoard.value._id === boardId) {
                currentBoard.value = {...currentBoard.value, ...updatedBoard};
            }

            ElMessage.success('Доска обновлена');

            return {
                success: true,
                board: updatedBoard
            };
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка обновления доски';
            ElMessage.error(error.value);
            return {success: false, error: error.value};
        }
    };

    // Delete board
    const deleteBoard = async (boardId) => {
        error.value = null;

        try {
            await api.delete(`/boards/${boardId}`);

            // Remove from boards list
            boards.value = boards.value.filter(b => b._id !== boardId);

            // Clear current board if it's the same
            if (currentBoard.value && currentBoard.value._id === boardId) {
                currentBoard.value = null;
            }

            ElMessage.success('Доска удалена');

            return {
                success: true
            };
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка удаления доски';
            ElMessage.error(error.value);
            return {success: false, error: error.value};
        }
    };

    // Add member to board
    const addMember = async (boardId, userId, memberRole = 'member') => {
        error.value = null;

        try {
            const response = await api.post(`/boards/${boardId}/members`, {
                userId,
                memberRole
            });
            console.log('response: ', response.data);

            // Update current board if it's the same
            if (currentBoard.value && currentBoard.value._id === boardId) {
                await fetchBoard(boardId);
            }

            ElMessage.success('Участник добавлен');
            return {
                success: true
            };
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка добавления участника';
            ElMessage.error(error.value);
            return {success: false, error: error.value};
        }
    };

    // Remove member from board
    const removeMember = async (boardId, userId) => {
        error.value = null;

        try {
            await api.delete(`/boards/${boardId}/members/${userId}`);

            // Update current board if it's the same
            if (currentBoard.value && currentBoard.value._id === boardId) {
                await fetchBoard(boardId);
            }

            ElMessage.success('Участник удален');

            return {
                success: true
            };
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка удаления участника';
            ElMessage.error(error.value);
            return {success: false, error: error.value};
        }
    };

    // Clear current board
    const clearCurrentBoard = () => {
        currentBoard.value = null;
    };

    return {
        boards,
        currentBoard,
        loading,
        error,
        boardsCount,
        publicBoards,
        privateBoards,
        fetchBoards,
        fetchBoard,
        createBoard,
        updateBoard,
        deleteBoard,
        addMember,
        removeMember,
        clearCurrentBoard
    };
});

