// biome-ignore lint/style/noRestrictedImports: useIntersectionObserver manages IntersectionObserver lifecycle with dependencies
import { useCallback, useEffect, useRef, useState } from "react";

export function useIntersectionObserver(
	callback: () => void,
	options?: IntersectionObserverInit,
): (node: Element | null) => void {
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	const [target, setTarget] = useState<Element | null>(null);

	const root = options?.root ?? null;
	const rootMargin = options?.rootMargin;
	const threshold = options?.threshold;

	useEffect(() => {
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
	}, [target, root, rootMargin, threshold]);

	return useCallback((node: Element | null) => {
		setTarget(node);
	}, []);
}
