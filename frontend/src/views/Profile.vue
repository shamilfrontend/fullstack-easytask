<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

import { useAuthStore } from '../stores/auth';
import AppHeader from '../components/AppHeader.vue';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const saving = ref(false);

const form = ref({
	name: '',
	preferences: {
		theme: 'light'
	}
});

const uploadUrl = computed(() => '/api/users/avatar');
const uploadHeaders = computed(() => ({
	Authorization: `Bearer ${authStore.token}`
}));

onMounted(() => {
	if (user.value) {
		form.value = {
			name: user.value.name || '',
			preferences: {
				theme: user.value.preferences?.theme || 'light'
			}
		};
	}
});

const saveProfile = async () => {
	saving.value = true;
	try {
		await authStore.updateProfile(form.value);
		ElMessage.success('Профиль обновлен');
	} catch (error) {
		ElMessage.error('Ошибка обновления профиля');
	} finally {
		saving.value = false;
	}
};

const handleAvatarSuccess = () => {
	ElMessage.success('Фото обновлено');
	authStore.init();
};
</script>

<template>
	<div class="profile-page">
		<AppHeader/>

		<div class="profile-container">
			<h1>Профиль</h1>

			<el-card class="profile-card">
				<div class="profile-header">
					<el-avatar :src="user?.avatar" :size="100">
						{{ user?.name?.charAt(0) }}
					</el-avatar>
					<el-upload
						:action="uploadUrl"
						:headers="uploadHeaders"
						:on-success="handleAvatarSuccess"
						:show-file-list="false"
					>
						<el-button>Изменить фото</el-button>
					</el-upload>
				</div>

				<el-form :model="form" label-position="top" style="max-width: 600px;">
					<el-form-item label="Имя">
						<el-input v-model="form.name"/>
					</el-form-item>
					<el-form-item label="Email">
						<el-input v-model="user.email" disabled/>
					</el-form-item>
					<el-form-item label="Тема">
						<el-radio-group v-model="form.preferences.theme">
							<el-radio label="light">Светлая</el-radio>
							<el-radio label="dark">Темная</el-radio>
						</el-radio-group>
					</el-form-item>
					<el-form-item>
						<el-button type="primary" @click="saveProfile" :loading="saving">
							Сохранить
						</el-button>
					</el-form-item>
				</el-form>
			</el-card>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.profile-page {
	min-height: 100vh;
}

.profile-container {
	max-width: 1200px;
	margin: 0 auto;
	padding: $spacing-lg;
}

.profile-card {
	margin-top: $spacing-lg;
}

.profile-header {
	display: flex;
	align-items: center;
	gap: $spacing-lg;
	margin-bottom: $spacing-xl;
}
</style>
