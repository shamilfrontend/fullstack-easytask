import {format, formatDistanceToNow, isPast, isToday, isTomorrow, parseISO} from 'date-fns';
import {ru} from 'date-fns/locale';

/**
 * Форматирует дату в читаемый формат
 * @param {string|Date} date - Дата для форматирования
 * @param {string} formatStr - Формат даты
 * @returns {string}
 */
export const formatDate = (date, formatStr = 'dd.MM.yyyy HH:mm') => {
	if (!date) return '';
	try {
		const dateObj = typeof date === 'string' ? parseISO(date) : date;
		return format(dateObj, formatStr, {locale: ru});
	} catch (error) {
		return '';
	}
};

/**
 * Форматирует дату в относительный формат (например, "2 часа назад")
 * @param {string|Date} date - Дата для форматирования
 * @returns {string}
 */
export const formatRelativeDate = (date) => {
	if (!date) return '';
	try {
		const dateObj = typeof date === 'string' ? parseISO(date) : date;
		return formatDistanceToNow(dateObj, {addSuffix: true, locale: ru});
	} catch (error) {
		return '';
	}
};

/**
 * Проверяет, является ли дата прошедшей
 * @param {string|Date} date - Дата для проверки
 * @returns {boolean}
 */
export const isDatePast = (date) => {
	if (!date) return false;
	try {
		const dateObj = typeof date === 'string' ? parseISO(date) : date;
		return isPast(dateObj);
	} catch (error) {
		return false;
	}
};

/**
 * Проверяет, является ли дата сегодняшней
 * @param {string|Date} date - Дата для проверки
 * @returns {boolean}
 */
export const isDateToday = (date) => {
	if (!date) return false;
	try {
		const dateObj = typeof date === 'string' ? parseISO(date) : date;
		return isToday(dateObj);
	} catch (error) {
		return false;
	}
};

/**
 * Проверяет, является ли дата завтрашней
 * @param {string|Date} date - Дата для проверки
 * @returns {boolean}
 */
export const isDateTomorrow = (date) => {
	if (!date) return false;
	try {
		const dateObj = typeof date === 'string' ? parseISO(date) : date;
		return isTomorrow(dateObj);
	} catch (error) {
		return false;
	}
};

/**
 * Возвращает статус даты выполнения
 * @param {string|Date} dueDate - Дата выполнения
 * @returns {object} - {status: 'overdue'|'today'|'tomorrow'|'upcoming', label: string}
 */
export const getDueDateStatus = (dueDate) => {
	if (!dueDate) return {status: null, label: ''};

	if (isDatePast(dueDate) && !isDateToday(dueDate)) {
		return {status: 'overdue', label: 'Просрочено'};
	}

	if (isDateToday(dueDate)) {
		return {status: 'today', label: 'Сегодня'};
	}

	if (isDateTomorrow(dueDate)) {
		return {status: 'tomorrow', label: 'Завтра'};
	}

	return {status: 'upcoming', label: formatDate(dueDate, 'dd.MM.yyyy')};
};

