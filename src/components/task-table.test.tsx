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

const task1 = makeTask("task-1", {
	name: "Согласование цены на арматуру",
	item: { id: "i-1", name: "Арматура А500С", companyId: "c-1" },
	status: "assigned",
});
const task2 = makeTask("task-2", { name: "Запрос КП", status: "in_progress" });

const boardResponse = {
	assigned: { results: [task1], next: null, count: 1 },
	in_progress: { results: [task2], next: null, count: 1 },
	completed: { results: [], next: null, count: 0 },
	archived: { results: [], next: null, count: 0 },
};

const flatResponse = {
	count: 2,
	results: [task1, task2],
	next: null,
	previous: null,
};

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	localStorage.setItem("auth-refresh-token", "test-refresh");

	server.use(
		http.get("/api/v1/company/tasks/board/", () => HttpResponse.json(boardResponse)),
		http.get("/api/v1/company/tasks/", () => HttpResponse.json(flatResponse)),
	);
});

afterEach(() => {
	localStorage.clear();
});

function renderTable(onTaskClick = vi.fn(), isMobile = false) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<TaskTable onTaskClick={onTaskClick} isMobile={isMobile} />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("TaskTable desktop", () => {
	it("renders all four status group headers", async () => {
		renderTable();
		await waitFor(() => {
			expect(screen.getByText("Назначено")).toBeInTheDocument();
		});
		expect(screen.getByText("В работе")).toBeInTheDocument();
		expect(screen.getByText("Завершено")).toBeInTheDocument();
		expect(screen.getByText("Архив")).toBeInTheDocument();
	});

	it("renders task name under its status group", async () => {
		renderTable();
		await waitFor(() => {
			expect(screen.getByText("Согласование цены на арматуру")).toBeInTheDocument();
		});
		expect(screen.getByText("Запрос КП")).toBeInTheDocument();
	});

	it("calls onTaskClick when task row is clicked", async () => {
		const onTaskClick = vi.fn();
		renderTable(onTaskClick);
		const user = userEvent.setup();
		await waitFor(() => {
			expect(screen.getByText("Согласование цены на арматуру")).toBeInTheDocument();
		});
		await user.click(screen.getByText("Согласование цены на арматуру"));
		expect(onTaskClick).toHaveBeenCalledWith("task-1");
	});

	it("collapses a status group when its header is clicked", async () => {
		renderTable();
		const user = userEvent.setup();
		await waitFor(() => {
			expect(screen.getByText("Согласование цены на арматуру")).toBeInTheDocument();
		});
		await user.click(screen.getByText("Назначено"));
		expect(screen.queryByText("Согласование цены на арматуру")).not.toBeInTheDocument();
	});

	it("does not render a plain <table> element", async () => {
		renderTable();
		await waitFor(() => {
			expect(screen.getByText("Назначено")).toBeInTheDocument();
		});
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("shows loading skeletons before data arrives", () => {
		server.use(
			http.get("/api/v1/company/tasks/board/", async () => {
				await new Promise((r) => setTimeout(r, 10000));
				return HttpResponse.json(boardResponse);
			}),
		);
		renderTable();
		expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThan(0);
	});
});

describe("TaskTable mobile", () => {
	it("renders cards instead of grouped view on mobile", async () => {
		renderTable(vi.fn(), true);
		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-table-card-/).length).toBeGreaterThan(0);
		});
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("renders task name and status badge in card", async () => {
		renderTable(vi.fn(), true);
		await waitFor(() => {
			expect(screen.getAllByText("Согласование цены на арматуру").length).toBeGreaterThan(0);
		});
		expect(screen.getAllByText("Назначено").length).toBeGreaterThan(0);
	});

	it("calls onTaskClick when card is clicked", async () => {
		const onTaskClick = vi.fn();
		renderTable(onTaskClick, true);
		const user = userEvent.setup();
		await waitFor(() => {
			expect(screen.getByTestId("task-table-card-task-1")).toBeInTheDocument();
		});
		await user.click(screen.getByTestId("task-table-card-task-1"));
		expect(onTaskClick).toHaveBeenCalledWith("task-1");
	});

	it("shows skeleton cards while loading", () => {
		server.use(
			http.get("/api/v1/company/tasks/", async () => {
				await new Promise((r) => setTimeout(r, 10000));
				return HttpResponse.json({});
			}),
		);
		renderTable(vi.fn(), true);
		expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
	});
});
