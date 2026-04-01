import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router";
import { Button } from "@/components/ui/button";
import { DESKTOP_QUERY } from "./folder-sidebar";
import { SettingsSidebar } from "./settings-sidebar";

export function SettingsLayout() {
	const [open, setOpen] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

	return (
		<div className="flex min-h-0 flex-1" data-testid="settings-layout">
			<SettingsSidebar open={open} onOpenChange={setOpen} />
			<div className="flex min-w-0 flex-1 flex-col overflow-auto">
				<div className="sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2 md:hidden">
					<Button variant="ghost" size="icon-sm" aria-label="Открыть меню настроек" onClick={() => setOpen(true)}>
						<Menu className="size-4" />
					</Button>
					<span className="text-sm font-medium">Настройки</span>
				</div>
				<Outlet />
			</div>
		</div>
	);
}
