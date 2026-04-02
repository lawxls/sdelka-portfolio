import { Layers, LayoutDashboard, ListTodo } from "lucide-react";

export const NAV_ITEMS = [
	{ path: "/analytics", label: "Аналитика", icon: LayoutDashboard },
	{ path: "/procurement", label: "Закупки", icon: Layers },
	{ path: "/tasks", label: "Задачи", icon: ListTodo },
] as const;
