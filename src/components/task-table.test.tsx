import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { createTestQueryClient, makeTask, mockHostname } from "@/test-utils";
import { TaskTable } from "./task-table";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const tasks = [
	makeTask("task-1", {
		name: "Согласование цены на арматуру",
		item: { id: "i-1", name: "Арматура А500С", companyId: "c-1" },
		status: "assigned",
	}),
	makeTask("task-2", { name: "Запрос КП", status: "in_progress" }),
];

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	localStorage.setItem("auth-refresh-token", "test-refresh");

	server.use(
		http.get("/api/v1/tasks/", () => {
			return HttpResponse.json({
				count: tasks.length,
				results: tasks,
				next: null,
				previous: null,
			});
		}),
	);
});

afterEach(() => {
	localStorage.clear();
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
		expect(headers[0]).toHaveTextContent("№");
		expect(headers[1]).toHaveTextContent("НАЗВАНИЕ");
		expect(headers[2]).toHaveTextContent("ПОЗИЦИЯ");
		expect(headers[3]).toHaveTextContent("ИСПОЛНИТЕЛЬ");
		expect(headers[4]).toHaveTextContent("ДЕДЛАЙН");
		expect(headers[5]).toHaveTextContent("СОЗДАНО");
		expect(headers[6]).toHaveTextContent("ВОПРОСЫ");
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
		server.use(
			http.get("/api/v1/tasks/", async () => {
				await new Promise((r) => setTimeout(r, 10000));
				return HttpResponse.json({});
			}),
		);
		renderTable();
		expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThan(0);
	});
});
