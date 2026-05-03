// biome-ignore lint/style/noRestrictedImports: useIntersectionObserver manages IntersectionObserver lifecycle with dependencies
import { useCallback, useEffect, useRef, useState } from "react";

interface Options extends IntersectionObserverInit {
	/** Observe relative to the closest scrolling ancestor instead of `root`.
	 * Required when ancestor `overflow:auto` clipping would otherwise shrink the
	 * intersection rect to zero before the sentinel reaches the viewport. */
	useClosestScrollRoot?: boolean;
}

function findClosestScrollRoot(element: Element): Element | null {
	let parent = element.parentElement;
	while (parent) {
		const overflowY = getComputedStyle(parent).overflowY;
		if (overflowY === "auto" || overflowY === "scroll") return parent;
		parent = parent.parentElement;
	}
	return null;
}

export function useIntersectionObserver(callback: () => void, options?: Options): (node: Element | null) => void {
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	const [target, setTarget] = useState<Element | null>(null);

	const explicitRoot = options?.root ?? null;
	const useClosestScrollRoot = options?.useClosestScrollRoot ?? false;
	const rootMargin = options?.rootMargin;
	const threshold = options?.threshold;

	useEffect(() => {
		if (!target) return;

		const root = useClosestScrollRoot ? findClosestScrollRoot(target) : explicitRoot;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						callbackRef.current();
					}
				}
			},
			{ root, rootMargin, threshold },
		);

		observer.observe(target);
		return () => observer.disconnect();
	}, [target, explicitRoot, useClosestScrollRoot, rootMargin, threshold]);

	return useCallback((node: Element | null) => {
		setTarget(node);
	}, []);
}
