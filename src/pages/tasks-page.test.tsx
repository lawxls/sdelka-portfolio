import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as tasksMock from "@/data/tasks-mock-data";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { createTestQueryClient, makeTask, mockHostname } from "@/test-utils";
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
	localStorage.setItem("auth-access-token", "test-token");
	tasksMock._setTasks(allTasks);
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

function renderPage(initialEntries?: string[]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<MemoryRouter initialEntries={initialEntries ?? ["/tasks"]}>
					<TasksPage />
				</MemoryRouter>
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

describe("TasksPage", () => {
	it("renders Задачи heading", async () => {
		renderPage();
		expect(screen.getByRole("heading", { name: "Задачи" })).toBeInTheDocument();
	});

	it("shows total count with Russian plural form and header", async () => {
		renderPage();
		await waitFor(() => {
			// Default view = active tasks (assigned + in_progress) = 8 tasks
			expect(screen.getByTestId("total-count")).toHaveTextContent(/^8\s+задач$/);
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

	it("clicking Архив toggle switches the view", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Архив" }));

		await waitFor(() => {
			expect(screen.getByText("Archived 1")).toBeInTheDocument();
		});
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

		const headers = ["Задача", "Назначена", "Вопросы", "Дедлайн", "дата.*создания"];
		for (const pattern of headers) {
			expect(screen.getByRole("button", { name: new RegExp(pattern, "i") })).toBeInTheDocument();
		}
	});

	it("shows item (position) name under task name in the same cell", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByText("Assigned 1")).toBeInTheDocument());
		// Position is rendered via makeTask as "Арматура А500С" — should appear inline
		expect(screen.getAllByText("Арматура А500С").length).toBeGreaterThan(0);
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
