<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { Plus, Document, Edit, Delete, Close } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import api from '../services/api';
import { formatRelativeDate } from '../utils/dateHelpers';
import { useAuthStore } from '../stores/auth';
import { useCard } from '../composables/useCard';

const props = defineProps({
	card: {
		type: Object,
		required: true
	},
	board: {
		type: Object,
		default: null
	}
});

const emit = defineEmits(['close', 'update']);

const authStore = useAuthStore();

const cardComposable = useCard();

const visible = ref(true);
const loading = ref(false);
const editingTitle = ref(false);
const editingDescription = ref(false);
const title = ref(props.card.title || '');
const description = ref(props.card.description || '');
const dueDate = ref(props.card.dueDate ? new Date(props.card.dueDate) : null);
const priority = ref(props.card.priority || 'medium');
const comments = ref([]);
const newComment = ref('');
const showAddMember = ref(false);
const descriptionInput = ref(null);
const titleInput = ref(null);

const uploadUrl = computed(() => `/api/cards/${props.card._id}/attachments`);
const uploadHeaders = computed(() => ({
	Authorization: `Bearer ${authStore.token}`
}));

const fetchComments = async () => {
	try {
		const response = await api.get(`/comments/card/${props.card._id}`);
		comments.value = response.data.comments;
	} catch (error) {
		console.error('Error fetching comments:', error);
	}
};

const saveTitle = async () => {
	if (!title.value.trim()) {
		ElMessage.warning('Название не может быть пустым');
		title.value = props.card.title;
		return;
	}
	
	const result = await cardComposable.update(props.card._id, {title: title.value});
	if (result.success) {
		editingTitle.value = false;
		emit('update');
		ElMessage.success('Название обновлено');
	} else {
		title.value = props.card.title;
	}
};

const saveDescription = async () => {
	try {
		const result = await cardComposable.update(props.card._id, {
			description: description.value || ''
		});
		if (result.success) {
			editingDescription.value = false;
			emit('update');
			ElMessage.success('Описание сохранено');
		} else {
			description.value = props.card.description || '';
		}
	} catch (error) {
		console.error('Error saving description:', error);
		description.value = props.card.description || '';
		ElMessage.error(error.response?.data?.message || 'Ошибка сохранения описания');
	}
};

const saveDueDate = async () => {
	const result = await cardComposable.update(props.card._id, {
		dueDate: dueDate.value ? dueDate.value.toISOString() : null
	});
	if (result.success) {
		emit('update');
	}
};

const savePriority = async () => {
	const result = await cardComposable.update(props.card._id, {priority: priority.value});
	if (result.success) {
		emit('update');
	}
};

const toggleLabel = async (labelId) => {
	const currentLabels = props.card.labels || [];
	const newLabels = currentLabels.includes(labelId)
		? currentLabels.filter(id => id !== labelId)
		: [...currentLabels, labelId];

	const result = await cardComposable.update(props.card._id, {labels: newLabels});
	if (result.success) {
		emit('update');
	}
};

const addComment = async () => {
	if (!newComment.value.trim()) {
		ElMessage.warning('Введите текст комментария');
		return;
	}

	try {
		await api.post('/comments', {
			text: newComment.value,
			cardId: props.card._id
		});
		newComment.value = '';
		await fetchComments();
		emit('update');
		ElMessage.success('Комментарий добавлен');
	} catch (error) {
		console.error('Error adding comment:', error);
		ElMessage.error(error.response?.data?.message || 'Ошибка добавления комментария');
	}
};

const addChecklist = async (event) => {
	if (event) {
		event.preventDefault();
		event.stopPropagation();
	}
	
	try {
		const response = await api.post(`/cards/${props.card._id}/checklists`, {
			title: 'Новый чек-лист'
		});
		if (response.data && response.data.success) {
			ElMessage.success('Чек-лист добавлен');
			emit('update');
		} else {
			ElMessage.error('Ошибка добавления чек-листа');
		}
	} catch (error) {
		console.error('Error adding checklist:', error);
		ElMessage.error(error.response?.data?.message || 'Ошибка добавления чек-листа');
	}
};

