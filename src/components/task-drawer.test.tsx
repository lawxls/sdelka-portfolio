import type { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createInMemorySuppliersClient } from "@/data/clients/suppliers-in-memory";
import type { TasksClient } from "@/data/clients/tasks-client";
import { createInMemoryTasksClient } from "@/data/clients/tasks-in-memory";
import type { Task } from "@/data/task-types";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeTask, mockHostname } from "@/test-utils";
import { TaskDrawer } from "./task-drawer";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const unansweredTask = makeTask("task-1", {
	name: "Согласование цены на арматуру",
	item: { id: "i-1", name: "Арматура А500С", companyId: "c-1" },
	createdAt: "2026-03-01T10:00:00.000Z",
	description: "Поставщик прислал обновлённое КП. Необходимо проверить соответствие спецификации и подтвердить объёмы.",
	status: "assigned",
	questionCount: 2,
	supplierQuestions: [
		{
			id: "sq-a",
			question: "Q1?",
			answer: null,
			supplierId: "supplier-1",
			supplierName: "ООО «Альфа»",
			askedAt: "2026-02-26T10:00:00.000Z",
		},
		{
			id: "sq-b",
			question: "Q2?",
			answer: null,
			supplierId: "supplier-2",
			supplierName: "ООО «Бета»",
			askedAt: "2026-02-27T11:00:00.000Z",
		},
	],
});

const completedTask = makeTask("task-51", {
	name: "Завершённая задача",
	status: "completed",
	completedResponse: "Согласовано. Условия поставки подтверждены, договор направлен на подпись.",
});

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

/**
 * Build a tasks client wrapping the in-memory adapter and exposing a
 * `vi.fn`-wrapped `changeStatus` so the test can assert on call args without
 * reaching into mock-store internals.
 */
function buildTasksClient(seed: Task[]): { client: TasksClient; changeStatusSpy: ReturnType<typeof vi.fn> } {
	const inMemory = createInMemoryTasksClient({ seed });
	const changeStatusSpy = vi.fn(inMemory.changeStatus.bind(inMemory));
	return {
		client: { ...inMemory, changeStatus: changeStatusSpy },
		changeStatusSpy,
	};
}

function renderDrawer(taskId: string | null, opts: { onClose?: () => void; seed?: Task[] } = {}) {
	const onClose = opts.onClose ?? vi.fn();
	const seed = opts.seed ?? [unansweredTask, completedTask];
	const { client, changeStatusSpy } = buildTasksClient(seed);
	return {
		onClose,
		changeStatusSpy,
		...render(
			<TestClientsProvider
				queryClient={queryClient}
				clients={{ suppliers: createInMemorySuppliersClient(), tasks: client }}
			>
				<TooltipProvider>
					<TaskDrawer taskId={taskId} onClose={onClose} />
				</TooltipProvider>
			</TestClientsProvider>,
		),
	};
}

describe("TaskDrawer", () => {
	it("displays task name, item name, description", async () => {
		renderDrawer("task-1");

		await waitFor(() => {
			expect(screen.getByText("Согласование цены на арматуру")).toBeInTheDocument();
		});
		expect(screen.getByText("Арматура А500С")).toBeInTheDocument();
		expect(screen.getByText(/Поставщик прислал обновлённое КП/)).toBeInTheDocument();
	});

	it("shows chat composer for unanswered tasks", async () => {
		renderDrawer("task-1");

		await waitFor(() => {
			expect(screen.getByTestId("task-chat-composer")).toBeInTheDocument();
		});
		expect(screen.getByPlaceholderText("Написать ответ…")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отправить" })).toBeInTheDocument();
	});

	it("does not show status dropdown", async () => {
		renderDrawer("task-1");
		await waitFor(() => {
			expect(screen.getByText("Согласование цены на арматуру")).toBeInTheDocument();
		});
		expect(screen.queryByRole("combobox", { name: "Статус задачи" })).not.toBeInTheDocument();
	});

	it("submitting a message closes the drawer", async () => {
		const onClose = vi.fn();
		renderDrawer("task-1", { onClose });
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Написать ответ…")).toBeInTheDocument();
		});

		await user.type(screen.getByPlaceholderText("Написать ответ…"), "Принято в работу");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		await waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
	});

	it("shows read-only answer panel for completed tasks", async () => {
		renderDrawer("task-51");

		await waitFor(() => {
			expect(screen.getByTestId("task-answer-panel")).toBeInTheDocument();
		});
		expect(screen.getByText(/Согласовано\. Условия поставки подтверждены/)).toBeInTheDocument();
		expect(screen.queryByTestId("task-chat-composer")).not.toBeInTheDocument();
	});

	it("renders a suppliers-list section with company name and question date", async () => {
		renderDrawer("task-1");

		await waitFor(() => {
			expect(screen.getByTestId("suppliers-list")).toBeInTheDocument();
		});
		expect(screen.getByTestId("supplier-question-card-sq-a")).toHaveTextContent("ООО «Альфа»");
		expect(screen.getByTestId("supplier-question-card-sq-b")).toHaveTextContent("ООО «Бета»");
	});

	it("archives the task via the overflow menu", async () => {
		const onClose = vi.fn();
		const { changeStatusSpy } = renderDrawer("task-1", { onClose });
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Действия" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Действия" }));
		await user.click(await screen.findByRole("menuitem", { name: /В архив/ }));

		await waitFor(() => {
			expect(changeStatusSpy).toHaveBeenCalledWith("task-1", expect.objectContaining({ status: "archived" }));
		});
	});

	it("unarchives an archived task via the overflow menu, restoring the prior status", async () => {
		const archivedTask = makeTask("task-archived", {
			name: "Архивная задача",
			status: "archived",
			statusBeforeArchive: "in_progress",
		});
		const { changeStatusSpy } = renderDrawer("task-archived", { seed: [archivedTask] });
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Действия" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Действия" }));
		await user.click(await screen.findByRole("menuitem", { name: /Разархивировать/ }));

		await waitFor(() => {
			expect(changeStatusSpy).toHaveBeenCalledWith("task-archived", expect.objectContaining({ status: "in_progress" }));
		});
	});

	it("renders as full-screen bottom sheet when isMobile", async () => {
		const { client } = buildTasksClient([unansweredTask, completedTask]);
		render(
			<TestClientsProvider
				queryClient={queryClient}
				clients={{ suppliers: createInMemorySuppliersClient(), tasks: client }}
			>
				<TooltipProvider>
					<TaskDrawer taskId="task-1" onClose={vi.fn()} isMobile />
				</TooltipProvider>
			</TestClientsProvider>,
		);

		await waitFor(() => {
			const sheetContent = document.querySelector("[data-slot='sheet-content']");
			expect(sheetContent?.getAttribute("data-side")).toBe("bottom");
			expect(sheetContent?.getAttribute("data-size")).toBe("full");
		});
	});

	it("does not render drawer content when taskId is null", () => {
		renderDrawer(null);
		expect(screen.queryByPlaceholderText("Написать ответ…")).not.toBeInTheDocument();
	});
});
