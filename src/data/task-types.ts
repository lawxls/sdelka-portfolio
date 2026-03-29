export type TaskStatus = "assigned" | "in_progress" | "completed" | "archived";

export const TASK_STATUSES: TaskStatus[] = ["assigned", "in_progress", "completed", "archived"];

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
