import { type Mock, vi } from "vitest";

export type ObserverRecord = {
	callback: IntersectionObserverCallback;
	options: IntersectionObserverInit | undefined;
	observe: Mock;
	disconnect: Mock;
};

export function installMockIntersectionObserver(): ObserverRecord[] {
	const observers: ObserverRecord[] = [];
	const MockObserver = function (
		this: ObserverRecord,
		callback: IntersectionObserverCallback,
		options?: IntersectionObserverInit,
	) {
		this.callback = callback;
		this.options = options;
		this.observe = vi.fn();
		this.disconnect = vi.fn();
		observers.push(this);
	} as unknown as typeof IntersectionObserver;
	vi.stubGlobal("IntersectionObserver", MockObserver);
	return observers;
}
