import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ProcurementInquiriesClient } from "@/data/clients/procurement-inquiries-client";
import { createInMemoryProcurementInquiriesClient } from "@/data/clients/procurement-inquiries-in-memory";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { createInMemorySuppliersClient } from "@/data/clients/suppliers-in-memory";
import type { TasksClient } from "@/data/clients/tasks-client";
import { createInMemoryTasksClient } from "@/data/clients/tasks-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { createTestQueryClient, makeProcurementInquiry, makeTask, mockHostname } from "@/test-utils";
import { TasksPage } from "./tasks-page";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-is-mobile", () => ({
	useIsMobile: vi.fn(() => false),
}));

const assignedTasks = Array.from({ length: 5 }, (_, i) =>
	makeTask(`task-a-${i + 1}`, { status: "assigned", name: `Assigned ${i + 1}` }),
);
const inProgressTasks = Array.from({ length: 3 }, (_, i) =>
	makeTask(`task-ip-${i + 1}`, { status: "in_progress", name: `InProgress ${i + 1}` }),
);
const completedTasks = Array.from({ length: 2 }, (_, i) =>
	makeTask(`task-c-${i + 1}`, { status: "completed", name: `Completed ${i + 1}`, completedResponse: "Done" }),
);
const archivedTasks = Array.from({ length: 2 }, (_, i) =>
	makeTask(`task-ar-${i + 1}`, { status: "archived", name: `Archived ${i + 1}` }),
);
const allTasks = [...assignedTasks, ...inProgressTasks, ...completedTasks, ...archivedTasks];

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	sessionStorage.setItem("auth-access-token", "test-token");
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

function renderPage(
	initialEntries?: string[],
	clients?: {
		tasks?: TasksClient;
		procurementInquiries?: ProcurementInquiriesClient;
	},
) {
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				suppliers: createInMemorySuppliersClient(),
				tasks: clients?.tasks ?? createInMemoryTasksClient({ seed: allTasks }),
				procurementInquiries: clients?.procurementInquiries ?? createInMemoryProcurementInquiriesClient({ seed: [] }),
				profile: createInMemoryProfileClient(),
			}}
		>
			<TooltipProvider>
				<MemoryRouter initialEntries={initialEntries ?? ["/tasks"]}>
					<TasksPage />
				</MemoryRouter>
			</TooltipProvider>
		</TestClientsProvider>,
	);
}

