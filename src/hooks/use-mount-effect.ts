// biome-ignore lint/style/noRestrictedImports: useMountEffect is the only allowed useEffect wrapper
import { useEffect } from "react";

/**
 * Runs a callback once on mount with optional cleanup.
 * This is the only sanctioned way to use useEffect in this codebase.
 *
 * Valid uses: DOM integration, third-party widget lifecycles, browser API subscriptions.
 * For everything else: derive state inline, use event handlers, or reset with key.
 */
export function useMountEffect(callback: () => undefined | (() => void)) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
	useEffect(callback, []);
}
