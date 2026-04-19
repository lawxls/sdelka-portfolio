import { ListTodo, Package, Settings } from "lucide-react";

export const NAV_ITEMS = [
	{ path: "/procurement", label: "Закупки", icon: Package, placement: "top" },
	{ path: "/tasks", label: "Задачи", icon: ListTodo, placement: "top" },
	{ path: "/settings", label: "Настройки", icon: Settings, placement: "bottom" },
] as const;
