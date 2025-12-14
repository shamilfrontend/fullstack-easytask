<script setup>
import { ref } from 'vue';
import { MoreFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import api from '../services/api';

const props = defineProps({
	modelValue: Boolean,
	board: Object
});

const emit = defineEmits(['update:modelValue', 'update']);

const searchQuery = ref('');

const searchUsers = async (queryString, cb) => {
	if (!queryString || queryString.length < 2) {
		cb([]);
		return;
	}

	try {
		const response = await api.get('/users/search', {params: {q: queryString}});
		cb(response.data.users || []);
	} catch (error) {
		cb([]);
	}
};

const addMember = async (user) => {
	try {
		await api.post(`/boards/${props.board._id}/members`, {
			userId: user._id || user.id,
			memberRole: 'member'
		});
		ElMessage.success('Участник добавлен');
		searchQuery.value = '';
		emit('update');
	} catch (error) {
		ElMessage.error(error.response?.data?.message || 'Ошибка добавления участника');
	}
};

const handleMemberAction = async (command, member) => {
	if (command === 'remove') {
		try {
			const memberName = member.user?.name || 'участника';
			await ElMessageBox.confirm(
				`Вы уверены, что хотите удалить ${memberName} из доски?`,
				'Подтверждение удаления',
				{
					confirmButtonText: 'Удалить',
					cancelButtonText: 'Отмена',
					type: 'warning'
				}
			);
			await api.delete(`/boards/${props.board._id}/members/${member.user._id || member.user}`);
			ElMessage.success('Участник удален');
			emit('update');
		} catch (error) {
			if (error !== 'cancel') {
				ElMessage.error('Ошибка удаления участника');
			}
		}
	}
};

const getRoleName = (role) => {
	const roles = {
		owner: 'Владелец',
		admin: 'Администратор',
		member: 'Участник',
		viewer: 'Наблюдатель'
	};
	return roles[role] || role;
};
</script>

<template>
	<el-dialog
		:model-value="modelValue"
		@update:model-value="$emit('update:modelValue', $event)"
		title="Участники доски"
		width="600px"
	>
		<div class="members-section">
			<h3>Добавить участника</h3>
			<el-autocomplete
				v-model="searchQuery"
				:fetch-suggestions="searchUsers"
				placeholder="Поиск пользователей..."
				@select="addMember"
				style="width: 100%"
			>
				<template #default="{ item }">
					<div class="user-suggestion">
						<el-avatar :src="item.avatar" :size="24">
							{{ item.name?.charAt(0) }}
						</el-avatar>
						<span>{{ item.name }} ({{ item.email }})</span>
					</div>
				</template>
			</el-autocomplete>
		</div>

		<div class="members-list">
			<h3>Участники</h3>
			<div
				v-for="member in board.members"
				:key="member.user._id || member.user"
				class="member-item"
			>
				<el-avatar :src="member.user.avatar" :size="32">
					{{ member.user.name?.charAt(0) }}
				</el-avatar>
				<div class="member-info">
					<div class="member-name">{{ member.user.name }}</div>
					<div class="member-role">{{ getRoleName(member.role) }}</div>
				</div>
				<el-dropdown @command="(cmd) => handleMemberAction(cmd, member)">
					<el-icon class="member-menu">
						<MoreFilled/>
					</el-icon>
					<template #dropdown>
						<el-dropdown-menu>
							<el-dropdown-item command="change-role">Изменить роль</el-dropdown-item>
							<el-dropdown-item command="remove" divided>Удалить</el-dropdown-item>
						</el-dropdown-menu>
					</template>
				</el-dropdown>
			</div>
		</div>

		<template #footer>
			<el-button @click="$emit('update:modelValue', false)">Закрыть</el-button>
		</template>
	</el-dialog>
</template>

<style lang="scss" scoped>
.members-section {
	margin-bottom: $spacing-lg;

	h3 {
		font-size: 16px;
		margin-bottom: $spacing-md;
	}
}

.user-suggestion {
	display: flex;
	align-items: center;
	gap: $spacing-sm;
}

.members-list {
	h3 {
		font-size: 16px;
		margin-bottom: $spacing-md;
	}
}

.member-item {
	display: flex;
	align-items: center;
	gap: $spacing-md;
	padding: $spacing-sm;
	border-radius: $border-radius;
	transition: background-color $transition-fast;

	&:hover {
		background-color: $bg-primary;
	}

	.member-info {
		flex: 1;

		.member-name {
			font-weight: 500;
			color: $text-primary;
		}

		.member-role {
			font-size: 12px;
			color: $text-secondary;
		}
	}

	.member-menu {
		cursor: pointer;
		color: $text-secondary;

		&:hover {
			color: $text-primary;
		}
	}
}
</style>
