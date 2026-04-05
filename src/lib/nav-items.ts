import { Layers, ListTodo } from "lucide-react";

export const NAV_ITEMS = [
	{ path: "/procurement", label: "Закупки", icon: Layers },
	{ path: "/tasks", label: "Задачи", icon: ListTodo },
] as const;
