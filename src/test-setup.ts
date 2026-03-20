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
