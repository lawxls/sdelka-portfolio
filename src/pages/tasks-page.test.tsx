import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { server } from "@/test-msw";
import { createTestQueryClient, makeCompany, makeTask, mockHostname } from "@/test-utils";
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

function boardResponse(overrides: Record<string, unknown> = {}) {
	return {
		assigned: { results: assignedTasks, next: null, count: assignedTasks.length },
		in_progress: { results: inProgressTasks, next: null, count: inProgressTasks.length },
		completed: { results: completedTasks, next: null, count: completedTasks.length },
		archived: { results: archivedTasks, next: null, count: archivedTasks.length },
		...overrides,
	};
}

function listResponse(tasks = [...assignedTasks, ...inProgressTasks, ...completedTasks, ...archivedTasks]) {
	return { count: tasks.length, results: tasks, next: null, previous: null };
}

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	localStorage.setItem("auth-refresh-token", "test-refresh");

	// Default MSW handlers
	server.use(
		http.get("/api/v1/company/tasks/board/", () => HttpResponse.json(boardResponse())),
		http.get("/api/v1/company/tasks/", () => HttpResponse.json(listResponse())),
		http.get("/api/v1/company/tasks/:id/", ({ params }) => {
			const all = [...assignedTasks, ...inProgressTasks, ...completedTasks, ...archivedTasks];
			const task = all.find((t) => t.id === params.id);
			return task ? HttpResponse.json(task) : HttpResponse.json({ detail: "Not found" }, { status: 404 });
		}),
	);
});

