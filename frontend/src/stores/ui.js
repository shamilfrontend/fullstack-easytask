import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUIStore = defineStore('ui', () => {
	const sidebarOpen = ref(false);
	const theme = ref(localStorage.getItem('theme') || 'light');
	const modals = ref({
		createBoard: false,
		boardSettings: false,
		boardMembers: false,
		cardDetail: false
	});

	const isDark = computed(() => theme.value === 'dark');

	const toggleSidebar = () => {
		sidebarOpen.value = !sidebarOpen.value;
	};

	const setSidebarOpen = (open) => {
		sidebarOpen.value = open;
	};

	const toggleTheme = () => {
		theme.value = theme.value === 'light' ? 'dark' : 'light';
		localStorage.setItem('theme', theme.value);
		document.documentElement.classList.toggle('dark', theme.value === 'dark');
	};

	const setTheme = (newTheme) => {
		theme.value = newTheme;
		localStorage.setItem('theme', newTheme);
		document.documentElement.classList.toggle('dark', newTheme === 'dark');
	};

	const openModal = (modalName) => {
		if (modals.value.hasOwnProperty(modalName)) {
			modals.value[modalName] = true;
		}
	};

	const closeModal = (modalName) => {
		if (modals.value.hasOwnProperty(modalName)) {
			modals.value[modalName] = false;
		}
	};

	const toggleModal = (modalName) => {
		if (modals.value.hasOwnProperty(modalName)) {
			modals.value[modalName] = !modals.value[modalName];
		}
	};

	const initTheme = () => {
		const savedTheme = localStorage.getItem('theme') || 'light';
		setTheme(savedTheme);
	};

	return {
		sidebarOpen,
		theme,
		isDark,
		modals,
		toggleSidebar,
		setSidebarOpen,
		toggleTheme,
		setTheme,
		openModal,
		closeModal,
		toggleModal,
		initTheme
	};
});
