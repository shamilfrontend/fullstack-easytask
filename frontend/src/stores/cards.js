import { ElMessage } from 'element-plus';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import api from '../services/api';

export const useCardsStore = defineStore('cards', () => {
	const loading = ref(false);
	const error = ref(null);

	const createCard = async (listId, cardData) => {
		loading.value = true;
		error.value = null;

		try {
			const response = await api.post('/cards', {
				...cardData,
				listId
			});

			ElMessage.success('Карточка создана');

			return {
                success: true,
                card: response.data.card
            };
		} catch (err) {
			error.value = err.response?.data?.message || 'Ошибка создания карточки';

			ElMessage.error(error.value);

			return {
                success: false,
                error: error.value
            };
		} finally {
			loading.value = false;
		}
	};

	const updateCard = async (cardId, updates) => {
		error.value = null;
		try {
			const response = await api.put(`/cards/${cardId}`, updates);

			if (response.data && response.data.success) {
				return {
                    success: true,
                    card: response.data.card
                };
			}

			return {
                success: false,
                error: 'Неверный формат ответа'
            };
		} catch (err) {
			error.value = err.response?.data?.message || 'Ошибка обновления карточки';

			ElMessage.error(error.value);

			return {
                success: false,
                error: error.value
            };
		}
	};

	const deleteCard = async (cardId) => {
		error.value = null;
		try {
			await api.delete(`/cards/${cardId}`);

			ElMessage.success('Карточка удалена');

			return {
                success: true
            };
		} catch (err) {
			error.value = err.response?.data?.message || 'Ошибка удаления карточки';

			ElMessage.error(error.value);

			return {
                success: false,
                error: error.value
            };
		}
	};

	const moveCard = async (cardId, listId, position) => {
		error.value = null;

		try {
			const response = await api.put(`/cards/${cardId}/move`, {
				listId,
				position
			});

			return {
                success: true,
                card: response.data.card
            };
		} catch (err) {
			error.value = err.response?.data?.message || 'Ошибка перемещения карточки';

			return {
                success: false,
                error: error.value
            };
		}
	};

	const addCardMember = async (cardId, userId) => {
		error.value = null;

		try {
			const response = await api.post(`/cards/${cardId}/members`, {userId});

			ElMessage.success('Участник добавлен');

			return {
                success: true,
                card: response.data.card
            };
		} catch (err) {
			error.value = err.response?.data?.message || 'Ошибка добавления участника';

			ElMessage.error(error.value);

			return {
                success: false,
                error: error.value
            };
		}
	};

	const removeCardMember = async (cardId, userId) => {
		error.value = null;
		try {
			const response = await api.delete(`/cards/${cardId}/members/${userId}`);

			ElMessage.success('Участник удален');

			return {
                success: true,
                card: response.data.card
            };
		} catch (err) {
			error.value = err.response?.data?.message || 'Ошибка удаления участника';

            ElMessage.error(error.value);

            return {
                success: false,
                error: error.value
            };
		}
	};

	return {
		loading,
		error,
		createCard,
		updateCard,
		deleteCard,
		moveCard,
		addCardMember,
		removeCardMember
	};
});
