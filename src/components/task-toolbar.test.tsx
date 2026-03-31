import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskToolbar } from "./task-toolbar";

describe("TaskToolbar", () => {
	const defaultProps = {
		onSearchChange: vi.fn(),
		onItemFilter: vi.fn(),
		onSort: vi.fn(),
		sort: null as { field: string; direction: "asc" | "desc" } | null,
		activeItem: undefined as string | undefined,
		procurementItems: ["Арматура А500С", "Кабель ВВГнг 3×2.5", "Цемент М500"],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	function renderToolbar(overrides: Partial<typeof defaultProps> = {}) {
		return render(
			<TooltipProvider>
				<TaskToolbar {...defaultProps} {...overrides} />
			</TooltipProvider>,
		);
	}

	it("renders search input", () => {
		renderToolbar();
		expect(screen.getByPlaceholderText("Поиск…")).toBeInTheDocument();
	});

	it("calls onSearchChange after debounced input", async () => {
		const user = userEvent.setup();
		renderToolbar();

		await user.type(screen.getByPlaceholderText("Поиск…"), "арматур");

		await waitFor(() => {
			expect(defaultProps.onSearchChange).toHaveBeenCalledWith("арматур");
		});
	});

	it("renders sort button", () => {
		renderToolbar();
		expect(screen.getByRole("button", { name: "Сортировка" })).toBeInTheDocument();
	});

	it("shows 3 sort options in popover", async () => {
		const user = userEvent.setup();
		renderToolbar();

		await user.click(screen.getByRole("button", { name: "Сортировка" }));

		expect(screen.getByText("Дата создания")).toBeInTheDocument();
		expect(screen.getByText("Дедлайн")).toBeInTheDocument();
		expect(screen.getByText("Кол-во вопросов")).toBeInTheDocument();
	});

	it("calls onSort when sort option clicked", async () => {
		const user = userEvent.setup();
		renderToolbar();

		await user.click(screen.getByRole("button", { name: "Сортировка" }));
		await user.click(screen.getByText("Дедлайн"));

		expect(defaultProps.onSort).toHaveBeenCalledWith("deadline_at");
	});

	it("renders filter button", () => {
		renderToolbar();
		expect(screen.getByRole("button", { name: "Фильтр" })).toBeInTheDocument();
	});

	it("shows procurement items in filter popover", async () => {
		const user = userEvent.setup();
		renderToolbar();

		await user.click(screen.getByRole("button", { name: "Фильтр" }));

		expect(screen.getByText("Арматура А500С")).toBeInTheDocument();
		expect(screen.getByText("Кабель ВВГнг 3×2.5")).toBeInTheDocument();
		expect(screen.getByText("Цемент М500")).toBeInTheDocument();
	});

	it("calls onItemFilter when item clicked", async () => {
		const user = userEvent.setup();
		renderToolbar();

		await user.click(screen.getByRole("button", { name: "Фильтр" }));
		await user.click(screen.getByText("Арматура А500С"));

		expect(defaultProps.onItemFilter).toHaveBeenCalledWith("Арматура А500С");
	});

	it("shows active filter indicator dot", () => {
		renderToolbar({ activeItem: "Арматура А500С" });
		const filterBtn = screen.getByRole("button", { name: "Фильтр" });
		expect(filterBtn.querySelector("[data-indicator]")).toBeInTheDocument();
	});

	it("shows active sort indicator dot", () => {
		renderToolbar({ sort: { field: "deadline_at", direction: "asc" } });
		const sortBtn = screen.getByRole("button", { name: "Сортировка" });
		expect(sortBtn.querySelector("[data-indicator]")).toBeInTheDocument();
	});
});
