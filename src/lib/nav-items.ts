import { ListTodo, Package, Settings } from "lucide-react";

export const NAV_ITEMS = [
	{ path: "/procurement", label: "Закупки", icon: Package },
	{ path: "/tasks", label: "Задачи", icon: ListTodo },
	{ path: "/settings", label: "Настройки", icon: Settings },
] as const;
