/** Small stand-ins for the lodash functions the table used, so the shared package needn't carry it */

export const clone = <T>(value: T): T =>
	(Array.isArray(value) ? [...value] : value && typeof value === 'object' ? { ...value } : value) as T;

export function pick<T extends object>(object: T, keys: string[]): Partial<T> {
	return Object.fromEntries(Object.entries(object).filter(([key]) => keys.includes(key))) as Partial<T>;
}

/** Calls at most once per `wait`, and once more at the end with the last arguments */
export function throttle<A extends unknown[]>(run: (...args: A) => void, wait: number) {
	let last = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let pending: A | null = null;
	return (...args: A) => {
		const now = Date.now();
		if (now - last >= wait) {
			last = now;
			run(...args);
			return;
		}
		pending = args;
		timer ??= setTimeout(() => {
			timer = undefined;
			last = Date.now();
			if (pending) run(...pending);
			pending = null;
		}, wait - (now - last));
	};
}
