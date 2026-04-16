const DEFAULT_DELAY = { min: 150, max: 400 };
const DEFAULT_PAGE_SIZE = 30;

let delayBounds = { ...DEFAULT_DELAY };
let idCounter = 0;

export function _setMockDelay(min: number, max: number): void {
	delayBounds = { min, max };
}

export function _resetMockDelay(): void {
	delayBounds = { ...DEFAULT_DELAY };
}

export function delay(): Promise<void> {
	const { min, max } = delayBounds;
	const ms = min + Math.floor(Math.random() * (max - min + 1));
	if (ms <= 0) return Promise.resolve();
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function _resetIdCounter(): void {
	idCounter = 0;
}

export function nextId(prefix = "id"): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

export interface PaginateParams<T> {
	items: T[];
	cursor?: string;
	limit?: number;
	getId: (item: T) => string;
}

export interface PaginateResult<T> {
	items: T[];
	nextCursor: string | null;
	hasMore: boolean;
}

export function paginate<T>({ items, cursor, limit = DEFAULT_PAGE_SIZE, getId }: PaginateParams<T>): PaginateResult<T> {
	const start = cursor
		? Math.max(
				0,
				items.findIndex((item) => getId(item) === cursor),
			)
		: 0;
	const end = start + limit;
	const slice = items.slice(start, end);
	const hasMore = end < items.length;
	const nextCursor = hasMore ? getId(items[end]) : null;
	return { items: slice, nextCursor, hasMore };
}

export function createBlobUrl(blob: Blob): string {
	return URL.createObjectURL(blob);
}

export function revokeBlobUrl(url: string): void {
	URL.revokeObjectURL(url);
}
