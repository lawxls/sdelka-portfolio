import { useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";

export function useDebouncedValue<T>(initial: T, delayMs: number) {
	const [value, setValue] = useState(initial);
	const [debounced, setDebounced] = useState(initial);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useMountEffect(() => () => clearTimeout(timerRef.current));

	function set(next: T) {
		setValue(next);
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => setDebounced(next), delayMs);
	}

	function flush(next: T) {
		clearTimeout(timerRef.current);
		setValue(next);
		setDebounced(next);
	}

	return { value, debounced, set, flush };
}
