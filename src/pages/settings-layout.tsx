import { useState } from "react";
import { Outlet } from "react-router";
import { DESKTOP_QUERY } from "@/components/folder-sidebar";
import { SettingsSidebar } from "@/components/settings-sidebar";
import { useMountEffect } from "@/hooks/use-mount-effect";

const LS_SETTINGS_SIDEBAR_KEY = "settings-sidebar-open";

function useSettingsSidebarState() {
	const [open, setOpen] = useState(() => {
		const stored = localStorage.getItem(LS_SETTINGS_SIDEBAR_KEY);
		if (stored !== null) return stored === "true";
		return window.matchMedia(DESKTOP_QUERY).matches;
	});

	function handleOpenChange(next: boolean) {
		if (window.matchMedia(DESKTOP_QUERY).matches) {
			localStorage.setItem(LS_SETTINGS_SIDEBAR_KEY, String(next));
		}
		setOpen(next);
	}

	return { open, handleOpenChange };
}

export function SettingsLayout() {
	const { open, handleOpenChange } = useSettingsSidebarState();

	useMountEffect(() => {
		const mql = window.matchMedia(DESKTOP_QUERY);
		const handler = (e: MediaQueryListEvent) => {
			if (e.matches) {
				const stored = localStorage.getItem(LS_SETTINGS_SIDEBAR_KEY);
				handleOpenChange(stored !== "false");
			} else {
				handleOpenChange(false);
			}
		};
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	});

	return (
		<div className="flex h-full min-h-0 flex-1" data-testid="settings-layout">
			<SettingsSidebar open={open} onOpenChange={handleOpenChange} />
			<main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
				<Outlet />
			</main>
		</div>
	);
}
