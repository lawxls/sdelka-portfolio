import { Building2, Layers, LayoutDashboard, ListTodo } from "lucide-react";

export const NAV_ITEMS = [
	{ path: "/analytics", label: "Аналитика", icon: LayoutDashboard },
	{ path: "/procurement", label: "Закупки", icon: Layers },
	{ path: "/companies", label: "Компании", icon: Building2 },
	{ path: "/tasks", label: "Задачи", icon: ListTodo },
] as const;
