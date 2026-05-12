import { FileText, ListTodo, Package, Settings } from "lucide-react";

export const INQUIRIES_PATH = "/inquiries";
export const inquiryDetailPath = (slug: string) => `${INQUIRIES_PATH}/${slug}`;

export const NAV_ITEMS = [
	{ path: INQUIRIES_PATH, label: "Запросы", icon: FileText, placement: "top" },
	{ path: "/positions", label: "Позиции", icon: Package, placement: "top" },
	{ path: "/tasks", label: "Вопросы", icon: ListTodo, placement: "top" },
	{
		path: "/settings",
		label: "Настройки",
		icon: Settings,
		placement: "bottom",
		activePrefix: "/settings",
	},
] as const;
