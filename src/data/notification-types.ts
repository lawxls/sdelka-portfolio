import type { LucideIcon } from "lucide-react";
import { CheckCircle2, ClipboardList, Clock, FileText, Search } from "lucide-react";

type NotificationType =
	| "search_completed"
	| "task_assigned"
	| "offer_received"
	| "task_deadline_24h"
	| "negotiation_completed";

interface BaseNotification {
	id: string;
	createdAt: string;
}

export interface SearchCompletedNotification extends BaseNotification {
	type: "search_completed";
	itemId: string;
}

export interface TaskAssignedNotification extends BaseNotification {
	type: "task_assigned";
	taskId: string;
}

export interface OfferReceivedNotification extends BaseNotification {
	type: "offer_received";
	itemId: string;
	supplierId: string;
}

export interface TaskDeadlineNotification extends BaseNotification {
	type: "task_deadline_24h";
	taskId: string;
}

export interface NegotiationCompletedNotification extends BaseNotification {
	type: "negotiation_completed";
	itemId: string;
}

export type Notification =
	| SearchCompletedNotification
	| TaskAssignedNotification
	| OfferReceivedNotification
	| TaskDeadlineNotification
	| NegotiationCompletedNotification;

export const NOTIFICATION_TITLES: Record<NotificationType, string> = {
	search_completed: "Поиск поставщиков завершён",
	task_assigned: "Назначена новая задача",
	offer_received: "Получено новое предложение",
	task_deadline_24h: "Дедлайн задачи подходит к концу",
	negotiation_completed: "Переговоры завершены",
};

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
	search_completed: Search,
	task_assigned: ClipboardList,
	offer_received: FileText,
	task_deadline_24h: Clock,
	negotiation_completed: CheckCircle2,
};
