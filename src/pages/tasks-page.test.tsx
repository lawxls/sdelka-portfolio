import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { _resetTaskStore, _setMockDelay } from "@/data/task-mock-data";
import { createTestQueryClient } from "@/test-utils";
import { TasksPage } from "./tasks-page";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	_resetTaskStore();
	_setMockDelay(0, 0);
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
	it("renders page heading", () => {
		renderPage();
		expect(screen.getByRole("heading", { name: "Задачи" })).toBeInTheDocument();
	});

	it("renders 4 column labels after loading", async () => {
		renderPage();
		await waitFor(() => {
			for (const label of ["Назначено", "В работе", "Завершено", "Архив"]) {
				expect(screen.getByText(label)).toBeInTheDocument();
			}
		});
	});

	it("displays task cards from mock data", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});
	});

	it("shows correct card counts after loading", async () => {
		renderPage();
		await waitFor(() => {
			// Mock data has 15 tasks per status
			const badges = screen.getAllByText("15");
			expect(badges).toHaveLength(4);
		});
	});

	it("clicking a task card opens the detail drawer", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		await user.click(screen.getByTestId("task-card-task-1"));

		await waitFor(() => {
			expect(
				screen.getByText("Согласование цены на арматуру", { selector: "[data-slot='sheet-title']" }),
			).toBeInTheDocument();
		});
	});

	it("opens drawer from task URL param", async () => {
		renderPage(["/tasks?task=task-1"]);

		await waitFor(() => {
			expect(
				screen.getByText("Согласование цены на арматуру", { selector: "[data-slot='sheet-title']" }),
			).toBeInTheDocument();
		});
	});

	it("closes drawer on close button click", async () => {
		renderPage(["/tasks?task=task-1"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(
				screen.getByText("Согласование цены на арматуру", { selector: "[data-slot='sheet-title']" }),
			).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Close" }));

		await waitFor(() => {
			expect(
				screen.queryByText("Согласование цены на арматуру", { selector: "[data-slot='sheet-title']" }),
			).not.toBeInTheDocument();
		});
	});

	it("cards in assigned/in_progress/archived are draggable", async () => {
		renderPage();

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		// task-1 is assigned (status: assigned)
		expect(screen.getByTestId("task-card-task-1").getAttribute("aria-roledescription")).toBe("draggable");
	});

	it("cards in completed column are not draggable", async () => {
		renderPage();

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		// task-31 is completed (first completed task in mock data)
		expect(screen.getByTestId("task-card-task-31").getAttribute("aria-roledescription")).not.toBe("draggable");
	});

	it("renders view toggle with board and table buttons", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Таблица" })).toBeInTheDocument();
		});
	});

	it("defaults to board view", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByTestId("task-board")).toBeInTheDocument();
		});
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("switches to table view when table button is clicked", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Таблица" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Таблица" }));

		await waitFor(() => {
			expect(screen.getByRole("table")).toBeInTheDocument();
		});
		expect(screen.queryByTestId("task-board")).not.toBeInTheDocument();
	});

	it("renders table view when ?view=table in URL", async () => {
		renderPage(["/tasks?view=table"]);
		await waitFor(() => {
			expect(screen.getByRole("table")).toBeInTheDocument();
		});
		expect(screen.queryByTestId("task-board")).not.toBeInTheDocument();
	});

	it("clicking table row opens drawer", async () => {
		renderPage(["/tasks?view=table"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getAllByText("Назначено").length).toBeGreaterThan(0);
		});

		const rows = screen.getAllByRole("row");
		await user.click(rows[1]);

		await waitFor(() => {
			expect(
				screen.getByText("Согласование цены на арматуру", { selector: "[data-slot='sheet-title']" }),
			).toBeInTheDocument();
		});
	});

	it("search input filters displayed tasks in board view", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		const searchInput = screen.getByPlaceholderText("Поиск…");
		await user.type(searchInput, "арматур");

		await waitFor(() => {
			const cards = screen.getAllByTestId(/^task-card-/);
			// Should have fewer cards after filtering
			expect(cards.length).toBeLessThan(60);
			expect(cards.length).toBeGreaterThan(0);
		});
	});

	it("?q= URL param filters tasks on load", async () => {
		renderPage(["/tasks?q=арматур"]);

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		// All visible cards should match the search
		const cards = screen.getAllByTestId(/^task-card-/);
		expect(cards.length).toBeLessThan(60);
	});

	it("sort control renders and ?sort=&dir= params work", async () => {
		renderPage(["/tasks?sort=deadline&dir=asc"]);

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		// Sort button should show active indicator
		const sortBtn = screen.getByRole("button", { name: "Сортировка" });
		expect(sortBtn.querySelector("[data-indicator]")).toBeInTheDocument();
	});

	it("?item= URL param filters tasks", async () => {
		renderPage(["/tasks?item=Арматура А500С"]);

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		const cards = screen.getAllByTestId(/^task-card-/);
		expect(cards.length).toBeLessThan(60);
	});

	it("search works in table view", async () => {
		renderPage(["/tasks?view=table&q=арматур"]);

		await waitFor(() => {
			expect(screen.getByRole("table")).toBeInTheDocument();
			expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
		});
	});

	it("status dropdown change to completed in drawer shows answer-first toast", async () => {
		const { toast } = await import("sonner");
		renderPage(["/tasks?task=task-1"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("combobox", { name: "Статус задачи" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("combobox", { name: "Статус задачи" }));
		await user.click(screen.getByRole("option", { name: "Завершено" }));

		await waitFor(() => {
			expect(toast.info).toHaveBeenCalledWith("Ответьте на вопрос, чтобы перевести задачу в «Завершено»");
		});
	});
});
