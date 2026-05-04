// biome-ignore lint/style/noRestrictedImports: useCountdown manages a 1Hz interval with dependencies
import { useEffect, useState } from "react";

/**
 * Counts down to a deadline timestamp (`Date.now()`-style ms), updated once
 * per second. Pass `null` to leave idle. The deadline-based API guarantees a
 * fresh value on every restart — two consecutive 429s with identical
 * `Retry-After` produce different `until` timestamps, so the effect re-runs
 * and the countdown actually restarts.
 */
export function useCountdown(until: number | null): number {
	const [remaining, setRemaining] = useState(() => secondsUntil(until));

	useEffect(() => {
		setRemaining(secondsUntil(until));
		if (!until) return;
		const id = window.setInterval(() => {
			const left = secondsUntil(until);
			setRemaining(left);
			if (left <= 0) window.clearInterval(id);
		}, 1000);
		return () => window.clearInterval(id);
	}, [until]);

	return remaining;
}

function secondsUntil(until: number | null): number {
	if (!until) return 0;
	return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}
