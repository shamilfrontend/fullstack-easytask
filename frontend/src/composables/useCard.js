import { computed } from 'vue';
import { ElMessage } from 'element-plus';

import { useCardsStore } from '../stores/cards';
import api from '../services/api';
import { getCardChecklistStats } from '../utils/boardHelpers';

/**
 * Composable для работы с карточкой
 */
export const useCard = () => {
	const cardsStore = useCardsStore();

	const create = async (listId, cardData) => {
		return await cardsStore.createCard(listId, cardData);
	};

	const update = async (cardId, updates) => {
		return await cardsStore.updateCard(cardId, updates);
	};

	const remove = async (cardId) => {
		return await cardsStore.deleteCard(cardId);
	};

	const move = async (cardId, listId, position) => {
		return await cardsStore.moveCard(cardId, listId, position);
	};

	const addMember = async (cardId, userId) => {
		return await cardsStore.addCardMember(cardId, userId);
	};

	const removeMember = async (cardId, userId) => {
		return await cardsStore.removeCardMember(cardId, userId);
	};

	const fetchCardWithComments = async (cardId) => {
		try {
			const response = await api.get(`/cards/${cardId}`);
			if (response.data.success) {
				return {success: true, card: response.data.card};
			}
			return {success: false};
		} catch (error) {
			ElMessage.error(error.response?.data?.message || 'Ошибка загрузки карточки');
			return {success: false, error: error.message};
		}
	};

	const getChecklistStats = (card) => {
		return getCardChecklistStats(card);
	};

	return {
		create,
		update,
		remove,
		move,
		addMember,
		removeMember,
		fetchCardWithComments,
		getChecklistStats,
		loading: computed(() => cardsStore.loading),
		error: computed(() => cardsStore.error)
	};
};
