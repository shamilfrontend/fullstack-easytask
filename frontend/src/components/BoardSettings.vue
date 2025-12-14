<script setup>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import api from '../services/api';

const props = defineProps({
	modelValue: Boolean,
	board: Object
});

const emit = defineEmits(['update:modelValue', 'update']);

const form = ref({
	title: '',
	description: '',
	visibility: 'private',
	background: '#0079bf'
});

const saving = ref(false);

watch(() => props.board, (board) => {
	if (board) {
		form.value = {
			title: board.title || '',
			description: board.description || '',
			visibility: board.visibility || 'private',
			background: board.background || '#0079bf'
		};
	}
}, {immediate: true});

const saveSettings = async () => {
	saving.value = true;
	try {
		await api.put(`/boards/${props.board._id}`, form.value);
		ElMessage.success('Настройки сохранены');
		emit('update');
		emit('update:modelValue', false);
	} catch (error) {
		ElMessage.error('Ошибка сохранения настроек');
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<el-dialog
		:model-value="modelValue"
		@update:model-value="$emit('update:modelValue', $event)"
		title="Настройки доски"
		width="600px"
	>
		<el-form :model="form" label-width="120px">
			<el-form-item label="Название">
				<el-input v-model="form.title"/>
			</el-form-item>
			<el-form-item label="Описание">
				<el-input v-model="form.description" type="textarea" :rows="3"/>
			</el-form-item>
			<el-form-item label="Видимость">
				<el-radio-group v-model="form.visibility">
					<el-radio label="private">Приватная</el-radio>
					<el-radio label="public">Публичная</el-radio>
				</el-radio-group>
			</el-form-item>
			<el-form-item label="Цвет фона">
				<el-color-picker v-model="form.background"/>
			</el-form-item>
		</el-form>
		<template #footer>
			<el-button @click="$emit('update:modelValue', false)">Отмена</el-button>
			<el-button type="primary" @click="saveSettings" :loading="saving">
				Сохранить
			</el-button>
		</template>
	</el-dialog>
</template>
