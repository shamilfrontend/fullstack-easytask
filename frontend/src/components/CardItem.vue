<script setup>
import {computed} from 'vue';
import {Clock, Paperclip, List, ChatDotRound, User} from '@element-plus/icons-vue';
import {isDatePast, isDateToday} from '../utils/dateHelpers';

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

defineEmits(['click']);

const hasMeta = computed(() => {
	return props.card.dueDate ||
		(props.card.attachments && props.card.attachments.length > 0) ||
		(props.card.checklists && props.card.checklists.length > 0) ||
		(props.card.members && props.card.members.length > 0) ||
		(props.card.commentCount > 0);
});

const isOverdue = computed(() => {
	if (!props.card.dueDate) return false;
	return isDatePast(props.card.dueDate) && !isDateToday(props.card.dueDate);
});

const priorityClass = computed(() => {
	if (!props.card.priority || props.card.priority === 'medium') return '';
	return `priority-${props.card.priority}`;
});

const priorityLabel = computed(() => {
	const labels = {
		low: 'Низкий',
		high: 'Высокий',
		critical: 'Критический'
	};
	return labels[props.card.priority] || '';
});

const getLabelColor = (labelId) => {
	if (!props.board || !props.board.labels) return '#ccc';
	const label = props.board.labels.find(l => {
		// Handle both object IDs and string IDs
		const labelIdStr = typeof labelId === 'object' ? labelId.toString() : labelId;
		const lIdStr = typeof l._id === 'object' ? l._id.toString() : l._id;
		return lIdStr === labelIdStr;
	});
	return label?.color || '#ccc';
};
</script>

<template>
	<div class="card-item" @click="$emit('click')" :class="priorityClass">
		<div class="card-top">
			<div class="card-labels" v-if="card.labels && card.labels.length > 0">
			  <span
				  v-for="labelId in card.labels"
				  :key="labelId"
				  class="label"
				  :style="{ background: getLabelColor(labelId) }"
			  />
			</div>
			<div v-if="card.priority && card.priority !== 'medium'" class="priority-indicator" :class="card.priority">
				{{ priorityLabel }}
			</div>
		</div>

		<div class="card-title">{{ card.title }}</div>

		<div class="card-footer" v-if="hasMeta">
			<div class="card-meta">
				<div class="meta-left">
					<el-icon v-if="card.dueDate" class="due-date-icon" :class="{ overdue: isOverdue }">
						<Clock/>
					</el-icon>
					<el-icon v-if="card.attachments && card.attachments.length > 0" class="meta-icon">
						<Paperclip/>
					</el-icon>
					<el-icon v-if="card.checklists && card.checklists.length > 0" class="meta-icon">
						<List/>
					</el-icon>
				</div>
				<div class="meta-right">
					<div v-if="card.commentCount > 0" class="comment-count">
						<el-icon><ChatDotRound /></el-icon>
						<span>{{ card.commentCount }}</span>
					</div>
					<div v-if="card.members && card.members.length > 0" class="members-badges">
						<el-avatar
							v-for="(member, index) in card.members.slice(0, 3)"
							:key="member._id || member || index"
							:src="member?.avatar || (typeof member === 'object' ? member.avatar : null)"
							:size="20"
							:style="{ marginLeft: index > 0 ? '-8px' : '0', zIndex: 10 - index }"
							class="member-avatar"
						>
							{{ typeof member === 'object' && member.name ? member.name.charAt(0).toUpperCase() : '?' }}
						</el-avatar>
						<span v-if="card.members.length > 3" class="more-members">+{{ card.members.length - 3 }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.card-item {
	background: white;
	border-radius: $border-radius;
	padding: $spacing-sm $spacing-md;
	margin-bottom: $spacing-sm;
	cursor: pointer;
	box-shadow: $shadow-sm;
	transition: all $transition-normal;
	position: relative;
	animation: slideIn 0.2s ease-out;
	border-left: 3px solid transparent;

	&.priority-low {
		border-left-color: $success-color;
	}

	&.priority-high {
		border-left-color: $warning-color;
	}

	&.priority-critical {
		border-left-color: $danger-color;
	}

	&:hover {
		transform: translateY(-2px);
		box-shadow: $shadow-md;
		background: #fafbfc;
	}

	&:active {
		transform: translateY(0);
	}
}

.card-top {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-xs;
	gap: $spacing-xs;
}

.priority-indicator {
	font-size: 10px;
	padding: 2px 6px;
	border-radius: 3px;
	font-weight: 600;
	text-transform: uppercase;

	&.low {
		background: rgba($success-color, 0.1);
		color: darken($success-color, 10%);
	}

	&.high {
		background: rgba($warning-color, 0.1);
		color: darken($warning-color, 10%);
	}

	&.critical {
		background: rgba($danger-color, 0.1);
		color: darken($danger-color, 10%);
	}
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateX(-10px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

.card-labels {
	display: flex;
	gap: $spacing-xs;
	flex: 1;

	.label {
		height: 8px;
		min-width: 40px;
		border-radius: 4px;
		flex: 1;
		max-width: 60px;
	}
}

.card-title {
	font-size: 14px;
	color: $text-primary;
	margin-bottom: $spacing-xs;
	word-wrap: break-word;
}

.card-footer {
	margin-top: $spacing-xs;
}

.card-meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: $spacing-sm;
	font-size: 12px;
	color: $text-secondary;
	margin-top: $spacing-xs;

	.meta-left {
		display: flex;
		align-items: center;
		gap: $spacing-xs;
	}

	.meta-right {
		display: flex;
		align-items: center;
		gap: $spacing-sm;
		margin-left: auto;
	}

	.meta-icon {
		font-size: 14px;
	}

	.due-date-icon {
		font-size: 14px;

		&.overdue {
			color: $danger-color;
		}
	}

	.comment-count {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: $text-secondary;

		.el-icon {
			font-size: 14px;
		}
	}

	.members-badges {
		display: flex;
		align-items: center;
		gap: 0;
		position: relative;

		.member-avatar {
			border: 2px solid white;
			cursor: pointer;
			transition: transform $transition-fast;
			font-size: 10px;
			font-weight: 600;

			&:hover {
				transform: scale(1.15);
				z-index: 20 !important;
			}
		}

		.more-members {
			margin-left: 6px;
			font-size: 11px;
			color: $text-secondary;
			font-weight: 600;
			white-space: nowrap;
		}
	}
}
</style>
