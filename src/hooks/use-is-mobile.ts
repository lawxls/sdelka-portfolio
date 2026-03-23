import { useSyncExternalStore } from "react";

const MOBILE_MQ = "(max-width: 767px)";

function subscribe(callback: () => void) {
	const mql = window.matchMedia(MOBILE_MQ);
	mql.addEventListener("change", callback);
	return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
	return window.matchMedia(MOBILE_MQ).matches;
}

function getServerSnapshot() {
	return false;
}

export function useIsMobile() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
