import { DndContext } from "@dnd-kit/core";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Task } from "@/data/task-types";
import { makeTask } from "@/test-utils";
import { TaskBoard, type TaskBoardProps } from "./task-board";

function makeColumn(tasks: Task[] = [], isLoading = false) {
	return { tasks, isLoading, hasNextPage: false, isFetchingNextPage: false, loadMore: () => {} };
}

function renderBoard(overrides: Partial<TaskBoardProps["columns"]> = {}) {
	const columns = {
		assigned: makeColumn(),
		in_progress: makeColumn(),
		completed: makeColumn(),
		archived: makeColumn(),
		...overrides,
	};
	return render(<TaskBoard columns={columns} />);
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
			assigned: makeColumn([makeTask("t1", { title: "Alpha" }), makeTask("t2", { title: "Beta" })]),
			in_progress: makeColumn([makeTask("t3", { title: "Gamma" })]),
			completed: makeColumn([]),
			archived: makeColumn([
				makeTask("t4", { title: "Delta" }),
				makeTask("t5", { title: "Epsilon" }),
				makeTask("t6", { title: "Zeta" }),
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
			assigned: makeColumn([makeTask("t1", { title: "Task Alpha" })]),
			in_progress: makeColumn([makeTask("t2", { title: "Task Beta" })]),
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
						completed: makeColumn([makeTask("t3", { status: "completed", answer: "Done" })]),
						archived: makeColumn([makeTask("t4", { status: "archived" })]),
					}}
				/>
			</DndContext>,
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
						completed: makeColumn([makeTask("t3", { status: "completed", answer: "Done" })]),
						archived: makeColumn(),
					}}
				/>
			</DndContext>,
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
		);

		for (const status of ["assigned", "in_progress", "completed", "archived"]) {
			const col = screen.getByTestId(`column-${status}`);
			expect(col.querySelector("[data-droppable-id]") ?? col.getAttribute("data-droppable-id")).toBeTruthy();
		}
	});
});
