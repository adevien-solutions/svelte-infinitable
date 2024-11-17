import type {
	CustomFilterHeader,
	TableFilterHeader,
	TableHeader,
	TableSearchSettings,
	TextFilterHeader
} from './types.js';

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number) {
	let timeout: number | undefined;

	return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn.apply(this, args), delay);
	} as T;
}

export function isFilterHeader(header: TableHeader): header is TableFilterHeader {
	return (
		'filter' in header &&
		'type' in header.filter &&
		(header.filter.type === 'text' ||
			header.filter.type === 'multiSelect' ||
			header.filter.type === 'custom')
	);
}

export function searchSettingsToFilter(settings: TableSearchSettings | undefined, value: string) {
	const searchTerm = value.trim();
	if (!(settings && searchTerm) || settings.type === 'server') {
		return;
	}

	if ('onSearch' in settings) {
		return {
			type: 'custom',
			value: searchTerm,
			isDefault: searchTerm === '',
			onFilter: settings.onSearch,
			isDefaultValue: (value: unknown) => value === ''
		} satisfies CustomFilterHeader['filter'] & { isDefault: boolean };
	}

	return {
		type: 'text',
		property: settings.property,
		value: searchTerm,
		isDefault: searchTerm === '',
		settings: {
			caseSensitive: settings.caseSensitive
		}
	} satisfies TextFilterHeader['filter'] & { isDefault: boolean };
}

export function formatRelativeTime(date: Date): string {
	const diff = Date.now() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) {
		return 'just now';
	}

	if (minutes < 60) {
		return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
	}

	if (hours < 24) {
		return `${hours} hour${hours === 1 ? '' : 's'} ago`;
	}

	if (days < 7) {
		return `${days} day${days === 1 ? '' : 's'} ago`;
	}

	return date.toLocaleDateString();
}

export function createTickingRelativeTime(
	date: Date,
	tickRate: 'second' | 'minute' = 'minute'
): { value: string; cancel: () => void } {
	let value = $state(formatRelativeTime(date));
	const interval = setInterval(
		() => {
			value = formatRelativeTime(date);
		},
		tickRate === 'second' ? 1000 : 60000
	);
	return {
		value,
		cancel: () => clearInterval(interval)
	};
}
