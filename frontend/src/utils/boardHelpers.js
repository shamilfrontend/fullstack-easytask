/**
 * Находит карточку по ID в списках доски
 * @param {array} lists - Массив списков
 * @param {string} cardId - ID карточки
 * @returns {object|null}
 */
export const findCardInLists = (lists, cardId) => {
	if (!lists || !cardId) return null;
	
	for (const list of lists) {
		const card = list.cards?.find(c => {
			const id = c._id?.toString() || c._id;
			return id === cardId.toString();
		});
		if (card) return {card, list};
	}
	
	return null;
};

/**
 * Находит список по ID в доске
 * @param {array} lists - Массив списков
 * @param {string} listId - ID списка
 * @returns {object|null}
 */
export const findListById = (lists, listId) => {
	if (!lists || !listId) return null;
	
	return lists.find(l => {
		const id = l._id?.toString() || l._id;
		return id === listId.toString();
	}) || null;
};

/**
 * Сортирует списки по позиции
 * @param {array} lists - Массив списков
 * @returns {array}
 */
export const sortListsByPosition = (lists) => {
	if (!lists) return [];
	
	return [...lists].sort((a, b) => {
		const posA = a.position ?? 0;
		const posB = b.position ?? 0;
		return posA - posB;
	});
};

/**
 * Сортирует карточки по позиции
 * @param {array} cards - Массив карточек
 * @returns {array}
 */
export const sortCardsByPosition = (cards) => {
	if (!cards) return [];
	
	return [...cards].sort((a, b) => {
		const posA = a.position ?? 0;
		const posB = b.position ?? 0;
		return posA - posB;
	});
};

/**
 * Вычисляет следующую позицию для нового списка
 * @param {array} lists - Массив списков
 * @returns {number}
 */
export const getNextListPosition = (lists) => {
	if (!lists || lists.length === 0) return 0;
	
	const positions = lists.map(l => l.position ?? 0);
	return Math.max(...positions) + 1;
};

/**
 * Вычисляет следующую позицию для новой карточки
 * @param {array} cards - Массив карточек
 * @returns {number}
 */
export const getNextCardPosition = (cards) => {
	if (!cards || cards.length === 0) return 0;
	
	const positions = cards.map(c => c.position ?? 0);
	return Math.max(...positions) + 1;
};

/**
 * Обновляет позиции списков после изменения порядка
 * @param {array} lists - Массив списков
 * @returns {array}
 */
export const updateListPositions = (lists) => {
	return lists.map((list, index) => ({
		...list,
		position: index
	}));
};

/**
 * Обновляет позиции карточек после изменения порядка
 * @param {array} cards - Массив карточек
 * @returns {array}
 */
export const updateCardPositions = (cards) => {
	return cards.map((card, index) => ({
		...card,
		position: index
	}));
};

/**
 * Подсчитывает общее количество карточек в доске
 * @param {array} lists - Массив списков
 * @returns {number}
 */
export const getTotalCardsCount = (lists) => {
	if (!lists) return 0;
	
	return lists.reduce((total, list) => {
		return total + (list.cards?.length || 0);
	}, 0);
};

/**
 * Подсчитывает количество выполненных задач в чек-листах карточки
 * @param {object} card - Карточка
 * @returns {object} - {completed, total}
 */
export const getCardChecklistStats = (card) => {
	if (!card || !card.checklists || card.checklists.length === 0) {
		return {completed: 0, total: 0};
	}
	
	let completed = 0;
	let total = 0;
	
	card.checklists.forEach(checklist => {
		if (checklist.items) {
			checklist.items.forEach(item => {
				total++;
				if (item.completed) completed++;
			});
		}
	});
	
	return {completed, total};
};
