import { FileText, ListTodo, type LucideIcon, Package, Settings } from "lucide-react";
import type { PermissionModuleKey } from "@/data/types";

export const INQUIRIES_PATH = "/inquiries";
export const inquiryDetailPath = (slug: string) => `${INQUIRIES_PATH}/${slug}`;

/** Module key attached to an item gates it through `canView`. Items without
 * a module (e.g. the Настройки index) are always visible — the settings shell
 * itself isn't a permission module, only its workspace tabs are. */
export interface NavItem {
	path: string;
	label: string;
	icon: LucideIcon;
	placement: "top" | "bottom";
	activePrefix?: string;
	module?: PermissionModuleKey;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
	{ path: INQUIRIES_PATH, label: "Запросы", icon: FileText, placement: "top", module: "procurementInquiries" },
	{ path: "/positions", label: "Позиции", icon: Package, placement: "top", module: "positions" },
	{ path: "/tasks", label: "Вопросы", icon: ListTodo, placement: "top", module: "tasks" },
	{
		path: "/settings",
		label: "Настройки",
		icon: Settings,
		placement: "bottom",
		activePrefix: "/settings",
	},
];