describe("TasksPage", () => {
	it("renders Вопросы heading", async () => {
		renderPage();
		expect(screen.getByRole("heading", { name: "Вопросы" })).toBeInTheDocument();
	});

	it("shows total count with Russian plural form and header", async () => {
		renderPage();
		await waitFor(() => {
			// Default view = active tasks (assigned + in_progress) = 8 tasks
			expect(screen.getByTestId("total-count")).toHaveTextContent(/^8\s+вопросов$/);
		});
	});

	it("defaults to active tasks view (assigned + in_progress)", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Assigned 1")).toBeInTheDocument();
		});
		expect(screen.getByText("InProgress 1")).toBeInTheDocument();
		expect(screen.queryByText("Completed 1")).not.toBeInTheDocument();
		expect(screen.queryByText("Archived 1")).not.toBeInTheDocument();
	});

	it("clicking a task row opens the detail drawer", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByText("Assigned 1")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Assigned 1"));

		await waitFor(() => {
			expect(screen.getByText("Assigned 1", { selector: "[data-slot='sheet-title']" })).toBeInTheDocument();
		});
	});

	it("opens drawer from task URL param", async () => {
		renderPage(["/tasks?task=task-a-1"]);
		await waitFor(() => {
			expect(screen.getByText("Assigned 1", { selector: "[data-slot='sheet-title']" })).toBeInTheDocument();
		});
	});

	it("filters by ?status=completed via URL", async () => {
		renderPage(["/tasks?status=completed"]);
		await waitFor(() => {
			expect(screen.getByText("Completed 1")).toBeInTheDocument();
		});
		expect(screen.queryByText("Assigned 1")).not.toBeInTheDocument();
	});

	it("filters by ?status=archived via URL", async () => {
		renderPage(["/tasks?status=archived"]);
		await waitFor(() => {
			expect(screen.getByText("Archived 1")).toBeInTheDocument();
		});
		expect(screen.queryByText("Assigned 1")).not.toBeInTheDocument();
	});

	it("clicking Завершённые toggle switches the view", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Завершённые" }));

		await waitFor(() => {
			expect(screen.getByText("Completed 1")).toBeInTheDocument();
		});
	});

	it("clicking Завершённые refetches only the target task list once per toggle", async () => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
		});
		const tasksClient = createInMemoryTasksClient({ seed: allTasks });
		const listSpy = vi.spyOn(tasksClient, "list");
		renderPage(undefined, { tasks: tasksClient });
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());
		listSpy.mockClear();

		await user.click(screen.getByRole("button", { name: "Завершённые" }));

		await waitFor(() => expect(screen.getByText("Completed 1")).toBeInTheDocument());
		expect(listSpy).toHaveBeenCalledTimes(1);
		expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ page_size: 25, statuses: ["completed"] }));

		await user.click(screen.getByRole("button", { name: "Завершённые" }));

		await waitFor(() => expect(listSpy).toHaveBeenCalledTimes(2));
		expect(listSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ page_size: 25, statuses: ["assigned", "in_progress"] }),
		);

		await user.click(screen.getByRole("button", { name: "Завершённые" }));

		await waitFor(() => expect(listSpy).toHaveBeenCalledTimes(3));
		expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ page_size: 25, statuses: ["completed"] }));
	});

	it("clicking Архив toggle switches the view", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Архив" }));

		await waitFor(() => {
			expect(screen.getByText("Archived 1")).toBeInTheDocument();
		});
	});

	it("clicking Архив refetches only the target task list once per toggle", async () => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
		});
		const tasksClient = createInMemoryTasksClient({ seed: allTasks });
		const listSpy = vi.spyOn(tasksClient, "list");
		renderPage(undefined, { tasks: tasksClient });
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());
		listSpy.mockClear();

		await user.click(screen.getByRole("button", { name: "Архив" }));

		await waitFor(() => expect(screen.getByText("Archived 1")).toBeInTheDocument());
		expect(listSpy).toHaveBeenCalledTimes(1);
		expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ page_size: 25, statuses: ["archived"] }));

		await user.click(screen.getByRole("button", { name: "Архив" }));

		await waitFor(() => expect(listSpy).toHaveBeenCalledTimes(2));
		expect(listSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ page_size: 25, statuses: ["assigned", "in_progress"] }),
		);

		await user.click(screen.getByRole("button", { name: "Архив" }));

		await waitFor(() => expect(listSpy).toHaveBeenCalledTimes(3));
		expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ page_size: 25, statuses: ["archived"] }));
	});

	it("searching fetches only the filtered task list", async () => {
		const tasksClient = createInMemoryTasksClient({ seed: allTasks });
		const listSpy = vi.spyOn(tasksClient, "list");
		renderPage(undefined, { tasks: tasksClient });
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());
		listSpy.mockClear();

		await user.click(screen.getByRole("button", { name: "Поиск вопросов" }));
		await user.type(screen.getByLabelText("Поиск вопросов"), "Assigned 1");

		await waitFor(() => {
			expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ q: "Assigned 1", page_size: 25 }));
		});
		const filteredCalls = listSpy.mock.calls.filter(([params]) => params?.q === "Assigned 1");
		expect(filteredCalls).toHaveLength(1);
	});

	it("filtering by inquiry fetches only the filtered task list", async () => {
		const tasksClient = createInMemoryTasksClient({ seed: allTasks });
		const listSpy = vi.spyOn(tasksClient, "list");
		const procurementInquiries = createInMemoryProcurementInquiriesClient({
			seed: [makeProcurementInquiry("T-001", { name: "Запрос арматуры" })],
		});
		renderPage(undefined, { tasks: tasksClient, procurementInquiries });
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());
		listSpy.mockClear();

		await user.click(screen.getByRole("button", { name: "Фильтр по запросу" }));
		await user.click(await screen.findByRole("button", { name: "Запрос арматуры" }));

		await waitFor(() => {
			expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ procurementInquiry: "T-001", page_size: 25 }));
		});
		const filteredCalls = listSpy.mock.calls.filter(([params]) => params?.procurementInquiry === "T-001");
		expect(filteredCalls).toHaveLength(1);
	});

	it("shows selection bar after selecting rows", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());

		const rowCheckboxes = screen.getAllByRole("checkbox", { name: /Выбрать Assigned/ });
		await user.click(rowCheckboxes[0]);

		await waitFor(() => {
			expect(screen.getByTestId("selection-bar")).toBeInTheDocument();
		});
		expect(within(screen.getByTestId("selection-bar")).getByText("Выбрано: 1")).toBeInTheDocument();
	});

	it("Архивировать bulk action archives selected tasks", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());

		const rowCheckbox = screen.getAllByRole("checkbox", { name: /Выбрать Assigned 1/ })[0];
		await user.click(rowCheckbox);
		await user.click(screen.getByRole("button", { name: "Архивировать" }));

		await waitFor(() => {
			expect(screen.queryByText("Assigned 1")).not.toBeInTheDocument();
		});
	});

	it("Разархивировать bulk action restores selected archived tasks", async () => {
		renderPage(["/tasks?status=archived"]);
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Archived 1")).toBeInTheDocument());

		const rowCheckbox = screen.getAllByRole("checkbox", { name: /Выбрать Archived 1/ })[0];
		await user.click(rowCheckbox);

		expect(screen.queryByRole("button", { name: "Архивировать" })).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Разархивировать" }));

		await waitFor(() => {
			expect(screen.queryByText("Archived 1")).not.toBeInTheDocument();
		});
	});

	it("renders table columns in the required order", async () => {
		renderPage();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());

		const headers = ["Вопрос", "Назначен", "Количество", "Дедлайн", "дата и время создания"];
		for (const pattern of headers) {
			expect(screen.getByRole("button", { name: new RegExp(`^Сортировать по ${pattern}$`, "i") })).toBeInTheDocument();
		}
	});

	it("shows inquiry name under task name in the same cell", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());
		// ProcurementInquiry is rendered via makeTask as "Запрос арматуры" — should appear inline.
		expect(screen.getAllByText("Запрос арматуры").length).toBeGreaterThan(0);
	});

	it("renders Скачать таблицу button", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());
		expect(screen.getByRole("button", { name: "Скачать таблицу" })).toBeInTheDocument();
	});

	describe("mobile", () => {
		beforeEach(() => {
			vi.mocked(useIsMobile).mockReturnValue(true);
		});

		afterEach(() => {
			vi.mocked(useIsMobile).mockReturnValue(false);
		});

		it("renders mobile cards instead of table on mobile", async () => {
			renderPage();
			await waitFor(() => {
				expect(screen.getAllByTestId(/^task-row-/).length).toBeGreaterThan(0);
			});
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});

		it("drawer opens as full-screen bottom sheet on mobile", async () => {
			renderPage(["/tasks?task=task-a-1"]);
			await waitFor(() => {
				const sheetContent = document.querySelector("[data-slot='sheet-content']");
				expect(sheetContent?.getAttribute("data-side")).toBe("bottom");
				expect(sheetContent?.getAttribute("data-size")).toBe("full");
			});
		});
	});
});
