import { describe, expect, it } from "vitest";
import { type TaskWire, taskFromApi } from "./tasks-wire";

function wire(overrides: Partial<TaskWire> = {}): TaskWire {
	return {
		id: "t-1",
		name: "Согласовать",
		status: "assigned",
		inquiry: { id: "T-001", name: "Запрос", companyId: "company-1" },
		assignee: { id: "u-1", firstName: "Иван", lastName: "Иванов", email: "i@ex.ru", avatarIcon: "blue" },
		createdAt: "2026-03-01T10:00:00Z",
		deadlineAt: "2026-04-01T18:00:00Z",
		description: "",
		questionCount: 0,
		completedResponse: null,
		statusBeforeArchive: null,
		updatedAt: "2026-03-01T10:00:00Z",
		...overrides,
	};
}

describe("taskFromApi", () => {
	it("renames inquiry → procurementInquiry", () => {
		const task = taskFromApi(wire({ inquiry: { id: "T-1", name: "Кабель", companyId: "c-1" } }));
		expect(task.procurementInquiry).toEqual({ id: "T-1", name: "Кабель", companyId: "c-1" });
	});

	it("prefers procurementInquiry when both shapes ship", () => {
		const task = taskFromApi(
			wire({
				inquiry: { id: "T-old", name: "Old", companyId: "c-1" },
				procurementInquiry: { id: "T-new", name: "New", companyId: "c-2" },
			}),
		);
		expect(task.procurementInquiry.id).toBe("T-new");
	});

	it("handles a missing assignee (null)", () => {
		const task = taskFromApi(wire({ assignee: null }));
		expect(task.assignee).toBeNull();
	});

	it("reads assignee.avatarIcon", () => {
		const task = taskFromApi(
			wire({ assignee: { id: "u-1", firstName: "А", lastName: "Б", email: "a@b", avatarIcon: "purple" } }),
		);
		expect(task.assignee?.avatarIcon).toBe("purple");
	});

	it("defaults missing supplierQuestions to []", () => {
		const task = taskFromApi(wire());
		expect(task.supplierQuestions).toEqual([]);
	});

	it("passes denormalised supplierQuestions through", () => {
		const questions = [{ id: "q-1", question: "?", answer: null, supplierId: "s-1", supplierName: "S", askedAt: "x" }];
		const task = taskFromApi(wire({ supplierQuestions: questions }));
		expect(task.supplierQuestions).toEqual(questions);
	});

	it("defaults missing attachments to []", () => {
		const task = taskFromApi(wire());
		expect(task.attachments).toEqual([]);
	});

	it("passes denormalised attachments through", () => {
		const attachments = [
			{
				id: "a-1",
				fileName: "f.txt",
				fileSize: 1,
				fileType: "txt",
				contentType: "text/plain",
				fileUrl: "/x",
				uploadedAt: "y",
			},
		];
		const task = taskFromApi(wire({ attachments }));
		expect(task.attachments).toEqual(attachments);
	});
});
