import "@testing-library/jest-dom/vitest";

// Node 22 ships a built-in localStorage that lacks standard Web Storage API methods.
// Override it with a spec-compliant in-memory implementation for tests.
const store = new Map<string, string>();
const mockStorage: Storage = {
	getItem: (key: string) => store.get(key) ?? null,
	setItem: (key: string, value: string) => {
		store.set(key, String(value));
	},
	removeItem: (key: string) => {
		store.delete(key);
	},
	clear: () => {
		store.clear();
	},
	get length() {
		return store.size;
	},
	key: (index: number) => [...store.keys()][index] ?? null,
};

Object.defineProperty(globalThis, "localStorage", { value: mockStorage, writable: true });

// ResizeObserver mock — required by Radix Popper (DropdownMenu, Popover, etc.)
class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}
Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverMock, writable: true });

// IntersectionObserver mock — required by useIntersectionObserver hook
// Tests that need to trigger callbacks override this via vi.stubGlobal
globalThis.IntersectionObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof IntersectionObserver;

// matchMedia mock for responsive hooks (defaults to desktop: min-width 1024px matches)
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string): MediaQueryList => ({
		matches: query === "(min-width: 1024px)",
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	}),
});
