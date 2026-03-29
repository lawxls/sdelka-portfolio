export type TaskStatus = "assigned" | "in_progress" | "completed" | "archived";

export const TASK_STATUSES: TaskStatus[] = ["assigned", "in_progress", "completed", "archived"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
	assigned: "Назначено",
	in_progress: "В работе",
	completed: "Завершено",
	archived: "Архив",
};

export interface TaskAssignee {
	name: string;
	initials: string;
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
