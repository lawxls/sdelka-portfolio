import { useSyncExternalStore } from "react";

const MOBILE_MQ = "(max-width: 767px)";

const mql = typeof window !== "undefined" ? window.matchMedia(MOBILE_MQ) : null;

function subscribe(callback: () => void) {
	mql?.addEventListener("change", callback);
	return () => mql?.removeEventListener("change", callback);
}

function getSnapshot() {
	return mql?.matches ?? false;
}

function getServerSnapshot() {
	return false;
}

export function useIsMobile() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
