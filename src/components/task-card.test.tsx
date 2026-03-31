import { DndContext } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeTask, TooltipWrapper } from "@/test-utils";
import { TaskCard } from "./task-card";

const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

describe("TaskCard", () => {
	const task = makeTask("t1", {
		name: "Согласование цены",
		item: { id: "item-1", name: "Арматура А500С", companyId: "c-1" },
		assignee: { id: "u-1", firstName: "Алексей", lastName: "Иванов", email: "a@test.com", avatarIcon: "blue" },
		createdAt: "2026-03-15T10:00:00.000Z",
		deadlineAt: "2099-04-15T18:00:00.000Z",
		questionCount: 3,
	});

	it("renders name and item name", () => {
		render(<TaskCard task={task} />, { wrapper: TooltipWrapper });
		expect(screen.getByText("Согласование цены")).toBeInTheDocument();
		expect(screen.getByText("Арматура А500С")).toBeInTheDocument();
	});

	it("renders assignee initials with accessible name", () => {
		render(<TaskCard task={task} />, { wrapper: TooltipWrapper });
		expect(screen.getByLabelText("Иванов Алексей")).toHaveTextContent("ИА");
	});

	it("renders formatted dates with labels", () => {
		render(<TaskCard task={task} />, { wrapper: TooltipWrapper });
		const expectedCreated = fmt.format(new Date("2026-03-15T10:00:00.000Z"));
		const expectedDeadline = fmt.format(new Date("2099-04-15T18:00:00.000Z"));
		expect(screen.getByText(expectedCreated)).toBeInTheDocument();
		expect(screen.getByText(expectedDeadline)).toBeInTheDocument();
		expect(screen.getByText(/Создана/)).toBeInTheDocument();
		expect(screen.getByText(/Дедлайн/)).toBeInTheDocument();
	});

	it("renders question count with correct pluralization", () => {
		const { rerender } = render(<TaskCard task={makeTask("t-plur", { questionCount: 1 })} />, {
			wrapper: TooltipWrapper,
		});
		expect(screen.getByText(/1\s+вопрос$/)).toBeInTheDocument();

		rerender(<TaskCard task={makeTask("t-plur", { questionCount: 2 })} />);
		expect(screen.getByText(/2\s+вопроса/)).toBeInTheDocument();

		rerender(<TaskCard task={makeTask("t-plur", { questionCount: 5 })} />);
		expect(screen.getByText(/5\s+вопросов/)).toBeInTheDocument();

		rerender(<TaskCard task={makeTask("t-plur", { questionCount: 11 })} />);
		expect(screen.getByText(/11\s+вопросов/)).toBeInTheDocument();
	});

	it("highlights overdue deadline in red", () => {
		const overdueTask = makeTask("t-overdue", {
			deadlineAt: "2020-01-01T00:00:00.000Z",
		});
		render(<TaskCard task={overdueTask} />, { wrapper: TooltipWrapper });
		const deadline = screen.getByTestId("deadline-t-overdue");
		expect(deadline.closest("[class*='text-destructive']")).toBeInTheDocument();
	});

	it("does not highlight future deadline", () => {
		render(<TaskCard task={task} />, { wrapper: TooltipWrapper });
		const deadline = screen.getByTestId("deadline-t1");
		expect(deadline.closest("[class*='text-destructive']")).not.toBeInTheDocument();
	});

	it("calls onClick when clicked", async () => {
		const handleClick = vi.fn();
		render(<TaskCard task={task} onClick={handleClick} />, { wrapper: TooltipWrapper });
		const user = userEvent.setup();
		await user.click(screen.getByTestId("task-card-t1"));
		expect(handleClick).toHaveBeenCalledOnce();
	});

	it("has draggable aria-roledescription when draggable", () => {
		render(
			<DndContext>
				<TaskCard task={task} onClick={() => {}} draggable />
			</DndContext>,
			{ wrapper: TooltipWrapper },
		);
		const card = screen.getByTestId("task-card-t1");
		expect(card.getAttribute("aria-roledescription")).toBe("draggable");
	});

	it("does not have draggable attributes when draggable is false", () => {
		render(
			<DndContext>
				<TaskCard task={task} onClick={() => {}} />
			</DndContext>,
			{ wrapper: TooltipWrapper },
		);
		const card = screen.getByTestId("task-card-t1");
		expect(card.getAttribute("aria-roledescription")).not.toBe("draggable");
	});

	it("reduces opacity when isDragging is true", () => {
		render(<TaskCard task={task} onClick={() => {}} isDragging />, { wrapper: TooltipWrapper });
		const card = screen.getByTestId("task-card-t1");
		expect(card.className).toContain("opacity-50");
	});

	it("renders placeholder for null assignee", () => {
		const unassigned = makeTask("t-none", { assignee: null });
		render(<TaskCard task={unassigned} />, { wrapper: TooltipWrapper });
		expect(screen.getByLabelText("Не назначен")).toHaveTextContent("?");
	});
});