const saveChecklist = async () => {
	emit('update');
};

const handleUploadSuccess = () => {
	ElMessage.success('Файл загружен');
	emit('update');
};

const deleteComment = async (commentId, event) => {
	event?.stopPropagation();
	try {
		await ElMessageBox.confirm(
			'Вы уверены, что хотите удалить этот комментарий?',
			'Подтверждение удаления',
			{
				confirmButtonText: 'Удалить',
				cancelButtonText: 'Отмена',
				type: 'warning'
			}
		);
		await api.delete(`/comments/${commentId}`);
		comments.value = comments.value.filter(c => c._id !== commentId);
		emit('update');
		ElMessage.success('Комментарий удален');
	} catch (error) {
		if (error !== 'cancel') {
			console.error('Error deleting comment:', error);
			ElMessage.error('Ошибка удаления комментария');
		}
	}
};

const removeCardMember = async (memberId, event) => {
	event?.stopPropagation();
	try {
		await ElMessageBox.confirm(
			'Вы уверены, что хотите удалить этого участника из карточки?',
			'Подтверждение удаления',
			{
				confirmButtonText: 'Удалить',
				cancelButtonText: 'Отмена',
				type: 'warning'
			}
		);
		const result = await cardComposable.removeMember(props.card._id, memberId);
		if (result.success) {
			emit('update');
		}
	} catch (error) {
		if (error !== 'cancel') {
			console.error('Error removing member:', error);
			ElMessage.error('Ошибка удаления участника');
		}
	}
};

// Получить доступных участников для добавления (участники доски, которых еще нет в карточке)
const availableMembers = computed(() => {
	if (!props.board) return [];
	
	const cardMemberIds = (props.card.members || []).map(m => 
		typeof m === 'string' ? m : m._id
	);
	
	const members = [];
	
	// Добавить владельца доски, если он не добавлен
	if (props.board.owner) {
		const ownerId = typeof props.board.owner === 'string' 
			? props.board.owner 
			: props.board.owner._id;
		
		if (!cardMemberIds.includes(ownerId)) {
			members.push({
				_id: ownerId,
				name: typeof props.board.owner === 'string' ? '' : props.board.owner.name,
				email: typeof props.board.owner === 'string' ? '' : props.board.owner.email,
				avatar: typeof props.board.owner === 'string' ? '' : props.board.owner.avatar
			});
		}
	}
	
	// Добавить участников доски
	if (props.board.members && Array.isArray(props.board.members)) {
		props.board.members.forEach(boardMember => {
			const userId = typeof boardMember.user === 'string' 
				? boardMember.user 
				: boardMember.user._id;
			
			if (!cardMemberIds.includes(userId)) {
				members.push({
					_id: userId,
					name: typeof boardMember.user === 'string' ? '' : boardMember.user.name,
					email: typeof boardMember.user === 'string' ? '' : boardMember.user.email,
					avatar: typeof boardMember.user === 'string' ? '' : boardMember.user.avatar
				});
			}
		});
	}
	
	return members;
});

// Добавить участника к карточке
const addCardMember = async (userId) => {
	try {
		const result = await cardComposable.addMember(props.card._id, userId);
		if (result.success) {
			showAddMember.value = false;
			emit('update');
		}
	} catch (error) {
		console.error('Error adding member:', error);
		ElMessage.error('Ошибка добавления участника');
	}
};

const formatTime = (date) => {
	return formatRelativeDate(date);
};

const formatFileSize = (bytes) => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

watch(() => editingDescription.value, (val) => {
	if (val) {
		nextTick(() => {
			descriptionInput.value?.focus();
		});
	}
});

watch(() => props.card, (newCard, oldCard) => {
	if (newCard && (!oldCard || newCard._id !== oldCard._id || 
		(!editingDescription.value && newCard.description !== description.value) ||
		(!editingTitle.value && newCard.title !== title.value))) {
		title.value = newCard.title || '';
		if (!editingDescription.value) {
			description.value = newCard.description || '';
		}
		dueDate.value = newCard.dueDate ? new Date(newCard.dueDate) : null;
		priority.value = newCard.priority || 'medium';
	}
}, {immediate: true});

