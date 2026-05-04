// biome-ignore lint/style/noRestrictedImports: useCountdown manages a 1Hz interval with dependencies
import { useEffect, useState } from "react";

/**
 * Counts down from `seconds` to 0 once per second. Pass a positive number to
 * (re)start the countdown; passing 0 leaves the hook idle. Used by the login
 * page to disable submit while the backend's `Retry-After` window is in
 * effect.
 */
export function useCountdown(seconds: number): number {
	const [remaining, setRemaining] = useState(seconds);

	useEffect(() => {
		setRemaining(seconds);
		if (seconds <= 0) return;
		const id = window.setInterval(() => {
			setRemaining((s) => {
				if (s <= 1) {
					window.clearInterval(id);
					return 0;
				}
				return s - 1;
			});
		}, 1000);
		return () => window.clearInterval(id);
	}, [seconds]);

	return remaining;
}
