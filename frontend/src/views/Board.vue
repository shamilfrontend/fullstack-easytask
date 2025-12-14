<script setup>
import {
	ref,
	computed,
	onMounted,
	onUnmounted,
	nextTick,
	watch
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import draggable from 'vuedraggable';

import api from '../services/api';
import { initSocket, getSocket } from '../services/socket';
import { useBoard } from '../composables/useBoard';
import { useCard } from '../composables/useCard';
import { useDragAndDrop } from '../composables/useDragAndDrop';
import { getNextListPosition } from '../utils/boardHelpers';
import AppHeader from '../components/AppHeader.vue';
import ListCard from '../components/ListCard.vue';
import CardDetail from '../components/CardDetail.vue';
import BoardSettings from '../components/BoardSettings.vue';
import BoardMembers from '../components/BoardMembers.vue';
import BoardToolbar from '../components/BoardToolbar.vue';

const route = useRoute();
const router = useRouter();

const boardComposable = useBoard(route.params.id);
const cardComposable = useCard();
const dragDrop = useDragAndDrop();

// State
const selectedCard = ref(null);
const showAddListDialog = ref(false);
const showAddCardDialog = ref(false);
const showSettings = ref(false);
const showMembers = ref(false);
const newListTitle = ref('');
const newCardTitle = ref('');
const currentListId = ref(null);
const listInputRef = ref(null);
const cardInputRef = ref(null);
const localLists = ref([]);

const board = computed(() => boardComposable.board.value);
const lists = computed({
	get: () => {
		const boardLists = boardComposable.lists.value;
		if (boardLists.length > 0 && localLists.value.length === 0) {
			localLists.value = boardLists.map(list => ({
				...list,
				cards: Array.isArray(list.cards) ? [...list.cards] : []
			}));
		}
		return localLists.value.length > 0 ? localLists.value : boardLists;
	},
	set: (value) => {
		localLists.value = value;
	}
});
const loading = computed(() => boardComposable.loading.value);
const canEdit = computed(() => boardComposable.canEdit.value);

// Watch for board changes to sync lists
watch(() => boardComposable.lists.value, (newLists) => {
	if (newLists && newLists.length > 0) {
		localLists.value = newLists.map(list => ({
			...list,
			cards: Array.isArray(list.cards) ? [...list.cards] : []
		}));
	}
}, {
	deep: true,
	immediate: true
});

// Fetch board
const fetchBoard = async () => {
	const result = await boardComposable.fetch();

	if (!result.success) {
		if (result.error && (result.error.includes('403') || result.error.includes('404'))) {
			setTimeout(() => {
				router.push('/boards');
			}, 2000);
		}
	}
};

// Create list
const createList = async () => {
	if (!newListTitle.value.trim()) {
		ElMessage.warning('Введите название списка');
		return;
	}

	if (!board.value) return;

	try {
		const position = getNextListPosition(
			localLists.value.length > 0 ? localLists.value : boardComposable.lists.value
		);

		await api.post('/lists', {
			title: newListTitle.value,
			boardId: board.value._id,
			position
		});
		newListTitle.value = '';
		showAddListDialog.value = false;
		await fetchBoard();
		ElMessage.success('Список создан');
	} catch (error) {
		ElMessage.error('Ошибка создания списка');
	}
};

// Update list
const updateList = async (listId, updates) => {
	try {
		await api.put(`/lists/${listId}`, updates);
		await fetchBoard();
		ElMessage.success('Список обновлен');
	} catch (error) {
		ElMessage.error('Ошибка обновления списка');
	}
};

// Delete list
const deleteList = async (listId) => {
	try {
		await api.delete(`/lists/${listId}`);
		await fetchBoard();
		ElMessage.success('Список удален');
	} catch (error) {
		ElMessage.error('Ошибка удаления списка');
	}
};

// Show add list dialog
const showAddList = () => {
	showAddListDialog.value = true;
	setTimeout(() => {
		listInputRef.value?.focus();
	}, 100);
};

// Show add card dialog
const showAddCard = (listId) => {
	currentListId.value = listId;
	showAddCardDialog.value = true;
	setTimeout(() => {
		cardInputRef.value?.focus();
	}, 100);
};

// Create card
const createCard = async () => {
	if (!newCardTitle.value.trim()) {
		ElMessage.warning('Введите название карточки');
		return;
	}

	if (!board.value || !currentListId.value) return;

	const result = await cardComposable.create(currentListId.value, {
		title: newCardTitle.value,
		boardId: board.value._id,
		position: 0
	});

	if (result.success) {
		newCardTitle.value = '';
		showAddCardDialog.value = false;
		await fetchBoard();
	}
};

// Open card
const openCard = (card) => {
	selectedCard.value = card;
};

// Edit card
const editCard = (card) => {
	openCard(card);
};

// Handle list drag end
const onListDragEnd = async () => {
	if (localLists.value.length > 0) {
		await dragDrop.onListDragEnd(localLists.value);
		await fetchBoard();
	}
};

// Handle card drag end
const onCardDragEnd = async (evt) => {
	if (!evt) {
		console.log('onCardDragEnd: нет события');
		return;
	}

	// console.log('onCardDragEnd вызван', evt);

	const newIndex = evt.newIndex;
	const oldIndex = evt.oldIndex;
	
	// Если позиция не изменилась и список тот же, ничего не делаем
	console.log('newIndex: ', newIndex);
	console.log('oldIndex: ', oldIndex);
	console.log('evt.from: ', evt.from);
	console.log('evt.to: ', evt.to);
	if (newIndex === oldIndex && evt.from === evt.to) {
		console.log('Позиция не изменилась');
		return;
	}

	// Ждем обновления v-model после перемещения
	await nextTick();

	// Получаем ID карточки из события - пробуем разные способы
	let cardId = null;
	
	// Способ 1: из _underlying_vm_ (Vue 3) - самый надежный
	if (evt.item?._underlying_vm_?._id) {
		cardId = evt.item._underlying_vm_._id;
		console.log('Получен cardId из _underlying_vm_:', cardId);
	}
	// Способ 2: из element
	else if (evt.item?.element?._id) {
		cardId = evt.item.element._id;
		console.log('Получен cardId из element:', cardId);
	}
	// Способ 3: из нового списка по индексу (vuedraggable уже обновил v-model)
	else if (newIndex !== undefined && newIndex !== null && evt.to) {
		const toListId = evt.to?.dataset?.listId || evt.to?.getAttribute?.('data-list-id');
		if (toListId) {
			const toList = localLists.value.find(l => l._id === toListId);
			if (toList && toList.cards && toList.cards[newIndex]) {
				cardId = toList.cards[newIndex]._id;
				console.log('Получен cardId из нового списка по индексу:', cardId);
			}
		}
	}

	if (!cardId) {
		console.error('Не удалось получить cardId из события', evt);
		await fetchBoard();
		return;
	}

	// Определяем новый список (куда переместили карточку)
	let newListId = null;
	
	// Способ 1: ищем карточку в обновленных списках (vuedraggable уже обновил v-model)
	const cardInLists = localLists.value.find(list => 
		list.cards?.some(c => c._id === cardId)
	);
	if (cardInLists) {
		newListId = cardInLists._id;
		console.log('Найден newListId через поиск карточки:', newListId);
	}
	
	// Способ 2: из data-атрибута целевого элемента (если не нашли через поиск)
	if (!newListId && evt.to) {
		newListId = evt.to.dataset?.listId || evt.to.getAttribute?.('data-list-id');
		
		// Если не нашли, ищем в родительских элементах
		if (!newListId) {
			let parent = evt.to.parentElement;
			let depth = 0;
			while (parent && !newListId && depth < 10) {
				newListId = parent.dataset?.listId || parent.getAttribute?.('data-list-id');
				parent = parent.parentElement;
				depth++;
			}
		}
		
		if (newListId) {
			console.log('Найден newListId через DOM:', newListId);
		}
	}
	
	if (!newListId) {
		console.error('Не удалось определить newListId', evt);
		await fetchBoard();
		return;
	}

	console.log('Перемещение карточки:', { cardId, newListId, newIndex });

	const result = await cardComposable.move(cardId, newListId, newIndex);
	if (result.success) {
		console.log('Карточка успешно перемещена');
		await fetchBoard();
	} else {
		console.error('Ошибка перемещения карточки:', result);
		await fetchBoard();
	}
};

// Handle card move event
const handleCardMove = async (data) => {
	const {cardId, listId, newIndex} = data;
	const result = await cardComposable.move(cardId, listId, newIndex);
	if (result.success) {
		await fetchBoard();
	}
};

// Initialize socket
const initSocketListeners = () => {
	if (!board.value) return;

	const socket = initSocket();
	if (!socket) return;

	socket.emit('join-board', board.value._id);

	socket.on('card-created', () => fetchBoard());
	socket.on('card-updated', () => fetchBoard());
	socket.on('card-moved', () => fetchBoard());
	socket.on('card-deleted', () => fetchBoard());
	socket.on('list-created', () => fetchBoard());
	socket.on('list-updated', () => fetchBoard());
	socket.on('list-deleted', () => fetchBoard());

	return socket;
};

// Watch for board changes to initialize socket
watch(() => board.value?._id, (newId) => {
	if (newId) {
		nextTick(() => {
			initSocketListeners();
		});
	}
}, {immediate: true});

onMounted(async () => {
	await fetchBoard();
	await nextTick();
});

onUnmounted(() => {
	const socket = getSocket();

	if (socket && board.value) {
		socket.emit('leave-board', board.value._id);
		socket.off('card-created');
		socket.off('card-updated');
		socket.off('card-moved');
		socket.off('card-deleted');
		socket.off('list-created');
		socket.off('list-updated');
		socket.off('list-deleted');
	}
});
</script>

<template>
	<div class="board-page" :style="{ background: board?.background }">
		<AppHeader />

		<div class="board-container" v-loading="loading">
			<BoardToolbar
				v-if="board"
				:board="board"
				:can-edit="canEdit"
				@settings="showSettings = true"
				@members="showMembers = true"
			/>

			<div class="board-lists" v-if="board && !loading">
				<draggable
					v-model="localLists"
					group="lists"
					item-key="_id"
					handle=".list-header"
					class="lists-draggable"
					@end="onListDragEnd"
				>
					<template #item="{ element: list }">
						<ListCard
							:list="list"
							:board="board"
							:on-card-drag-end="onCardDragEnd"
							@update-list="updateList"
							@delete-list="deleteList"
							@add-card="showAddCard"
							@edit-card="editCard"
							@move-card="handleCardMove"
						/>
					</template>
				</draggable>

				<div class="add-list-btn" @click="showAddList">
					<el-icon>
						<Plus />
					</el-icon>
					Добавить список
				</div>
			</div>
		</div>

		<!-- Card Detail Dialog -->
		<CardDetail
			v-if="selectedCard"
			:card="selectedCard"
			:board="board"
			@close="selectedCard = null"
			@update="fetchBoard"
		/>

		<!-- Add List Dialog -->
		<el-dialog v-model="showAddListDialog" title="Добавить список" width="400px">
			<el-input
				v-model="newListTitle"
				placeholder="Название списка"
				@keyup.enter="createList"
				ref="listInputRef"
			/>
			<template #footer>
				<el-button @click="showAddListDialog = false">Отмена</el-button>
				<el-button type="primary" @click="createList">Добавить</el-button>
			</template>
		</el-dialog>

		<!-- Add Card Dialog -->
		<el-dialog v-model="showAddCardDialog" title="Добавить карточку" width="400px">
			<el-input
				v-model="newCardTitle"
				placeholder="Название карточки"
				@keyup.enter="createCard"
				ref="cardInputRef"
			/>
			<template #footer>
				<el-button @click="showAddCardDialog = false">Отмена</el-button>
				<el-button type="primary" @click="createCard">Добавить</el-button>
			</template>
		</el-dialog>

		<!-- Board Settings Dialog -->
		<BoardSettings
			v-if="board"
			v-model="showSettings"
			:board="board"
			@update="fetchBoard"
		/>

		<!-- Members Dialog -->
		<BoardMembers
			v-if="board"
			v-model="showMembers"
			:board="board"
			@update="fetchBoard"
		/>
	</div>
</template>

<style lang="scss" scoped>
.board-page {
	min-height: 100vh;
	padding-bottom: $spacing-lg;
}

.board-container {
	padding: $spacing-lg;
}

.board-lists {
	display: flex;
	gap: $spacing-md;
	overflow-x: auto;
	padding-bottom: $spacing-md;
	align-items: flex-start;

	&::-webkit-scrollbar {
		height: 12px;
	}
}

.lists-draggable {
	display: flex;
	gap: $spacing-md;
	min-height: 100px;
}

.add-list-btn {
	min-width: 272px;
	width: 272px;
	height: 40px;
	background: rgba(255, 255, 255, 0.2);
	color: white;
	justify-content: center;
	align-items: center;
	padding: $spacing-md;
	border-radius: $border-radius;
	cursor: pointer;
	display: flex;
	gap: $spacing-xs;
	transition: all $transition-normal;
	font-size: 14px;
	font-weight: 500;
	border: 2px dashed rgba(255, 255, 255, 0.3);
	flex-shrink: 0;

	&:hover {
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
		transform: scale(1.02);
	}
}

@media (max-width: 768px) {
	.board-lists {
		flex-direction: column;
		align-items: stretch;
	}

	.add-list-btn {
		width: 100%;
		min-width: 100%;
	}

	.lists-draggable {
		flex-direction: column;
		width: 100%;
	}
}
</style>
