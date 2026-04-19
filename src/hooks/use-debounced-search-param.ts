import { useRef } from "react";
import { useSearchParams } from "react-router";
import { useMountEffect } from "@/hooks/use-mount-effect";

export function useDebouncedSearchParam(key: string, delayMs: number) {
	const [params, setParams] = useSearchParams();
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	const current = params.get(key) ?? "";

	function writeNow(value: string) {
		clearTimeout(debounceRef.current);
		setParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (value) next.set(key, value);
				else next.delete(key);
				return next;
			},
			{ replace: true },
		);
	}

	function setDebounced(value: string) {
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => writeNow(value), delayMs);
	}

	function clear() {
		writeNow("");
	}

	return { current, setDebounced, clear };
}
