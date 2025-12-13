<script setup>
import {Setting, User} from '@element-plus/icons-vue';

const props = defineProps({
	board: {
		type: Object,
		required: true
	},
	canEdit: {
		type: Boolean,
		default: false
	}
});

const emit = defineEmits(['settings', 'members']);
</script>

<template>
	<div class="board-toolbar">
		<h1 class="board-title">{{ board.title }}</h1>
		<div class="toolbar-actions" v-if="canEdit">
			<el-button @click="$emit('settings')">
				<el-icon>
					<Setting/>
				</el-icon>
				Настройки
			</el-button>
			<el-button @click="$emit('members')">
				<el-icon>
					<User/>
				</el-icon>
				Участники
			</el-button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.board-toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: $spacing-md $spacing-lg;
	background: rgba(255, 255, 255, 0.1);
	backdrop-filter: blur(10px);
	border-radius: $border-radius;
	margin-bottom: $spacing-md;

	.board-title {
		font-size: 24px;
		font-weight: 600;
		color: white;
		margin: 0;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.toolbar-actions {
		display: flex;
		gap: $spacing-sm;
	}
}

@media (max-width: 768px) {
	.board-toolbar {
		flex-direction: column;
		align-items: flex-start;
		gap: $spacing-md;

		.board-title {
			font-size: 20px;
		}

		.toolbar-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
}
</style>

