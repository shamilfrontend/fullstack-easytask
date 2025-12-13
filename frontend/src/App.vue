<script setup>
import {onMounted, computed} from 'vue';
import {useAuthStore} from './stores/auth';
import {useUIStore} from './stores/ui';

const authStore = useAuthStore();
const uiStore = useUIStore();

const themeClass = computed(() => {
	return authStore.user?.preferences?.theme || uiStore.theme;
});

onMounted(() => {
	uiStore.initTheme();
});
</script>

<template>
	<div id="app" :class="themeClass">
		<router-view/>
	</div>
</template>

<style lang="scss">
#app {
	min-height: 100vh;
	transition: background-color 0.3s, color 0.3s;
}

.light {
	background-color: #f4f5f7;
	color: #172b4d;
}

.dark {
	background-color: #1d2125;
	color: #b6c2cf;
}
</style>

