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
	/** Defer focus by one tick so closing menus can restore focus first */
	deferFocus?: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const savedRef = useRef(false);

	useMountEffect(() => {
		function focusInput() {
			inputRef.current?.focus();
			if (selectOnMount) inputRef.current?.select();
		}
		if (deferFocus) {
			const id = setTimeout(focusInput, 0);
			return () => clearTimeout(id);
		}
		focusInput();
		return undefined;
	});

	function save() {
		if (savedRef.current) return;
		savedRef.current = true;
		const value = inputRef.current?.value.trim() ?? "";
		if (value) onSave(value);
		else onCancel();
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			save();
		} else if (e.key === "Escape") {
			e.preventDefault();
			savedRef.current = true;
			onCancel();
		}
	}

	return { inputRef, handleKeyDown, handleBlur: save };
}