afterEach(() => {
	localStorage.clear();
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

	it("displays task cards from API", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});
	});

	it("shows correct card counts after loading", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBe(12);
		});
	});

	it("clicking a task card opens the detail drawer", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		await user.click(screen.getByTestId("task-card-task-a-1"));

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

	it("closes drawer on close button click", async () => {
		renderPage(["/tasks?task=task-a-1"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByText("Assigned 1", { selector: "[data-slot='sheet-title']" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Close" }));

		await waitFor(() => {
			expect(screen.queryByText("Assigned 1", { selector: "[data-slot='sheet-title']" })).not.toBeInTheDocument();
		});
	});

	it("cards in assigned/in_progress/archived are draggable", async () => {
		renderPage();

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		expect(screen.getByTestId("task-card-task-a-1").getAttribute("aria-roledescription")).toBe("draggable");
	});

	it("cards in completed column are not draggable", async () => {
		renderPage();

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		expect(screen.getByTestId("task-card-task-c-1").getAttribute("aria-roledescription")).not.toBe("draggable");
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
			expect(screen.getByText("Assigned 1", { selector: "[data-slot='sheet-title']" })).toBeInTheDocument();
		});
	});

	it("search input filters displayed tasks in board view", async () => {
		server.use(
			http.get("/api/v1/company/tasks/board/", ({ request }) => {
				const url = new URL(request.url);
				const q = url.searchParams.get("q");
				if (q) {
					const filtered = assignedTasks.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
					return HttpResponse.json(
						boardResponse({
							assigned: { results: filtered, next: null, count: filtered.length },
							in_progress: { results: [], next: null, count: 0 },
							completed: { results: [], next: null, count: 0 },
							archived: { results: [], next: null, count: 0 },
						}),
					);
				}
				return HttpResponse.json(boardResponse());
			}),
		);

		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		const searchInput = screen.getByPlaceholderText("Поиск…");
		await user.type(searchInput, "Assigned 1");

		await waitFor(() => {
			const cards = screen.getAllByTestId(/^task-card-/);
			expect(cards.length).toBeLessThan(12);
		});
	});

	it("sort control renders and ?sort=&dir= params work", async () => {
		renderPage(["/tasks?sort=deadline_at&dir=asc"]);

		await waitFor(() => {
			expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
		});

		// Sort button should show active indicator
		const sortBtn = screen.getByRole("button", { name: "Сортировка" });
		expect(sortBtn.querySelector("[data-indicator]")).toBeInTheDocument();
	});

	it("search works in table view", async () => {
		renderPage(["/tasks?view=table"]);

		await waitFor(() => {
			expect(screen.getByRole("table")).toBeInTheDocument();
			expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
		});
	});

	it("status dropdown change to completed in drawer shows answer-first toast", async () => {
		const { toast } = await import("sonner");
		renderPage(["/tasks?task=task-a-1"]);
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

	describe("company filter", () => {
		const companies = [makeCompany("c1", { name: "ООО Альфа" }), makeCompany("c2", { name: "ООО Бета" })];

		beforeEach(() => {
			server.use(http.get("/api/v1/companies/", () => HttpResponse.json({ companies, nextCursor: null })));
		});

		it("shows company button when multi-company", async () => {
			renderPage();
			await waitFor(() => {
				expect(screen.getByRole("button", { name: "Компания" })).toBeInTheDocument();
			});
		});

		it("hides company button for single company", async () => {
			server.use(
				http.get("/api/v1/companies/", () => HttpResponse.json({ companies: [companies[0]], nextCursor: null })),
			);
			renderPage();
			await waitFor(() => {
				expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
			});
			expect(screen.queryByRole("button", { name: "Компания" })).not.toBeInTheDocument();
		});

		it("selecting company passes company param to board API", async () => {
			let capturedCompany: string | null = null;
			server.use(
				http.get("/api/v1/company/tasks/board/", ({ request }) => {
					const url = new URL(request.url);
					capturedCompany = url.searchParams.get("company");
					return HttpResponse.json(boardResponse());
				}),
			);

			renderPage();
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getByRole("button", { name: "Компания" })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Компания" }));
			await user.click(screen.getByText("ООО Альфа"));

			await waitFor(() => {
				expect(capturedCompany).toBe("c1");
			});
		});

		it("clearing company selection removes company param", async () => {
			let capturedCompany: string | null = "initial";
			server.use(
				http.get("/api/v1/company/tasks/board/", ({ request }) => {
					const url = new URL(request.url);
					capturedCompany = url.searchParams.get("company");
					return HttpResponse.json(boardResponse());
				}),
			);

			renderPage(["/tasks?company=c1"]);
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getByRole("button", { name: "Компания" })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Компания" }));
			await user.click(screen.getByText("Все компании"));

			await waitFor(() => {
				expect(capturedCompany).toBeNull();
			});
		});

		it("company param persists from URL on initial load", async () => {
			let capturedCompany: string | null = null;
			server.use(
				http.get("/api/v1/company/tasks/board/", ({ request }) => {
					const url = new URL(request.url);
					capturedCompany = url.searchParams.get("company");
					return HttpResponse.json(boardResponse());
				}),
			);

			renderPage(["/tasks?company=c2"]);

			await waitFor(() => {
				expect(capturedCompany).toBe("c2");
			});
		});
	});

	describe("item search filter", () => {
		const items = [
			{
				id: "item-1",
				name: "Арматура А500С",
				status: "searching",
				annualQuantity: 100,
				currentPrice: 50,
				bestPrice: null,
				averagePrice: null,
				folderId: null,
				companyId: "c1",
			},
			{
				id: "item-2",
				name: "Кабель ВВГнг 3×2.5",
				status: "searching",
				annualQuantity: 200,
				currentPrice: 60,
				bestPrice: null,
				averagePrice: null,
				folderId: null,
				companyId: "c1",
			},
		];

		beforeEach(() => {
			server.use(
				http.get("/api/v1/company/items/", ({ request }) => {
					const url = new URL(request.url);
					const q = url.searchParams.get("q");
					if (q) {
						const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
						return HttpResponse.json({ items: filtered, nextCursor: null });
					}
					return HttpResponse.json({ items, nextCursor: null });
				}),
			);
		});

		it("typing in item search shows results from API", async () => {
			renderPage();
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
			});

			await user.click(screen.getByRole("button", { name: "Фильтр" }));
			await user.type(screen.getByPlaceholderText("Поиск позиции…"), "Кабель");

			await waitFor(() => {
				expect(screen.getByText("Кабель ВВГнг 3×2.5")).toBeInTheDocument();
			});
		});

		it("selecting an item passes item UUID to board API", async () => {
			let capturedItem: string | null = null;
			server.use(
				http.get("/api/v1/company/tasks/board/", ({ request }) => {
					const url = new URL(request.url);
					capturedItem = url.searchParams.get("item");
					return HttpResponse.json(boardResponse());
				}),
			);

			renderPage();
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
			});

			await user.click(screen.getByRole("button", { name: "Фильтр" }));
			await user.type(screen.getByPlaceholderText("Поиск позиции…"), "Кабель");

			await waitFor(() => {
				expect(screen.getByText("Кабель ВВГнг 3×2.5")).toBeInTheDocument();
			});

			await user.click(screen.getByText("Кабель ВВГнг 3×2.5"));

			await waitFor(() => {
				expect(capturedItem).toBe("item-2");
			});
		});

		it("clearing item selection removes item param from API", async () => {
			let capturedItem: string | null = "initial";
			server.use(
				http.get("/api/v1/company/tasks/board/", ({ request }) => {
					const url = new URL(request.url);
					capturedItem = url.searchParams.get("item");
					return HttpResponse.json(boardResponse());
				}),
			);

			renderPage(["/tasks?item=item-1"]);
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
			});

			await user.click(screen.getByRole("button", { name: "Фильтр" }));
			await user.click(screen.getByText("Все"));

			await waitFor(() => {
				expect(capturedItem).toBeNull();
			});
		});

		it("item param persists from URL on initial load", async () => {
			let capturedItem: string | null = null;
			server.use(
				http.get("/api/v1/company/tasks/board/", ({ request }) => {
					const url = new URL(request.url);
					capturedItem = url.searchParams.get("item");
					return HttpResponse.json(boardResponse());
				}),
			);

			renderPage(["/tasks?item=item-1"]);

			await waitFor(() => {
				expect(capturedItem).toBe("item-1");
			});
		});

		it("no items shown until user types", async () => {
			renderPage();
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
			});

			await user.click(screen.getByRole("button", { name: "Фильтр" }));

			// "Кабель" only exists in the items search results, not in task cards
			expect(screen.queryByText("Кабель ВВГнг 3×2.5")).not.toBeInTheDocument();
		});
	});

	describe("mobile table view", () => {
		beforeEach(() => {
			vi.mocked(useIsMobile).mockReturnValue(true);
		});

		afterEach(() => {
			vi.mocked(useIsMobile).mockReturnValue(false);
		});

		it("shows cards instead of table in table view on mobile", async () => {
			renderPage(["/tasks?view=table"]);
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getByRole("button", { name: "Таблица" })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Таблица" }));

			await waitFor(() => {
				expect(screen.getAllByTestId(/^task-table-card-/).length).toBeGreaterThan(0);
			});
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});

	describe("mobile", () => {
		beforeEach(() => {
			vi.mocked(useIsMobile).mockReturnValue(true);
		});

		afterEach(() => {
			vi.mocked(useIsMobile).mockReturnValue(false);
		});

		it("renders tab bar instead of 4-column grid on mobile", async () => {
			renderPage();
			await waitFor(() => {
				expect(screen.getByRole("tablist")).toBeInTheDocument();
			});
		});

		it("cards are not draggable on mobile", async () => {
			renderPage();
			await waitFor(() => {
				expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
			});

			const cards = screen.getAllByTestId(/^task-card-/);
			for (const card of cards) {
				expect(card.getAttribute("aria-roledescription")).not.toBe("draggable");
			}
		});

		it("drawer opens as full-screen bottom sheet on mobile", async () => {
			renderPage(["/tasks?task=task-a-1"]);
			await waitFor(() => {
				const sheetContent = document.querySelector("[data-slot='sheet-content']");
				expect(sheetContent?.getAttribute("data-side")).toBe("bottom");
				expect(sheetContent?.getAttribute("data-size")).toBe("full");
			});
		});

		it("tab switching shows different column cards on mobile", async () => {
			renderPage();
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getAllByTestId(/^task-card-/).length).toBeGreaterThan(0);
			});

			// Default shows assigned column
			expect(screen.getByRole("tab", { name: /Назначено/ })).toHaveAttribute("aria-selected", "true");

			// Switch to В работе
			await user.click(screen.getByRole("tab", { name: /В работе/ }));

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: /В работе/ })).toHaveAttribute("aria-selected", "true");
			});
		});
	});
});
