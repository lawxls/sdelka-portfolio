import type { LucideIcon } from "lucide-react";
import { Archive, CheckCircle, CircleDot, Loader } from "lucide-react";

export type TaskStatus = "assigned" | "in_progress" | "completed" | "archived";

export const TASK_STATUSES: TaskStatus[] = ["assigned", "in_progress", "completed", "archived"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
	assigned: "Назначено",
	in_progress: "В работе",
	completed: "Завершено",
	archived: "Архив",
};

export const STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
	assigned: CircleDot,
	in_progress: Loader,
	completed: CheckCircle,
	archived: Archive,
};

export interface TaskAssignee {
	name: string;
	initials: string;
	avatar_icon: string;
}

export type TaskSortField = "createdAt" | "deadline" | "questionCount";

export interface TaskFilterParams {
	q?: string;
	item?: string;
	sort?: TaskSortField;
	dir?: "asc" | "desc";
}

export interface Task {
	id: string;
	title: string;
	procurementItemName: string;
	status: TaskStatus;
	createdAt: string;
	deadline: string;
	assignee: TaskAssignee;
	description: string;
	questionCount: number;
	answer: string | null;
	attachments: string[];
}
