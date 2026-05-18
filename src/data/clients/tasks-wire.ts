import type {
	Attachment,
	SupplierQuestion,
	Task,
	TaskAssignee,
	TaskProcurementInquiry,
	TaskStatus,
} from "../task-types";

/**
 * Wire mapper for the tasks domain. The Django `TaskSerializer` exposes the
 * parent inquiry under `inquiry` (the FK name) — the SPA rewires it to
 * `procurementInquiry` so the type alignment with `ProcurementInquiry` is
 * obvious. Denormalised arrays (`supplierQuestions`, `attachments`) come
 * inline; the assignee carries only the fields the avatar cluster needs.
 */

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
	/** Wire-side field name: backend exposes the parent as `inquiry`. The SPA
	 * canonical shape is `procurementInquiry`. */
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

/** Translate a wire `Task` payload into the SPA-canonical `Task`. */
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