watch(() => editingTitle.value, (val) => {
	if (val) {
		nextTick(() => {
			titleInput.value?.focus();
			titleInput.value?.select();
		});
	}
});

watch(() => visible.value, (val) => {
	if (val) {
		fetchComments();
	}
}, {immediate: true});
</script>

<template>
	<el-drawer
		v-model="visible"
		size="50%"
		@close="$emit('close')"
	>
		<template #header>
			<div class="card-title-header">
				<el-input
					v-if="editingTitle"
					v-model="title"
					@blur="saveTitle"
					@keyup.enter="saveTitle"
					@keyup.esc="editingTitle = false; title = card.title"
					ref="titleInput"
					class="title-input"
				/>
				<h2 v-else @click="editingTitle = true" class="card-title-editable">
					{{ card.title }}
					<el-icon class="edit-icon"><Edit /></el-icon>
				</h2>
			</div>
		</template>
		<div class="card-detail" v-loading="loading">
			<div class="card-description">
				<h3>Описание</h3>
				<div v-if="editingDescription" class="description-editing">
					<el-input
						v-model="description"
						type="textarea"
						:rows="4"
						@keyup.ctrl.enter="saveDescription"
						@keyup.esc="editingDescription = false; description = card.description || ''"
						ref="descriptionInput"
					/>
					<div class="description-actions">
						<el-button size="small" @click="editingDescription = false; description = card.description || ''">
							Отмена
						</el-button>
						<el-button type="primary" size="small" @click="saveDescription">
							Сохранить
						</el-button>
					</div>
				</div>
				<div v-else @click="editingDescription = true" class="description-placeholder">
					{{ card.description || 'Добавить описание...' }}
				</div>
			</div>

			<div class="card-section">
				<h3>Участники</h3>
				<div class="members-list">
					<div
						v-for="member in card.members"
						:key="member._id"
						class="member-item"
					>
						<el-avatar
							:src="member.avatar"
							:size="32"
						>
							{{ member.name?.charAt(0) }}
						</el-avatar>
						<span class="member-name">{{ member.name }}</span>
						<el-button
							text
							type="danger"
							size="small"
							class="member-remove"
							@click="removeCardMember(member._id, $event)"
						>
							<el-icon><Close /></el-icon>
						</el-button>
					</div>
					<el-button text @click="showAddMember = true">
						<el-icon>
							<Plus />
						</el-icon>
					</el-button>
				</div>
			</div>

			<div class="card-section">
				<h3>Метки</h3>
				<div class="labels-list">
					<el-tag
						v-for="label in board?.labels"
						:key="label._id"
						:type="card.labels?.includes(label._id) ? 'primary' : 'info'"
						@click="toggleLabel(label._id)"
						style="cursor: pointer; margin-right: 8px; margin-bottom: 8px;"
					>
						{{ label.name }}
					</el-tag>
				</div>
			</div>

			<div class="card-section">
				<h3>Срок выполнения</h3>
				<el-date-picker
					v-model="dueDate"
					type="datetime"
					placeholder="Выберите срок"
					@change="saveDueDate"
				/>
			</div>

			<div class="card-section">
				<h3>Приоритет</h3>
				<el-select v-model="priority" @change="savePriority" style="width: 100%">
					<el-option label="Низкий" value="low">
						<span style="color: #61bd4f;">● Низкий</span>
					</el-option>
					<el-option label="Средний" value="medium">
						<span style="color: #5e6c84;">● Средний</span>
					</el-option>
					<el-option label="Высокий" value="high">
						<span style="color: #f2d600;">● Высокий</span>
					</el-option>
					<el-option label="Критический" value="critical">
						<span style="color: #eb5a46;">● Критический</span>
					</el-option>
				</el-select>
			</div>

			<div class="card-section">
				<h3>Чек-листы</h3>
				<div v-for="checklist in card.checklists" :key="checklist._id" class="checklist">
					<h4>{{ checklist.title }}</h4>
					<el-checkbox
						v-for="item in checklist.items"
						:key="item._id"
						v-model="item.completed"
						@change="saveChecklist(checklist._id)"
					>
						{{ item.text }}
					</el-checkbox>
				</div>
				<el-button type="button" @click.prevent="addChecklist">Добавить чек-лист</el-button>
			</div>

			<div class="card-section">
				<h3>Вложения</h3>
				<div class="attachments-list" v-if="card.attachments && card.attachments.length > 0">
					<div
						v-for="attachment in card.attachments"
						:key="attachment._id"
						class="attachment-item"
					>
						<el-icon><Document /></el-icon>
						<a :href="attachment.url" target="_blank">{{ attachment.name }}</a>
						<span class="attachment-size" v-if="attachment.size">
							{{ formatFileSize(attachment.size) }}
						</span>
					</div>
				</div>
				<div v-else class="empty-attachments">
					<span>Нет вложений</span>
				</div>
				<el-upload
					:action="uploadUrl"
					:headers="uploadHeaders"
					:on-success="handleUploadSuccess"
				>
					<el-button>Загрузить файл</el-button>
				</el-upload>
			</div>

			<div class="card-section">
				<h3>Комментарии</h3>
				<div class="comments-list" v-if="comments.length > 0">
					<div
						v-for="comment in comments"
						:key="comment._id"
						class="comment-item"
					>
						<el-avatar :src="comment.author.avatar" :size="32">
							{{ comment.author.name?.charAt(0) }}
						</el-avatar>
						<div class="comment-content">
							<div class="comment-header">
								<strong>{{ comment.author.name }}</strong>
								<div class="comment-actions">
									<span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
									<el-button
										v-if="comment.author._id === authStore.user?.id"
										text
										type="danger"
										size="small"
										@click="deleteComment(comment._id, $event)"
									>
										<el-icon><Delete /></el-icon>
									</el-button>
								</div>
							</div>
							<p>{{ comment.text }}</p>
							<span v-if="comment.edited" class="comment-edited">(отредактировано)</span>
						</div>
					</div>
				</div>
				<div v-else class="empty-comments">
					<span>Нет комментариев. Будьте первым!</span>
				</div>
				<el-input
					v-model="newComment"
					type="textarea"
					:rows="3"
					placeholder="Добавить комментарий..."
					@keyup.ctrl.enter="addComment"
				/>
				<el-button type="primary" @click="addComment" style="margin-top: 8px;">
					Отправить
				</el-button>
			</div>
		</div>

		<!-- Диалог добавления участника -->
		<el-dialog
			v-model="showAddMember"
			title="Добавить участника"
			width="400px"
		>
			<div v-if="availableMembers.length > 0" class="available-members">
				<div
					v-for="member in availableMembers"
					:key="member._id"
					class="member-option"
					@click="addCardMember(member._id)"
				>
					<el-avatar :src="member.avatar" :size="32">
						{{ member.name?.charAt(0) }}
					</el-avatar>
					<div class="member-option-info">
						<div class="member-option-name">{{ member.name }}</div>
						<div class="member-option-email">{{ member.email }}</div>
					</div>
				</div>
			</div>
			<div v-else class="no-members">
				<span>Нет доступных участников для добавления</span>
			</div>
			<template #footer>
				<el-button @click="showAddMember = false">Закрыть</el-button>
			</template>
		</el-dialog>
	</el-drawer>
