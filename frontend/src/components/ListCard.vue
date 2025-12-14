<script setup>
import { ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import { MoreFilled, Plus } from '@element-plus/icons-vue';
import draggable from 'vuedraggable';

import CardItem from './CardItem.vue';

const props = defineProps({
	list: {
		type: Object,
		required: true
	},
	board: {
		type: Object,
		required: true
	},
	onCardDragEnd: {
		type: Function,
		required: true
	}
});

const emit = defineEmits([
	'update-list',
	'delete-list',
	'add-card',
	'edit-card',
	'move-card'
]);

// Локальное состояние для карточек
const localCards = ref([]);

// Синхронизируем с пропсом
watch(() => props.list.cards, (newCards) => {
	if (newCards && Array.isArray(newCards)) {
		localCards.value = [...newCards];
	} else {
		localCards.value = [];
	}
}, { immediate: true, deep: true });

const handleListAction = async (command, listId) => {
	if (command === 'add-card') {
		emit('add-card', listId);
	} else if (command === 'edit') {
		try {
			const {value: newTitle} = await ElMessageBox.prompt(
				'Введите новое название списка',
				'Редактировать список',
				{
					confirmButtonText: 'Сохранить',
					cancelButtonText: 'Отмена',
					inputValue: props.list.title
				}
			);

			if (newTitle && newTitle.trim() !== props.list.title) {
				emit('update-list', listId, {title: newTitle.trim()});
			}
		} catch {
			// User cancelled
		}
	} else if (command === 'delete') {
		try {
			await ElMessageBox.confirm(
				'Вы уверены, что хотите удалить этот список? Все карточки в нем будут удалены.',
				'Подтверждение удаления',
				{
					confirmButtonText: 'Удалить',
					cancelButtonText: 'Отмена',
					type: 'warning'
				}
			);
			emit('delete-list', listId);
		} catch {
			// User cancelled
		}
	}
};

const handleCardDragEnd = (evt) => {
	if (!props.onCardDragEnd || !evt) return;
	
	// Устанавливаем data-list-id на элементы from и to для правильной идентификации списков
	if (evt.from) {
		evt.from.setAttribute('data-list-id', props.list._id);
	}
	
	// Для to элемента определяем список
	if (evt.to) {
		// Сначала проверяем, есть ли уже data-list-id на самом элементе
		let toListId = evt.to.dataset?.listId || evt.to.getAttribute?.('data-list-id');
		
		// Если не нашли, ищем в родительских элементах (cards-container имеет data-list-id)
		if (!toListId && evt.to.parentElement) {
			let parent = evt.to.parentElement;
			let depth = 0;
			while (parent && !toListId && depth < 5) {
				toListId = parent.dataset?.listId || parent.getAttribute?.('data-list-id');
				parent = parent.parentElement;
				depth++;
			}
		}
		
		// Если все еще не нашли, используем текущий список (карточка переместилась внутри списка)
		if (!toListId) {
			toListId = props.list._id;
			evt.to.setAttribute('data-list-id', toListId);
		}
	}
	
	props.onCardDragEnd(evt);
};
</script>

<template>
	<div class="list-container">
		<div class="list-header">
			<h3>{{ list.title }}</h3>
			<el-dropdown @command="(cmd) => handleListAction(cmd, list._id)">
				<el-icon class="list-menu-icon">
					<MoreFilled/>
				</el-icon>
				<template #dropdown>
					<el-dropdown-menu>
						<el-dropdown-item command="add-card">Добавить карточку</el-dropdown-item>
						<el-dropdown-item command="edit">Редактировать</el-dropdown-item>
						<el-dropdown-item command="delete" divided>Удалить</el-dropdown-item>
					</el-dropdown-menu>
				</template>
			</el-dropdown>
		</div>

		<div class="cards-container" :data-list-id="list._id">
			<div v-if="!localCards || localCards.length === 0" class="empty-cards">
				<p>Нет карточек</p>
			</div>
			<draggable
				v-else
				v-model="localCards"
				group="cards"
				@end="handleCardDragEnd"
				item-key="_id"
				:animation="200"
				class="cards-draggable"
				:data-list-id="list._id"
			>
				<template #item="{ element: card }">
					<CardItem
						:card="card"
						:board="board"
						:data-id="card._id"
						@click="$emit('edit-card', card)"
					/>
				</template>
			</draggable>
		</div>

		<div class="add-card-btn" @click="$emit('add-card', list._id)">
			<el-icon>
				<Plus />
			</el-icon>
			Добавить карточку
		</div>
	</div>
</template>

<style lang="scss" scoped>
.list-container {
	background: #f1f2f4;
	border-radius: $border-radius;
	padding: $spacing-md;
	min-width: 272px;
	max-width: 272px;
	display: flex;
	flex-direction: column;
	max-height: calc(100vh - 150px);
}

.list-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-md;

	h3 {
		font-size: 16px;
		font-weight: 600;
		color: $text-primary;
		margin: 0;
		flex: 1;
	}

	.list-menu-icon {
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		transition: background $transition-fast;

		&:hover {
			background: rgba(0, 0, 0, 0.1);
		}
	}
}

.cards-container {
	flex: 1;
	overflow-y: auto;
	overflow-x: hidden;
	margin-bottom: $spacing-sm;

	.empty-cards {
		text-align: center;
		padding: $spacing-md;
		color: $text-secondary;
		font-size: 14px;
	}

	.cards-draggable {
		display: flex;
		flex-direction: column;
		gap: $spacing-xs;
	}
}

.add-card-btn {
	display: flex;
	align-items: center;
	gap: $spacing-xs;
	padding: $spacing-sm;
	border-radius: $border-radius;
	cursor: pointer;
	color: $text-secondary;
	font-size: 14px;
	transition: background $transition-fast;

	&:hover {
		background: rgba(0, 0, 0, 0.1);
	}
}
</style>
