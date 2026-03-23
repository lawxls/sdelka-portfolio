import { useRef } from "react";
import { useMountEffect } from "./use-mount-effect";

export function useInlineEdit({
	onSave,
	onCancel,
	selectOnMount,
	deferFocus,
}: {
	onSave: (value: string) => void;
	onCancel: () => void;
	selectOnMount?: boolean;
	/** Defer focus so closing menus can restore focus first */
	deferFocus?: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const savedRef = useRef(false);
	// When deferring focus, block blur-to-save until focus has been stable.
	// Radix has multiple async focus-restoration mechanisms (DismissableLayer
	// + FocusScope) that fire at unpredictable times after menu close.
	// Instead of guessing a timeout, we reclaim focus on every spurious blur
	// until the user explicitly acts (Enter/Escape) or focus truly settles.
	const readyRef = useRef(!deferFocus);
	const readyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useMountEffect(() => {
		function focusInput() {
			inputRef.current?.focus();
			if (selectOnMount) inputRef.current?.select();
		}
		if (deferFocus) {
			const id = setTimeout(focusInput, 0);
			return () => {
				clearTimeout(id);
				clearTimeout(readyTimerRef.current);
			};
		}
		focusInput();
		return undefined;
	});

	function save() {
		if (savedRef.current || !readyRef.current) return;
		savedRef.current = true;
		const value = inputRef.current?.value.trim() ?? "";
		if (value) onSave(value);
		else onCancel();
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			readyRef.current = true;
			save();
		} else if (e.key === "Escape") {
			e.preventDefault();
			savedRef.current = true;
			onCancel();
		}
	}

	function handleBlur() {
		if (savedRef.current) return;
		clearTimeout(readyTimerRef.current);

		if (deferFocus && !readyRef.current) {
			// Focus was stolen before user could interact (Radix focus-restore).
			// Reclaim it, then wait for stability before enabling blur-to-save.
			setTimeout(() => {
				if (savedRef.current) return;
				if (!inputRef.current || !document.body.contains(inputRef.current)) return;
				inputRef.current.focus();
				if (selectOnMount && inputRef.current.value === (inputRef.current.defaultValue ?? "")) {
					inputRef.current.select();
				}
				readyTimerRef.current = setTimeout(() => {
					if (document.activeElement === inputRef.current) {
						readyRef.current = true;
					}
				}, 150);
			}, 0);
			return;
		}
		save();
	}

	return { inputRef, handleKeyDown, handleBlur };
}
