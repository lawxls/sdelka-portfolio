import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMockIntersectionObserver, type ObserverRecord } from "@/test-intersection-observer";
import { useIntersectionObserver } from "./use-intersection-observer";

let observers: ObserverRecord[];

beforeEach(() => {
	observers = installMockIntersectionObserver();
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
		const target = document.createElement("div");

		const { result } = renderHook(() => useIntersectionObserver(callback));
		act(() => result.current(target));
		triggerIntersection(0, true);

		expect(callback).toHaveBeenCalledOnce();
	});

	it("does not call callback when sentinel is not intersecting", () => {
		const callback = vi.fn();
		const target = document.createElement("div");

		const { result } = renderHook(() => useIntersectionObserver(callback));
		act(() => result.current(target));
		triggerIntersection(0, false);

		expect(callback).not.toHaveBeenCalled();
	});

	it("observes the target element", () => {
		const target = document.createElement("div");

		const { result } = renderHook(() => useIntersectionObserver(vi.fn()));
		act(() => result.current(target));

		expect(observers[0].observe).toHaveBeenCalledWith(target);
	});

	it("disconnects observer on unmount", () => {
		const target = document.createElement("div");

		const { result, unmount } = renderHook(() => useIntersectionObserver(vi.fn()));
		act(() => result.current(target));
		unmount();

		expect(observers[0].disconnect).toHaveBeenCalled();
	});

	it("re-creates observer when root changes", () => {
		const target = document.createElement("div");
		const rootA = document.createElement("div");
		const rootB = document.createElement("div");

		const { result, rerender } = renderHook(
			({ root }: { root: Element }) => useIntersectionObserver(vi.fn(), { root }),
			{ initialProps: { root: rootA } },
		);
		act(() => result.current(target));

		expect(observers).toHaveLength(1);

		rerender({ root: rootB });

		expect(observers[0].disconnect).toHaveBeenCalled();
		expect(observers).toHaveLength(2);
		expect(observers[1].observe).toHaveBeenCalledWith(target);
	});

	it("does not observe when target is null", () => {
		renderHook(() => useIntersectionObserver(vi.fn()));

		expect(observers).toHaveLength(0);
	});

	it("re-observes when target element changes (sentinel remount)", () => {
		const callback = vi.fn();
		const targetA = document.createElement("div");
		const targetB = document.createElement("div");

		const { result } = renderHook(() => useIntersectionObserver(callback));

		act(() => result.current(targetA));
		expect(observers).toHaveLength(1);

		// Simulate sentinel unmount + remount with a new element
		act(() => result.current(null));
		expect(observers[0].disconnect).toHaveBeenCalled();

		act(() => result.current(targetB));
		expect(observers).toHaveLength(2);
		expect(observers[1].observe).toHaveBeenCalledWith(targetB);

		triggerIntersection(1, true);
		expect(callback).toHaveBeenCalledOnce();
	});
});
