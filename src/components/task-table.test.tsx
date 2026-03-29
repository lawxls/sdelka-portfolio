import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetTaskStore, _setMockDelay } from "@/data/task-mock-data";
import { createTestQueryClient } from "@/test-utils";
import { TaskTable } from "./task-table";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	_resetTaskStore();
	_setMockDelay(0, 0);
});

function renderTable(onTaskClick = vi.fn()) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<TaskTable onTaskClick={onTaskClick} />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("TaskTable", () => {
	it("renders table with 7 column headers", async () => {
		renderTable();
		await waitFor(() => {
			expect(screen.getByRole("table")).toBeInTheDocument();
		});

		const headers = screen.getAllByRole("columnheader");
		expect(headers).toHaveLength(7);
		expect(headers[0]).toHaveTextContent("Название");
		expect(headers[1]).toHaveTextContent("Позиция");
		expect(headers[2]).toHaveTextContent("Исполнитель");
		expect(headers[3]).toHaveTextContent("Статус");
		expect(headers[4]).toHaveTextContent("Дедлайн");
		expect(headers[5]).toHaveTextContent("Создано");
		expect(headers[6]).toHaveTextContent("Вопросы");
	});

	it("renders task rows with correct data", async () => {
		renderTable();
		await waitFor(() => {
			expect(screen.getAllByText("Согласование цены на арматуру").length).toBeGreaterThan(0);
		});

		expect(screen.getAllByText("Арматура А500С").length).toBeGreaterThan(0);
	});

	it("shows status as badge", async () => {
		renderTable();
		await waitFor(() => {
			expect(screen.getAllByText("Назначено").length).toBeGreaterThan(0);
		});

		const badges = screen.getAllByText("Назначено");
		expect(badges[0].closest("[data-slot='badge']")).toBeInTheDocument();
	});

	it("calls onTaskClick when row is clicked", async () => {
		const onTaskClick = vi.fn();
		renderTable(onTaskClick);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getAllByText("Согласование цены на арматуру").length).toBeGreaterThan(0);
		});

		// Click first data row
		const rows = screen.getAllByRole("row");
		await user.click(rows[1]);

		expect(onTaskClick).toHaveBeenCalledWith("task-1");
	});

	it("shows loading skeletons initially", () => {
		_setMockDelay(10000, 10000);
		renderTable();
		expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThan(0);
	});
});
