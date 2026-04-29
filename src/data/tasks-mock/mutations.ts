import { createBlobUrl, delay, nextId } from "../mock-utils";
import type { Attachment, Task, TaskStatus } from "../task-types";
import { cloneTask, getTaskAt, requireTaskIdx, writeTaskAt } from "./store";

export async function changeTaskStatusMock(
	id: string,
	data: { status: TaskStatus; completedResponse?: string },
): Promise<Task> {
	await delay();
	const idx = requireTaskIdx(id);
	const current = getTaskAt(idx);
	const updated: Task = {
		...current,
		status: data.status,
		completedResponse: data.completedResponse ?? current.completedResponse,
		updatedAt: new Date().toISOString(),
	};
	if (data.status === "archived" && current.status !== "archived") {
		updated.statusBeforeArchive = current.status;
	}
	writeTaskAt(idx, updated);
	return cloneTask(updated);
}

function fileExtension(name: string): string {
	const lastDot = name.lastIndexOf(".");
	return lastDot === -1 ? "" : name.slice(lastDot + 1).toLowerCase();
}

export async function uploadTaskAttachmentsMock(id: string, files: File[]): Promise<Attachment[]> {
	await delay();
	const idx = requireTaskIdx(id);
	const created: Attachment[] = files.map((file) => ({
		id: nextId("att"),
		fileName: file.name,
		fileSize: file.size,
		fileType: fileExtension(file.name),
		contentType: file.type || "application/octet-stream",
		fileUrl: createBlobUrl(file),
		uploadedAt: new Date().toISOString(),
	}));
	const current = getTaskAt(idx);
	writeTaskAt(idx, {
		...current,
		attachments: [...current.attachments, ...created],
		updatedAt: new Date().toISOString(),
	});
	return created.map((a) => ({ ...a }));
}

export async function deleteTaskAttachmentMock(id: string, attachmentId: string): Promise<void> {
	await delay();
	const idx = requireTaskIdx(id);
	const current = getTaskAt(idx);
	writeTaskAt(idx, {
		...current,
		attachments: current.attachments.filter((a) => a.id !== attachmentId),
		updatedAt: new Date().toISOString(),
	});
}
