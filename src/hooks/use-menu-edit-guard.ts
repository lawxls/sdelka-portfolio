import { useRef } from "react";

/**
 * Prevents Radix menu from restoring focus to the trigger
 * when an edit action (e.g. inline rename) needs the input focused instead.
 */
export function useMenuEditGuard() {
	const willEditRef = useRef(false);

	function onCloseAutoFocus(e: Event) {
		if (willEditRef.current) {
			e.preventDefault();
			willEditRef.current = false;
		}
	}

	return { willEditRef, onCloseAutoFocus };
}
