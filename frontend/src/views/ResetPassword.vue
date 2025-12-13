<script setup>
import {ref, reactive} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import api from '../services/api';
import {ElMessage} from 'element-plus';

const route = useRoute();
const router = useRouter();
const formRef = ref(null);
const loading = ref(false);

const form = reactive({
	password: '',
	confirmPassword: ''
});

const validateConfirmPassword = (rule, value, callback) => {
	if (value !== form.password) {
		callback(new Error('Пароли не совпадают'));
	} else {
		callback();
	}
};

const rules = {
	password: [
		{required: true, message: 'Введите пароль', trigger: 'blur'},
		{min: 6, message: 'Пароль должен быть не менее 6 символов', trigger: 'blur'}
	],
	confirmPassword: [
		{required: true, message: 'Подтвердите пароль', trigger: 'blur'},
		{validator: validateConfirmPassword, trigger: 'blur'}
	]
};

const handleSubmit = async () => {
	if (!formRef.value) return;

	await formRef.value.validate(async (valid) => {
		if (valid) {
			loading.value = true;
			try {
				await api.put(`/auth/reset-password/${route.params.token}`, {
					password: form.password
				});
				ElMessage.success('Пароль успешно изменен');
				router.push('/login');
			} catch (error) {
				ElMessage.error(error.response?.data?.message || 'Ошибка сброса пароля');
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
			<h1 class="auth-title">Сброс пароля</h1>

			<el-form
				ref="formRef"
				:model="form"
				:rules="rules"
				@submit.prevent="handleSubmit"
			>
				<el-form-item prop="password">
					<el-input
						v-model="form.password"
						type="password"
						placeholder="Новый пароль"
						size="large"
						prefix-icon="Lock"
						show-password
					/>
				</el-form-item>

				<el-form-item prop="confirmPassword">
					<el-input
						v-model="form.confirmPassword"
						type="password"
						placeholder="Подтвердите пароль"
						size="large"
						prefix-icon="Lock"
						show-password
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
						Сбросить пароль
					</el-button>
				</el-form-item>
			</el-form>
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
</style>

