import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	pointerWithin,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { Columns3, List } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { isValidTransition, TaskBoard } from "@/components/task-board";
import { TaskCard } from "@/components/task-card";
import { TaskDrawer } from "@/components/task-drawer";
import { TaskTable } from "@/components/task-table";
import { TaskToolbar } from "@/components/task-toolbar";
import { Button } from "@/components/ui/button";
import type { Task, TaskFilterParams, TaskSortField, TaskStatus } from "@/data/task-types";
import { TASK_STATUSES } from "@/data/task-types";
import { useProcurementItems, useTaskColumns, useUpdateTaskStatus } from "@/data/use-tasks";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { anchorDragOverlayToCursor } from "@/lib/drag-overlay";

const DRAG_OVERLAY_MODIFIERS = [anchorDragOverlayToCursor];

const SORT_FIELDS = new Set<string>(["createdAt", "deadline", "questionCount"]);

function findTaskInColumns(columns: Record<TaskStatus, { tasks: Task[] }>, taskId: string): Task | undefined {
	for (const status of TASK_STATUSES) {
		const found = columns[status].tasks.find((t) => t.id === taskId);
		if (found) return found;
	}
	return undefined;
}

type ViewMode = "board" | "table";

function parseSort(params: URLSearchParams): { field: TaskSortField; direction: "asc" | "desc" } | null {
	const field = params.get("sort");
	const dir = params.get("dir");
	if (!field || !SORT_FIELDS.has(field) || (dir !== "asc" && dir !== "desc")) return null;
	return { field: field as TaskSortField, direction: dir };
}

export function TasksPage() {
	const isMobile = useIsMobile();
	const [searchParams, setSearchParams] = useSearchParams();
	const taskId = searchParams.get("task");
	const view = (searchParams.get("view") ?? "board") as ViewMode;
	const search = searchParams.get("q") ?? "";
	const activeItem = searchParams.get("item") ?? undefined;
	const sort = parseSort(searchParams);

	const filterParams: TaskFilterParams = {
		...(search && { q: search }),
		...(activeItem && { item: activeItem }),
		...(sort && { sort: sort.field, dir: sort.direction }),
	};

	const columns = useTaskColumns(filterParams);
	const { data: procurementItems = [] } = useProcurementItems();
	const updateStatus = useUpdateTaskStatus();

	// Drag state
	const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
	);

	// Answer-first flow state
	const [pendingDrag, setPendingDrag] = useState<{ taskId: string } | null>(null);

	function openTask(id: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("task", id);
				return next;
			},
			{ replace: true },
		);
	}

	function closeTask() {
		if (pendingDrag) {
			setPendingDrag(null);
		}
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("task");
				return next;
			},
			{ replace: true },
		);
	}

	function setView(mode: ViewMode) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (mode === "board") {
					next.delete("view");
				} else {
					next.set("view", mode);
				}
				return next;
			},
			{ replace: true },
		);
	}

	function handleSearchChange(query: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (query) next.set("q", query);
				else next.delete("q");
				return next;
			},
			{ replace: true },
		);
	}

	function handleItemFilter(item: string | undefined) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (item) next.set("item", item);
				else next.delete("item");
				return next;
			},
			{ replace: true },
		);
	}

	function handleSort(field: TaskSortField) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			const currentField = next.get("sort");
			const currentDir = next.get("dir");
			if (currentField === field) {
				if (currentDir === "asc") {
					next.set("dir", "desc");
				} else {
					next.delete("sort");
					next.delete("dir");
				}
			} else {
				next.set("sort", field);
				next.set("dir", "asc");
			}
			return next;
		});
	}

	function handleDragStart(event: DragStartEvent) {
		const task = findTaskInColumns(columns, String(event.active.id));
		setActiveTask(task ?? null);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveTask(null);
		if (!event.over) return;

		const taskId = String(event.active.id);
		const targetColumnId = String(event.over.id);
		const targetStatus = targetColumnId.replace("column-", "") as TaskStatus;

		const task = findTaskInColumns(columns, taskId);
		if (!task) return;

		// Same column — no-op
		if (task.status === targetStatus) return;

		// Validate transition
		if (!isValidTransition(task.status, targetStatus)) return;

		// Answer-first flow: dragging to completed opens drawer
		if (targetStatus === "completed") {
			setPendingDrag({ taskId });
			openTask(taskId);
			toast.info("Ответьте на вопрос, чтобы перевести задачу в «Завершено»");
			return;
		}

		// Normal transition
		updateStatus.mutate({ id: taskId, status: targetStatus });
	}

	function handleAnswerFirstComplete() {
		setPendingDrag(null);
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={pointerWithin}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
				<header className="sticky top-0 z-30 flex shrink-0 items-center gap-md border-b border-border bg-background px-lg py-sm">
					<h1 className="text-lg tracking-tight">Задачи</h1>
					<TaskToolbar
						defaultSearch={search}
						onSearchChange={handleSearchChange}
						sort={sort}
						onSort={handleSort}
						activeItem={activeItem}
						onItemFilter={handleItemFilter}
						procurementItems={procurementItems}
					/>
					<div className="flex items-center gap-1">
						<Button
							variant={view === "board" ? "secondary" : "ghost"}
							size="icon-sm"
							onClick={() => setView("board")}
							aria-label="Kanban"
						>
							<Columns3 className="size-4" aria-hidden="true" />
						</Button>
						<Button
							variant={view === "table" ? "secondary" : "ghost"}
							size="icon-sm"
							onClick={() => setView("table")}
							aria-label="Таблица"
						>
							<List className="size-4" aria-hidden="true" />
						</Button>
					</div>
				</header>
				{view === "board" ? (
					<TaskBoard
						columns={columns}
						onTaskClick={openTask}
						activeTaskId={activeTask?.id}
						activeTaskStatus={activeTask?.status}
						isMobile={isMobile}
					/>
				) : (
					<TaskTable onTaskClick={openTask} filterParams={filterParams} />
				)}
				<TaskDrawer
					taskId={taskId}
					onClose={closeTask}
					answerFirstMode={pendingDrag !== null}
					onAnswerFirstComplete={handleAnswerFirstComplete}
					isMobile={isMobile}
				/>
			</div>

			{!isMobile && (
				<DragOverlay dropAnimation={reducedMotion ? null : undefined} modifiers={DRAG_OVERLAY_MODIFIERS}>
					{activeTask ? <TaskCard task={activeTask} /> : null}
				</DragOverlay>
			)}
		</DndContext>
	);
}
