import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { _resetTaskStore, _setMockDelay } from "@/data/task-mock-data";
import { createTestQueryClient } from "@/test-utils";
import { TasksPage } from "./tasks-page";

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
});
