import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useIntersectionObserver } from "./use-intersection-observer";

type ObserverRecord = {
	callback: IntersectionObserverCallback;
	options: IntersectionObserverInit | undefined;
	observe: Mock;
	disconnect: Mock;
};

let observers: ObserverRecord[];

beforeEach(() => {
	observers = [];
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
});

afterEach(() => {
	vi.restoreAllMocks();
});

function triggerIntersection(index: number, isIntersecting: boolean) {
	observers[index].callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
}

describe("useIntersectionObserver", () => {
	it("calls callback when sentinel becomes visible", () => {
		const callback = vi.fn();
		const targetRef = { current: document.createElement("div") };

		renderHook(() => useIntersectionObserver(targetRef, callback));
		triggerIntersection(0, true);

		expect(callback).toHaveBeenCalledOnce();
	});

	it("does not call callback when sentinel is not intersecting", () => {
		const callback = vi.fn();
		const targetRef = { current: document.createElement("div") };

		renderHook(() => useIntersectionObserver(targetRef, callback));
		triggerIntersection(0, false);

		expect(callback).not.toHaveBeenCalled();
	});

	it("observes the target element", () => {
		const target = document.createElement("div");
		const targetRef = { current: target };

		renderHook(() => useIntersectionObserver(targetRef, vi.fn()));

		expect(observers[0].observe).toHaveBeenCalledWith(target);
	});

	it("disconnects observer on unmount", () => {
		const targetRef = { current: document.createElement("div") };

		const { unmount } = renderHook(() => useIntersectionObserver(targetRef, vi.fn()));
		unmount();

		expect(observers[0].disconnect).toHaveBeenCalled();
	});

	it("re-creates observer when root changes", () => {
		const targetRef = { current: document.createElement("div") };
		const rootA = document.createElement("div");
		const rootB = document.createElement("div");

		const { rerender } = renderHook(
			({ root }: { root: Element }) => useIntersectionObserver(targetRef, vi.fn(), { root }),
			{ initialProps: { root: rootA } },
		);

		expect(observers).toHaveLength(1);

		rerender({ root: rootB });

		expect(observers[0].disconnect).toHaveBeenCalled();
		expect(observers).toHaveLength(2);
		expect(observers[1].observe).toHaveBeenCalledWith(targetRef.current);
	});

	it("does not observe when target ref is null", () => {
		const targetRef = { current: null };

		renderHook(() => useIntersectionObserver(targetRef, vi.fn()));

		expect(observers).toHaveLength(0);
	});
});