</template>

<style lang="scss" scoped>
.card-title-header {
	.title-input {
		font-size: 20px;
		font-weight: 600;
	}

	.card-title-editable {
		font-size: 20px;
		font-weight: 600;
		margin: 0;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: $spacing-xs;
		color: $text-primary;
		transition: color $transition-fast;

		&:hover {
			color: $primary-color;

			.edit-icon {
				opacity: 1;
			}
		}

		.edit-icon {
			opacity: 0;
			transition: opacity $transition-fast;
			font-size: 16px;
		}
	}
}

.card-detail {
	padding: $spacing-md;
}

.card-section {
	margin-bottom: $spacing-lg;

	h3 {
		font-size: 16px;
		font-weight: 600;
		margin-bottom: $spacing-md;
		color: $text-primary;
	}
}

.card-description {
	margin-bottom: $spacing-lg;

	.description-placeholder {
		padding: $spacing-sm;
		background: $bg-primary;
		border-radius: $border-radius;
		cursor: pointer;
		min-height: 60px;
		color: $text-secondary;
		white-space: pre-wrap;
		word-wrap: break-word;

		&:hover {
			background: darken($bg-primary, 5%);
		}
	}

	.description-editing {
		.description-actions {
			margin-top: $spacing-sm;
			display: flex;
			gap: $spacing-sm;
			justify-content: flex-end;
		}
	}
}

