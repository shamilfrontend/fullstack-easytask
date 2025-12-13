<script setup>
import {ref, reactive} from 'vue';
import {useRouter} from 'vue-router';
import api from '../services/api';
import {ElMessage} from 'element-plus';

const router = useRouter();
const formRef = ref(null);
const loading = ref(false);

const form = reactive({
	email: ''
});

const rules = {
	email: [
		{required: true, message: 'Введите email', trigger: 'blur'},
		{type: 'email', message: 'Введите корректный email', trigger: 'blur'}
	]
};

const handleSubmit = async () => {
	if (!formRef.value) return;

	await formRef.value.validate(async (valid) => {
		if (valid) {
			loading.value = true;
			try {
				await api.post('/auth/forgot-password', {email: form.email});
				ElMessage.success('Ссылка для восстановления пароля отправлена на ваш email');
				router.push('/login');
			} catch (error) {
				ElMessage.error(error.response?.data?.message || 'Ошибка отправки email');
			} finally {
				loading.value = false;
			}
		}
	});
};
</script>

<template>
	<div class="auth-container">
		<div class="auth-card">
			<h1 class="auth-title">Восстановление пароля</h1>

			<el-form
				ref="formRef"
				:model="form"
				:rules="rules"
				@submit.prevent="handleSubmit"
			>
				<el-form-item prop="email">
					<el-input
						v-model="form.email"
						placeholder="Email"
						size="large"
						prefix-icon="Message"
						@keyup.enter="handleSubmit"
					/>
				</el-form-item>

				<el-form-item>
					<el-button
						type="primary"
						size="large"
						:loading="loading"
						@click="handleSubmit"
						style="width: 100%"
					>
						Отправить ссылку для восстановления
					</el-button>
				</el-form-item>
			</el-form>

			<div class="auth-links">
				<router-link to="/login">Вернуться к входу</router-link>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '../styles/variables.scss';

.auth-container {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: $spacing-md;
}

.auth-card {
	background: white;
	border-radius: $border-radius * 2;
	padding: $spacing-xl;
	width: 100%;
	max-width: 400px;
	box-shadow: $shadow-lg;
}

.auth-title {
	text-align: center;
	margin-bottom: $spacing-lg;
	color: $text-primary;
	font-size: 28px;
	font-weight: 600;
}

.auth-links {
	text-align: center;
	margin-top: $spacing-md;
	color: $text-secondary;
	font-size: 14px;

	a {
		color: $primary-color;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}
}
</style>

