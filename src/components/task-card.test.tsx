import { DndContext } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeTask } from "@/test-utils";
import { TaskCard } from "./task-card";

const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

describe("TaskCard", () => {
	const task = makeTask("t1", {
		title: "Согласование цены",
		procurementItemName: "Арматура А500С",
		assignee: { name: "Иванов Алексей", initials: "ИА" },
		createdAt: "2026-03-15T10:00:00.000Z",
		deadline: "2099-04-15T18:00:00.000Z",
		questionCount: 3,
	});

	it("renders title and procurement item name", () => {
		render(<TaskCard task={task} />);
		expect(screen.getByText("Согласование цены")).toBeInTheDocument();
		expect(screen.getByText("Арматура А500С")).toBeInTheDocument();
	});

	it("renders assignee initials with accessible name", () => {
		render(<TaskCard task={task} />);
		expect(screen.getByLabelText("Иванов Алексей")).toHaveTextContent("ИА");
	});

	it("renders formatted dates", () => {
		render(<TaskCard task={task} />);
		const expectedCreated = fmt.format(new Date("2026-03-15T10:00:00.000Z"));
		const expectedDeadline = fmt.format(new Date("2099-04-15T18:00:00.000Z"));
		expect(screen.getByText(expectedCreated)).toBeInTheDocument();
		expect(screen.getByText(expectedDeadline)).toBeInTheDocument();
	});

	it("renders question count with correct pluralization", () => {
		const { rerender } = render(<TaskCard task={makeTask("t-plur", { questionCount: 1 })} />);
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
			deadline: "2020-01-01T00:00:00.000Z",
		});
		render(<TaskCard task={overdueTask} />);
		const deadline = screen.getByTestId("deadline-t-overdue");
		expect(deadline.className).toContain("text-destructive");
	});

	it("does not highlight future deadline", () => {
		render(<TaskCard task={task} />);
		const deadline = screen.getByTestId("deadline-t1");
		expect(deadline.className).not.toContain("text-destructive");
	});

	it("calls onClick when clicked", async () => {
		const handleClick = vi.fn();
		render(<TaskCard task={task} onClick={handleClick} />);
		const user = userEvent.setup();
		await user.click(screen.getByTestId("task-card-t1"));
		expect(handleClick).toHaveBeenCalledOnce();
	});

	it("has draggable aria-roledescription when draggable", () => {
		render(
			<DndContext>
				<TaskCard task={task} onClick={() => {}} draggable />
			</DndContext>,
		);
		const card = screen.getByTestId("task-card-t1");
		expect(card.getAttribute("aria-roledescription")).toBe("draggable");
	});

	it("does not have draggable attributes when draggable is false", () => {
		render(
			<DndContext>
				<TaskCard task={task} onClick={() => {}} />
			</DndContext>,
		);
		const card = screen.getByTestId("task-card-t1");
		expect(card.getAttribute("aria-roledescription")).not.toBe("draggable");
	});

	it("reduces opacity when isDragging is true", () => {
		render(<TaskCard task={task} onClick={() => {}} isDragging />);
		const card = screen.getByTestId("task-card-t1");
		expect(card.className).toContain("opacity-50");
	});
});
