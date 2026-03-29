import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
			<MemoryRouter initialEntries={initialEntries ?? ["/tasks"]}>
				<TasksPage />
			</MemoryRouter>
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
