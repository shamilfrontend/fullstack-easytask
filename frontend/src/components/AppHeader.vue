<script setup>
import { formatDistanceToNow } from 'date-fns';
import { ru} from 'date-fns/locale';
import { Bell, User, SwitchButton, ArrowDown, Delete } from '@element-plus/icons-vue';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';

import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const router = useRouter();
const authStore = useAuthStore();

const user = computed(() => authStore.user);
const showNotifications = ref(false);
const notifications = ref([]);
const notificationsLoading = ref(false);

const unreadCount = computed(() => {
	return notifications.value.filter(n => !n.read).length;
});

const fetchNotifications = async () => {
	notificationsLoading.value = true;
	try {
		const response = await api.get('/notifications');
		notifications.value = response.data.notifications;
	} catch (error) {
		console.error('Error fetching notifications:', error);
	} finally {
		notificationsLoading.value = false;
	}
};

const toggleNotifications = () => {
	showNotifications.value = !showNotifications.value;
	if (showNotifications.value) {
		fetchNotifications();
	}
};

const markAsRead = async (id) => {
	try {
		await api.put(`/notifications/${id}/read`);
		const notification = notifications.value.find(n => n._id === id);
		if (notification) {
			notification.read = true;
		}
	} catch (error) {
		console.error('Error marking notification as read:', error);
	}
};

const deleteNotification = async (id, event) => {
	event.stopPropagation(); // Prevent markAsRead from firing
	try {
		await ElMessageBox.confirm(
			'Вы уверены, что хотите удалить это уведомление?',
			'Подтверждение удаления',
			{
				confirmButtonText: 'Удалить',
				cancelButtonText: 'Отмена',
				type: 'warning'
			}
		);
		await api.delete(`/notifications/${id}`);
		notifications.value = notifications.value.filter(n => n._id !== id);
		ElMessage.success('Уведомление удалено');
	} catch (error) {
		if (error !== 'cancel') {
			console.error('Error deleting notification:', error);
			ElMessage.error('Ошибка удаления уведомления');
		}
	}
};

const formatTime = (date) => {
	return formatDistanceToNow(new Date(date), {addSuffix: true, locale: ru});
};

const handleCommand = (command) => {
	if (command === 'profile') {
		router.push('/profile');
	} else if (command === 'logout') {
		authStore.logout();
		router.push('/login');
	}
};

onMounted(() => {
	fetchNotifications();
	// Poll for new notifications every 30 seconds
	setInterval(fetchNotifications, 30000);
});
</script>

<template>
	<header class="app-header">
		<div class="header-content">
			<router-link to="/boards" class="logo">
				<h2>📋 EasyTask</h2>
			</router-link>

			<div class="header-actions">
				<el-button
					text
					@click="toggleNotifications"
					:badge="unreadCount > 0 ? unreadCount : undefined"
				>
					<el-icon>
						<Bell/>
					</el-icon>
				</el-button>

				<el-dropdown @command="handleCommand">
          <span class="user-menu">
            <el-avatar :src="user?.avatar" :size="32">
              {{ user?.name?.charAt(0) }}
            </el-avatar>
            <span class="user-name">{{ user?.name }}</span>
            <el-icon>
				<ArrowDown/>
			</el-icon>
          </span>
					<template #dropdown>
						<el-dropdown-menu>
							<el-dropdown-item command="profile">
								<el-icon>
									<User/>
								</el-icon>
								Профиль
							</el-dropdown-item>
							<el-dropdown-item divided command="logout">
								<el-icon>
									<SwitchButton/>
								</el-icon>
								Выйти
							</el-dropdown-item>
						</el-dropdown-menu>
					</template>
				</el-dropdown>
			</div>
		</div>

		<!-- Notifications Drawer -->
		<el-drawer
			v-model="showNotifications"
			title="Уведомления"
			size="400px"
		>
			<div class="notifications-list" v-loading="notificationsLoading">
				<div
					v-for="notification in notifications"
					:key="notification._id"
					class="notification-item"
					:class="{ unread: !notification.read }"
				>
					<div class="notification-content" @click="markAsRead(notification._id)">
						<h4>{{ notification.title }}</h4>
						<p>{{ notification.message }}</p>
						<span class="notification-time">
              {{ formatTime(notification.createdAt) }}
            </span>
					</div>
					<el-button
						text
						type="danger"
						class="notification-delete"
						@click="deleteNotification(notification._id, $event)"
					>
						<el-icon><Delete /></el-icon>
					</el-button>
				</div>
				<el-empty v-if="!notificationsLoading && notifications.length === 0" description="Нет уведомлений"/>
			</div>
		</el-drawer>
	</header>
</template>

<style lang="scss" scoped>
.app-header {
	background: white;
	box-shadow: $shadow-sm;
	position: sticky;
	top: 0;
	z-index: 1000;
}

.header-content {
	max-width: 1200px;
	margin: 0 auto;
	padding: $spacing-md $spacing-lg;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.logo {
	text-decoration: none;
	color: $text-primary;

	h2 {
		margin: 0;
		font-size: 24px;
	}
}

.header-actions {
	display: flex;
	align-items: center;
	gap: $spacing-md;
}

.user-menu {
	display: flex;
	align-items: center;
	gap: $spacing-sm;
	cursor: pointer;
	padding: $spacing-xs;

	.user-name {
		font-weight: 500;
	}
}

.notifications-list {
	padding: $spacing-md;
}

.notification-item {
	padding: $spacing-md;
	border-bottom: 1px solid $border-color;
	transition: background-color $transition-fast;
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: $spacing-sm;

	&:hover {
		background-color: $bg-primary;
	}

	&.unread {
		background-color: #e3f2fd;
		font-weight: 500;
	}

	.notification-content {
		flex: 1;
		cursor: pointer;

		h4 {
			margin: 0 0 $spacing-xs 0;
			font-size: 14px;
			font-weight: 600;
		}

		p {
			margin: 0 0 $spacing-xs 0;
			font-size: 13px;
			color: $text-secondary;
		}

		.notification-time {
			font-size: 12px;
			color: $text-secondary;
		}
	}

	.notification-delete {
		opacity: 0;
		transition: opacity $transition-fast;
	}

	&:hover .notification-delete {
		opacity: 1;
	}
}
</style>
