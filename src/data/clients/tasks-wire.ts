import type {
	Attachment,
	SupplierQuestion,
	Task,
	TaskAssignee,
	TaskProcurementInquiry,
	TaskStatus,
} from "../task-types";

/** Wire ↔ SPA-shape mapper for tasks. The backend exposes the parent inquiry
 * under `inquiry` (its FK name); the SPA renames it to `procurementInquiry`. */

interface TaskInquiryWire {
	id: string;
	name: string;
	companyId: string;
}

interface TaskAssigneeWire {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	avatarIcon: string;
}

export interface TaskWire {
	id: string;
	name: string;
	status: TaskStatus;
	inquiry?: TaskInquiryWire | null;
	procurementInquiry?: TaskInquiryWire | null;
	assignee: TaskAssigneeWire | null;
	createdAt: string;
	deadlineAt: string;
	description: string;
	questionCount: number;
	completedResponse: string | null;
	attachments?: Attachment[];
	statusBeforeArchive: TaskStatus | null;
	supplierQuestions?: SupplierQuestion[];
	updatedAt: string;
}

function mapInquiry(wire: TaskInquiryWire | null | undefined): TaskProcurementInquiry {
	return {
		id: wire?.id ?? "",
		name: wire?.name ?? "",
		companyId: wire?.companyId ?? "",
	};
}

function mapAssignee(wire: TaskAssigneeWire | null): TaskAssignee | null {
	if (!wire) return null;
	return {
		id: wire.id,
		firstName: wire.firstName,
		lastName: wire.lastName,
		email: wire.email,
		avatarIcon: wire.avatarIcon,
	};
}

export function taskFromApi(wire: TaskWire): Task {
	return {
		id: wire.id,
		name: wire.name,
		status: wire.status,
		procurementInquiry: mapInquiry(wire.procurementInquiry ?? wire.inquiry),
		assignee: mapAssignee(wire.assignee),
		createdAt: wire.createdAt,
		deadlineAt: wire.deadlineAt,
		description: wire.description,
		questionCount: wire.questionCount,
		completedResponse: wire.completedResponse,
		attachments: wire.attachments ?? [],
		statusBeforeArchive: wire.statusBeforeArchive,
		supplierQuestions: wire.supplierQuestions ?? [],
		updatedAt: wire.updatedAt,
	};
}
