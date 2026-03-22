// biome-ignore lint/style/noRestrictedImports: useIntersectionObserver manages IntersectionObserver lifecycle with dependencies
import { type RefObject, useEffect, useRef } from "react";

export function useIntersectionObserver(
	targetRef: RefObject<Element | null>,
	callback: () => void,
	options?: IntersectionObserverInit,
): void {
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	const root = options?.root ?? null;
	const rootMargin = options?.rootMargin;
	const threshold = options?.threshold;

	// biome-ignore lint/correctness/useExhaustiveDependencies: callbackRef is a stable ref, targetRef identity is stable
	useEffect(() => {
		const target = targetRef.current;
		if (!target) return;

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
	}, [root, rootMargin, threshold]);
}
