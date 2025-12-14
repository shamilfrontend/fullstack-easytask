/**
 * Проверяет, является ли пользователь владельцем доски
 * @param {object} board - Доска
 * @param {string} userId - ID пользователя
 * @returns {boolean}
 */
export const isBoardOwner = (board, userId) => {
	if (!board || !userId) return false;

	return board.owner?._id?.toString() === userId.toString() ||
		board.owner?.toString() === userId.toString();
};

/**
 * Проверяет, является ли пользователь админом доски
 * @param {object} board - Доска
 * @param {string} userId - ID пользователя
 * @returns {boolean}
 */
export const isBoardAdmin = (board, userId) => {
	if (!board || !userId) return false;
	if (isBoardOwner(board, userId)) return true;

	const member = board.members?.find(m => {
		const memberId = m.user?._id || m.user;
		return memberId?.toString() === userId.toString();
	});

	return member?.role === 'admin';
};

/**
 * Проверяет, является ли пользователь участником доски
 * @param {object} board - Доска
 * @param {string} userId - ID пользователя
 * @returns {boolean}
 */
export const isBoardMember = (board, userId) => {
	if (!board || !userId) return false;
	if (isBoardOwner(board, userId)) return true;
	
	return board.members?.some(m => {
		const memberId = m.user?._id || m.user;
		return memberId?.toString() === userId.toString();
	});
};

/**
 * Проверяет, может ли пользователь редактировать доску
 * @param {object} board - Доска
 * @param {string} userId - ID пользователя
 * @returns {boolean}
 */
export const canEditBoard = (board, userId) => {
    return isBoardOwner(board, userId) || isBoardAdmin(board, userId);
};

/**
 * Проверяет, может ли пользователь удалять доску
 * @param {object} board - Доска
 * @param {string} userId - ID пользователя
 * @returns {boolean}
 */
export const canDeleteBoard = (board, userId) => {
	return isBoardOwner(board, userId);
};

/**
 * Проверяет, может ли пользователь добавлять участников
 * @param {object} board - Доска
 * @param {string} userId - ID пользователя
 * @returns {boolean}
 */
export const canManageMembers = (board, userId) => {
	return isBoardOwner(board, userId) || isBoardAdmin(board, userId);
};

/**
 * Получает роль пользователя на доске
 * @param {object} board - Доска
 * @param {string} userId - ID пользователя
 * @returns {string|null} - 'owner' | 'admin' | 'member' | 'viewer' | null
 */
export const getBoardRole = (board, userId) => {
	if (!board || !userId) return null;
	
	if (isBoardOwner(board, userId)) return 'owner';
	
	const member = board.members?.find(m => {
		const memberId = m.user?._id || m.user;
		return memberId?.toString() === userId.toString();
	});
	
	return member?.role || (board.visibility === 'public' ? 'viewer' : null);
};
