import { FileText, ListTodo, Package, Settings } from "lucide-react";

export const NAV_ITEMS = [
	{ path: "/tenders", label: "Тендеры", icon: FileText, placement: "top" },
	{ path: "/positions", label: "Позиции", icon: Package, placement: "top" },
	{ path: "/tasks", label: "Задачи", icon: ListTodo, placement: "top" },
	{ path: "/settings", label: "Настройки", icon: Settings, placement: "bottom" },
] as const;
