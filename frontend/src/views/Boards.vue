<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Search, User } from '@element-plus/icons-vue';

import { useBoardsStore } from '../stores/boards';
import AppHeader from '../components/AppHeader.vue';

const router = useRouter();
const boardsStore = useBoardsStore();

const showCreateDialog = ref(false);
const creating = ref(false);
const searchQuery = ref('');
const filterVisibility = ref('all'); // all, public, private

const newBoard = ref({
	title: '',
	description: '',
	visibility: 'private',
	background: '#0079bf'
});

const boards = computed(() => boardsStore.boards);
const loading = computed(() => boardsStore.loading);

const createBoard = async () => {
	if (!newBoard.value.title.trim()) {
		return;
	}

	creating.value = true;
	const result = await boardsStore.createBoard(newBoard.value);

	if (result.success) {
		showCreateDialog.value = false;
		newBoard.value = {
			title: '',
			description: '',
			visibility: 'private',
			background: '#0079bf'
		};
	}

	creating.value = false;
};

const openBoard = (boardId) => {
	router.push(`/board/${boardId}`);
};

const filteredBoards = computed(() => {
	let filtered = boards.value;

	// Filter by search query
	if (searchQuery.value.trim()) {
		const query = searchQuery.value.toLowerCase();
		filtered = filtered.filter(board =>
			board.title.toLowerCase().includes(query) ||
			board.description?.toLowerCase().includes(query)
		);
	}

	// Filter by visibility
	if (filterVisibility.value !== 'all') {
		filtered = filtered.filter(board => board.visibility === filterVisibility.value);
	}

	return filtered;
});

onMounted(() => {
	boardsStore.clearCurrentBoard();

	boardsStore.fetchBoards();
});
</script>

<template>
	<div class="boards-page">
		<AppHeader/>

		<div class="boards-container">
			<div class="boards-header">
				<h1>Мои доски</h1>
				<el-button type="primary" @click="showCreateDialog = true">
					<el-icon>
						<Plus/>
					</el-icon>
					Создать доску
				</el-button>
			</div>

			<!-- Search and Filter -->
			<div class="boards-filters">
				<el-input
					v-model="searchQuery"
					placeholder="Поиск досок..."
					clearable
					style="max-width: 400px;"
				>
					<template #prefix>
						<el-icon>
							<Search/>
						</el-icon>
					</template>
				</el-input>
				<el-radio-group v-model="filterVisibility" size="small">
					<el-radio-button label="all">Все</el-radio-button>
					<el-radio-button label="public">Публичные</el-radio-button>
					<el-radio-button label="private">Приватные</el-radio-button>
				</el-radio-group>
			</div>

			<div class="boards-grid" v-loading="loading">
				<div
					v-for="board in filteredBoards"
					:key="board._id"
					class="board-card"
					@click="openBoard(board._id)"
					:style="{ background: board.background }"
				>
					<div class="board-card-content">
						<h3>{{ board.title }}</h3>
						<p v-if="board.description" class="board-description">{{ board.description }}</p>
						<div class="board-meta">
							<span class="visibility-badge" :class="board.visibility">
								{{ board.visibility === 'public' ? 'Публичная' : 'Приватная' }}
							</span>
							<span v-if="board.members && board.members.length > 0" class="members-count">
								<el-icon><User/></el-icon>
								{{ board.members.length }}
							</span>
						</div>
					</div>
				</div>
			</div>

			<el-empty
				v-if="!loading && filteredBoards.length === 0 && boards.length > 0"
				description="Не найдено досок по вашему запросу"
			/>
			<el-empty v-if="!loading && boards.length === 0" description="Нет досок"/>
		</div>

		<!-- Create Board Dialog -->
		<el-dialog
			v-model="showCreateDialog"
			title="Создать доску"
			width="500px"
		>
			<el-form :model="newBoard" label-width="100px">
				<el-form-item label="Название">
					<el-input v-model="newBoard.title" placeholder="Введите название доски"/>
				</el-form-item>
				<el-form-item label="Описание">
					<el-input
						v-model="newBoard.description"
						type="textarea"
						:rows="3"
						placeholder="Описание доски (необязательно)"
					/>
				</el-form-item>
				<el-form-item label="Видимость">
					<el-radio-group v-model="newBoard.visibility">
						<el-radio label="private">Приватная</el-radio>
						<el-radio label="public">Публичная</el-radio>
					</el-radio-group>
				</el-form-item>
				<el-form-item label="Цвет фона">
					<el-color-picker v-model="newBoard.background"/>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="showCreateDialog = false">Отмена</el-button>
				<el-button type="primary" @click="createBoard" :loading="creating">
					Создать
				</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<style lang="scss" scoped>
.boards-page {
	min-height: 100vh;
}

.boards-container {
	max-width: 1200px;
	margin: 0 auto;
	padding: $spacing-lg;
}

.boards-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-lg;

	h1 {
		font-size: 32px;
		font-weight: 600;
		color: $text-primary;
	}
}

.boards-filters {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: $spacing-md;
	margin-bottom: $spacing-lg;
	flex-wrap: wrap;
}

.boards-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	gap: $spacing-md;
}

.board-card {
	min-height: 120px;
	border-radius: $border-radius;
	cursor: pointer;
	transition: transform $transition-normal, box-shadow $transition-normal;
	box-shadow: $shadow-sm;
	position: relative;
	overflow: hidden;
	animation: fadeIn 0.3s ease-in;

	&:hover {
		transform: translateY(-4px) scale(1.02);
		box-shadow: $shadow-lg;
	}

	.board-card-content {
		padding: $spacing-md;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		color: white;
		gap: 8px;

		h3 {
			font-size: 18px;
			font-weight: 600;
			margin: 0;
			color: white;
		}

		p {
			font-size: 14px;
			margin: 0;
			opacity: 0.9;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.board-description {
			max-height: 40px;
			overflow: hidden;
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
		}

		.board-meta {
			margin-top: auto;
			display: flex;
			align-items: center;
			gap: $spacing-sm;
		}

		.visibility-badge {
			display: inline-flex;
			align-items: center;
			padding: 4px 8px;
			border-radius: 4px;
			font-size: 12px;
			background: rgba(255, 255, 255, 0.2);
			backdrop-filter: blur(10px);
		}

		.members-count {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			font-size: 12px;
			opacity: 0.9;
		}
	}
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media (max-width: 768px) {
	.boards-header {
		flex-direction: column;
		align-items: flex-start;
		gap: $spacing-md;

		h1 {
			font-size: 24px;
		}
	}

	.boards-filters {
		flex-direction: column;
		align-items: stretch;

		.el-input {
			max-width: 100% !important;
		}
	}

	.boards-grid {
		grid-template-columns: 1fr;
	}
}
</style>

