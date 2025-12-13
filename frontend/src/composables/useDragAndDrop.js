import {ref} from 'vue';
import api from '../services/api';
import {ElMessage} from 'element-plus';
import * as boardHelpers from '../utils/boardHelpers';

/**
 * Composable для работы с drag-and-drop
 */
export const useDragAndDrop = () => {
	const isDragging = ref(false);

	// Handle list drag end
	const onListDragEnd = async (lists) => {
		isDragging.value = false;
		
		try {
			// Update positions
			const updates = lists.map((list, index) => ({
				id: list._id,
				position: index
			}));

			// Update all lists positions
			await Promise.all(
				updates.map(update =>
					api.put(`/lists/${update.id}`, {position: update.position})
				)
			);
		} catch (error) {
			console.error('Error updating list positions:', error);
			ElMessage.error('Ошибка обновления порядка списков');
		}
	};

	// Handle card drag end
	const onCardDragEnd = async (evt, newListId, lists) => {
		isDragging.value = false;
		
		const cardId = evt.item.dataset?.id || evt.item._underlying_vm_?.card?._id;
		const oldListId = evt.from.dataset?.listId;
		
		if (!cardId || !oldListId) {
			console.error('Missing card or list ID');
			return;
		}

		// Find the list where card was dropped
		const targetList = boardHelpers.findListById(lists, newListId);
		if (!targetList) {
			console.error('Target list not found');
			return;
		}

		// Calculate new position
		const newIndex = evt.newIndex;
		const position = newIndex;

		try {
			// Update card position
			await api.put(`/cards/${cardId}/move`, {
				listId: newListId,
				position
			});

			// Update positions for all cards in the new list
			if (targetList.cards) {
				const updates = targetList.cards.map((card, index) => ({
					id: card._id,
					position: index
				}));

				await Promise.all(
					updates.map(update =>
						api.put(`/cards/${update.id}`, {position: update.position})
					)
				);
			}

			// If card moved to different list, update old list positions too
			if (oldListId !== newListId) {
				const oldList = boardHelpers.findListById(lists, oldListId);
				if (oldList && oldList.cards) {
					const updates = oldList.cards.map((card, index) => ({
						id: card._id,
						position: index
					}));

					await Promise.all(
						updates.map(update =>
							api.put(`/cards/${update.id}`, {position: update.position})
						)
					);
				}
			}
		} catch (error) {
			console.error('Error moving card:', error);
			ElMessage.error('Ошибка перемещения карточки');
		}
	};

	// Handle drag start
	const onDragStart = () => {
		isDragging.value = true;
	};

	return {
		isDragging,
		onListDragEnd,
		onCardDragEnd,
		onDragStart
	};
};

