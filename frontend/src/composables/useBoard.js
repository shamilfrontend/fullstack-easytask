import {ref, computed} from 'vue';
import {useBoardsStore} from '../stores/boards';
import {useAuthStore} from '../stores/auth';
import * as permissions from '../utils/permissions';
import * as boardHelpers from '../utils/boardHelpers';

/**
 * Composable для работы с доской
 */
export const useBoard = (boardId) => {
	const boardsStore = useBoardsStore();
	const authStore = useAuthStore();
	
	const board = computed(() => boardsStore.currentBoard);
	const lists = computed(() => board.value?.lists || []);
	const loading = computed(() => boardsStore.loading);
	const error = computed(() => boardsStore.error);

	// Permissions
	const isOwner = computed(() => 
		board.value && permissions.isBoardOwner(board.value, authStore.user?.id)
	);
	
	const isAdmin = computed(() => 
		board.value && permissions.isBoardAdmin(board.value, authStore.user?.id)
	);
	
	const isMember = computed(() => 
		board.value && permissions.isBoardMember(board.value, authStore.user?.id)
	);
	
	const canEdit = computed(() => {
        return board.value && permissions.canEditBoard(board.value, authStore.user?.id);
    });
	
	const canDelete = computed(() => 
		board.value && permissions.canDeleteBoard(board.value, authStore.user?.id)
	);
	
	const canManageMembers = computed(() => 
		board.value && permissions.canManageMembers(board.value, authStore.user?.id)
	);
	
	const userRole = computed(() => 
		board.value ? permissions.getBoardRole(board.value, authStore.user?.id) : null
	);

	// Helpers
	const findCard = (cardId) => boardHelpers.findCardInLists(lists.value, cardId);
	const findList = (listId) => boardHelpers.findListById(lists.value, listId);
	const getTotalCards = () => boardHelpers.getTotalCardsCount(lists.value);

	// Actions
	const fetch = async () => {
		return await boardsStore.fetchBoard(boardId);
	};

	const update = async (updates) => {
		if (!board.value) return {success: false};
		return await boardsStore.updateBoard(board.value._id, updates);
	};

	const remove = async () => {
		if (!board.value) return {success: false};
		return await boardsStore.deleteBoard(board.value._id);
	};

	const addMember = async (userId, memberRole = 'member') => {
		if (!board.value) return {success: false};
		return await boardsStore.addMember(board.value._id, userId, memberRole);
	};

	const removeMember = async (userId) => {
		if (!board.value) return {success: false};
		return await boardsStore.removeMember(board.value._id, userId);
	};

	return {
		board,
		lists,
		loading,
		error,
		isOwner,
		isAdmin,
		isMember,
		canEdit,
		canDelete,
		canManageMembers,
		userRole,
		findCard,
		findList,
		getTotalCards,
		fetch,
		update,
		remove,
		addMember,
		removeMember
	};
};