.members-list {
	display: flex;
	flex-wrap: wrap;
	gap: $spacing-sm;
	align-items: center;
}

.member-item {
	display: flex;
	align-items: center;
	gap: $spacing-xs;
	padding: $spacing-xs;
	border-radius: $border-radius;
	transition: background-color $transition-fast;

	&:hover {
		background-color: $bg-primary;

		.member-remove {
			opacity: 1;
		}
	}

	.member-name {
		font-size: 14px;
		color: $text-primary;
	}

	.member-remove {
		opacity: 0;
		transition: opacity $transition-fast;
	}
}

.labels-list {
	display: flex;
	flex-wrap: wrap;
	gap: $spacing-xs;
}

.checklist {
	margin-bottom: $spacing-md;

	h4 {
		font-size: 14px;
		margin-bottom: $spacing-sm;
	}
}

.attachments-list {
	margin-bottom: $spacing-md;
}

.attachment-item {
	display: flex;
	align-items: center;
	gap: $spacing-sm;
	padding: $spacing-sm;
	background: $bg-primary;
	border-radius: $border-radius;
	margin-bottom: $spacing-xs;
	transition: background-color $transition-fast;

	&:hover {
		background: darken($bg-primary, 3%);
	}

	a {
		flex: 1;
		color: $primary-color;
		text-decoration: none;
		font-weight: 500;

		&:hover {
			text-decoration: underline;
		}
	}

	.attachment-size {
		font-size: 12px;
		color: $text-secondary;
		margin-left: auto;
	}
}

.empty-attachments {
	padding: $spacing-md;
	text-align: center;
	color: $text-secondary;
	font-style: italic;
}

	.available-members {
		max-height: 400px;
		overflow-y: auto;
	}

	.member-option {
		display: flex;
		align-items: center;
		gap: $spacing-md;
		padding: $spacing-md;
		border-radius: $border-radius;
		cursor: pointer;
		transition: background $transition-fast;
		margin-bottom: $spacing-xs;

		&:hover {
			background: $bg-secondary;
		}

		.member-option-info {
			flex: 1;

			.member-option-name {
				font-weight: 500;
				color: $text-primary;
				margin-bottom: 2px;
			}

			.member-option-email {
				font-size: 12px;
				color: $text-secondary;
			}
		}
	}

	.no-members {
		padding: $spacing-lg;
		text-align: center;
		color: $text-secondary;
	}

	.comments-list {
		margin-bottom: $spacing-md;
	}

.comment-item {
	display: flex;
	gap: $spacing-md;
	margin-bottom: $spacing-md;
	padding-bottom: $spacing-md;
	border-bottom: 1px solid $border-color;

	.comment-content {
		flex: 1;

		.comment-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: $spacing-xs;
			font-size: 14px;

			.comment-actions {
				display: flex;
				align-items: center;
				gap: $spacing-xs;
			}

			.comment-time {
				color: $text-secondary;
				font-size: 12px;
			}
		}

		p {
			margin: 0;
			color: $text-primary;
		}

		.comment-edited {
			font-size: 11px;
			color: $text-secondary;
			font-style: italic;
		}
	}
}

.empty-comments {
	padding: $spacing-lg;
	text-align: center;
	color: $text-secondary;
	font-style: italic;
}
</style>
