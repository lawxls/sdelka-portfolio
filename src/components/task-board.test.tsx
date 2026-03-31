import { DndContext } from "@dnd-kit/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Task } from "@/data/task-types";
import { makeTask, TooltipWrapper } from "@/test-utils";
import { isValidTransition, TaskBoard, type TaskBoardProps } from "./task-board";

function makeColumn(tasks: Task[] = [], isLoading = false) {
	return { tasks, isLoading, hasNextPage: false, isFetchingNextPage: false, loadMore: () => {} };
}

function renderBoard(overrides: Partial<TaskBoardProps["columns"]> = {}, isMobile = false) {
	const columns = {
		assigned: makeColumn(),
		in_progress: makeColumn(),
		completed: makeColumn(),
		archived: makeColumn(),
		...overrides,
	};
	return render(<TaskBoard columns={columns} isMobile={isMobile} />, { wrapper: TooltipWrapper });
}

describe("TaskBoard", () => {
	it("renders 4 columns with correct Russian labels", () => {
		renderBoard();
		for (const label of ["Назначено", "В работе", "Завершено", "Архив"]) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
	});

	it("shows card count badges for each column", () => {
		renderBoard({
			assigned: makeColumn([makeTask("t1", { name: "Alpha" }), makeTask("t2", { name: "Beta" })]),
			in_progress: makeColumn([makeTask("t3", { name: "Gamma" })]),
			completed: makeColumn([]),
			archived: makeColumn([
				makeTask("t4", { name: "Delta" }),
				makeTask("t5", { name: "Epsilon" }),
				makeTask("t6", { name: "Zeta" }),
			]),
		});

		const assignedCol = screen.getByTestId("column-assigned");
		expect(within(assignedCol).getByText("2")).toBeInTheDocument();

		const inProgressCol = screen.getByTestId("column-in_progress");
		expect(within(inProgressCol).getByText("1")).toBeInTheDocument();

		const completedCol = screen.getByTestId("column-completed");
		expect(within(completedCol).getByText("0")).toBeInTheDocument();

		const archivedCol = screen.getByTestId("column-archived");
		expect(within(archivedCol).getByText("3")).toBeInTheDocument();
	});

	it("renders task cards in correct columns", () => {
		renderBoard({
			assigned: makeColumn([makeTask("t1", { name: "Task Alpha" })]),
			in_progress: makeColumn([makeTask("t2", { name: "Task Beta" })]),
		});

		const assignedCol = screen.getByTestId("column-assigned");
		expect(within(assignedCol).getByText("Task Alpha")).toBeInTheDocument();

		const inProgressCol = screen.getByTestId("column-in_progress");
		expect(within(inProgressCol).getByText("Task Beta")).toBeInTheDocument();
	});

	it("does not render task cards when columns are loading", () => {
		renderBoard({
			assigned: makeColumn([], true),
			in_progress: makeColumn([], true),
			completed: makeColumn([], true),
			archived: makeColumn([], true),
		});

		expect(screen.queryAllByTestId(/^task-card-/)).toHaveLength(0);
	});

	it("cards in assigned/in_progress/archived columns are draggable", () => {
		render(
			<DndContext>
				<TaskBoard
					columns={{
						assigned: makeColumn([makeTask("t1", { status: "assigned" })]),
						in_progress: makeColumn([makeTask("t2", { status: "in_progress" })]),
						completed: makeColumn([makeTask("t3", { status: "completed", completedResponse: "Done" })]),
						archived: makeColumn([makeTask("t4", { status: "archived" })]),
					}}
				/>
			</DndContext>,
			{ wrapper: TooltipWrapper },
		);

		expect(screen.getByTestId("task-card-t1").getAttribute("aria-roledescription")).toBe("draggable");
		expect(screen.getByTestId("task-card-t2").getAttribute("aria-roledescription")).toBe("draggable");
		expect(screen.getByTestId("task-card-t4").getAttribute("aria-roledescription")).toBe("draggable");
	});

	it("cards in completed column are not draggable", () => {
		render(
			<DndContext>
				<TaskBoard
					columns={{
						assigned: makeColumn(),
						in_progress: makeColumn(),
						completed: makeColumn([makeTask("t3", { status: "completed", completedResponse: "Done" })]),
						archived: makeColumn(),
					}}
				/>
			</DndContext>,
			{ wrapper: TooltipWrapper },
		);

		expect(screen.getByTestId("task-card-t3").getAttribute("aria-roledescription")).not.toBe("draggable");
	});

	it("columns are drop targets", () => {
		render(
			<DndContext>
				<TaskBoard
					columns={{
						assigned: makeColumn(),
						in_progress: makeColumn(),
						completed: makeColumn(),
						archived: makeColumn(),
					}}
				/>
			</DndContext>,
			{ wrapper: TooltipWrapper },
		);

		for (const status of ["assigned", "in_progress", "completed", "archived"]) {
			const col = screen.getByTestId(`column-${status}`);
			expect(col.querySelector("[data-droppable-id]") ?? col.getAttribute("data-droppable-id")).toBeTruthy();
		}
	});
});

describe("isValidTransition", () => {
	it("allows assigned → in_progress, completed, archived", () => {
		expect(isValidTransition("assigned", "in_progress")).toBe(true);
		expect(isValidTransition("assigned", "completed")).toBe(true);
		expect(isValidTransition("assigned", "archived")).toBe(true);
	});

	it("allows in_progress → assigned, completed, archived", () => {
		expect(isValidTransition("in_progress", "assigned")).toBe(true);
		expect(isValidTransition("in_progress", "completed")).toBe(true);
		expect(isValidTransition("in_progress", "archived")).toBe(true);
	});

	it("blocks all transitions from completed", () => {
		expect(isValidTransition("completed", "assigned")).toBe(false);
		expect(isValidTransition("completed", "in_progress")).toBe(false);
		expect(isValidTransition("completed", "archived")).toBe(false);
	});

	it("allows archived → assigned, in_progress only", () => {
		expect(isValidTransition("archived", "assigned")).toBe(true);
		expect(isValidTransition("archived", "in_progress")).toBe(true);
		expect(isValidTransition("archived", "completed")).toBe(false);
	});
});

describe("TaskBoard mobile", () => {
	it("renders tab bar with column names when isMobile", () => {
		renderBoard({}, true);
		expect(screen.getByRole("tablist")).toBeInTheDocument();
		for (const label of ["Назначено", "В работе", "Завершено", "Архив"]) {
			expect(screen.getByRole("tab", { name: new RegExp(label) })).toBeInTheDocument();
		}
	});

	it("shows only active column cards when isMobile", () => {
		renderBoard(
			{
				assigned: makeColumn([makeTask("t1", { name: "Alpha" })]),
				in_progress: makeColumn([makeTask("t2", { name: "Beta" })]),
			},
			true,
		);
		// Default active tab is "assigned"
		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(screen.queryByText("Beta")).not.toBeInTheDocument();
	});

	it("switches column on tab click", async () => {
		const user = userEvent.setup();
		renderBoard(
			{
				assigned: makeColumn([makeTask("t1", { name: "Alpha" })]),
				in_progress: makeColumn([makeTask("t2", { name: "Beta" })]),
			},
			true,
		);

		await user.click(screen.getByRole("tab", { name: /В работе/ }));

		expect(screen.getByText("Beta")).toBeInTheDocument();
		expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
	});

	it("does not render 4-column grid when isMobile", () => {
		renderBoard({}, true);
		// Should not have 4 column sections visible
		expect(screen.queryAllByTestId(/^column-/)).toHaveLength(1);
	});
});
