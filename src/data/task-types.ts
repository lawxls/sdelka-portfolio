import type { LucideIcon } from "lucide-react";
import { Archive, CheckCircle, CircleDot, Loader } from "lucide-react";

export type TaskStatus = "assigned" | "in_progress" | "completed" | "archived";

export const TASK_STATUSES: TaskStatus[] = ["assigned", "in_progress", "completed", "archived"];

export const ACTIVE_TASK_STATUSES: readonly TaskStatus[] = ["assigned", "in_progress"];

export const STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
	assigned: CircleDot,
	in_progress: Loader,
	completed: CheckCircle,
	archived: Archive,
};

/** Parent tender reference on a `Task`. Tasks attach to tenders, not to
 * individual positions — so a task carries the tender's slug, name, and the
 * owning company id used for filter/search. */
export interface TaskTender {
	id: string;
	name: string;
	companyId: string;
}

export interface TaskAssignee {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	avatarIcon: string;
}

export interface Attachment {
	id: string;
	fileName: string;
	fileSize: number;
	fileType: string;
	contentType: string;
	fileUrl: string;
	uploadedAt: string;
}

export interface SupplierQuestion {
	id: string;
	question: string;
	answer: string | null;
	supplierId: string;
	supplierName: string;
	askedAt: string;
}

export type TaskSortField = "created_at" | "deadline_at" | "question_count";

export interface TaskFilterParams {
	q?: string;
	tender?: string;
	company?: string;
	sort?: TaskSortField;
	dir?: "asc" | "desc";
}

export interface Task {
	id: string;
	name: string;
	status: TaskStatus;
	tender: TaskTender;
	assignee: TaskAssignee | null;
	createdAt: string;
	deadlineAt: string;
	description: string;
	questionCount: number;
	completedResponse: string | null;
	attachments: Attachment[];
	statusBeforeArchive: TaskStatus | null;
	supplierQuestions: SupplierQuestion[];
	updatedAt: string;
}
