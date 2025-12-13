<script setup>
import {ref, reactive} from 'vue';
import {useRouter} from 'vue-router';
import {useAuthStore} from '../stores/auth';
import {ElMessage} from 'element-plus';

const router = useRouter();
const authStore = useAuthStore();

const formRef = ref(null);
const loading = ref(false);

const form = reactive({
	name: '',
	email: '',
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
	name: [
		{required: true, message: 'Введите имя', trigger: 'blur'}
	],
	email: [
		{required: true, message: 'Введите email', trigger: 'blur'},
		{type: 'email', message: 'Введите корректный email', trigger: 'blur'}
	],
	password: [
		{required: true, message: 'Введите пароль', trigger: 'blur'},
		{min: 6, message: 'Пароль должен быть не менее 6 символов', trigger: 'blur'}
	],
	confirmPassword: [
		{required: true, message: 'Подтвердите пароль', trigger: 'blur'},
		{validator: validateConfirmPassword, trigger: 'blur'}
	]
};

const handleRegister = async () => {
	if (!formRef.value) return;

	await formRef.value.validate(async (valid) => {
		if (valid) {
			loading.value = true;
			const result = await authStore.register(form.name, form.email, form.password);
			loading.value = false;

			if (result.success) {
				ElMessage.success('Регистрация выполнена успешно');
				router.push('/boards');
			} else {
				ElMessage.error(result.message);
			}
		}
	});
};
</script>

<template>
	<div class="auth-container">
		<div class="auth-card">
			<h1 class="auth-title">Регистрация</h1>

			<el-form
				ref="formRef"
				:model="form"
				:rules="rules"
				@submit.prevent="handleRegister"
			>
				<el-form-item prop="name">
					<el-input
						v-model="form.name"
						placeholder="Имя"
						size="large"
						prefix-icon="User"
					/>
				</el-form-item>

				<el-form-item prop="email">
					<el-input
						v-model="form.email"
						placeholder="Email"
						size="large"
						prefix-icon="Message"
					/>
				</el-form-item>

				<el-form-item prop="password">
					<el-input
						v-model="form.password"
						type="password"
						placeholder="Пароль"
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
						@keyup.enter="handleRegister"
					/>
				</el-form-item>

				<el-form-item>
					<el-button
						type="primary"
						size="large"
						:loading="loading"
						@click="handleRegister"
						style="width: 100%"
					>
						Зарегистрироваться
					</el-button>
				</el-form-item>
			</el-form>

			<div class="auth-links">
				<router-link to="/login">Уже есть аккаунт? Войти</router-link>
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

