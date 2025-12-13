import {ref, computed} from 'vue';
import {useCardsStore} from '../stores/cards';
import api from '../services/api';
import {ElMessage} from 'element-plus';
import * as boardHelpers from '../utils/boardHelpers';
import {getCardChecklistStats} from '../utils/boardHelpers';

/**
 * Composable для работы с карточкой
 */
export const useCard = () => {
	const cardsStore = useCardsStore();

	// Create card
	const create = async (listId, cardData) => {
		return await cardsStore.createCard(listId, cardData);
	};

	// Update card
	const update = async (cardId, updates) => {
		return await cardsStore.updateCard(cardId, updates);
	};

	// Delete card
	const remove = async (cardId) => {
		return await cardsStore.deleteCard(cardId);
	};

	// Move card
	const move = async (cardId, listId, position) => {
		return await cardsStore.moveCard(cardId, listId, position);
	};

	// Add member to card
	const addMember = async (cardId, userId) => {
		return await cardsStore.addCardMember(cardId, userId);
	};

	// Remove member from card
	const removeMember = async (cardId, userId) => {
		return await cardsStore.removeCardMember(cardId, userId);
	};

	// Get card with comments
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

	// Get checklist stats
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

