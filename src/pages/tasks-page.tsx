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
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { PageToolbar } from "@/components/page-toolbar";
import { isValidTransition, TaskBoard } from "@/components/task-board";
import { TaskCard } from "@/components/task-card";
import { TaskDrawer } from "@/components/task-drawer";
import { TaskTable } from "@/components/task-table";
import { TaskToolbar } from "@/components/task-toolbar";
import { TotalCount } from "@/components/total-count";
import type { Task, TaskFilterParams, TaskSortField, TaskStatus } from "@/data/task-types";
import { TASK_STATUSES } from "@/data/task-types";
import { useProcurementCompanies } from "@/data/use-companies";
import { useItemSearch, useTaskColumns, useUpdateTaskStatus } from "@/data/use-tasks";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { anchorDragOverlayToCursor } from "@/lib/drag-overlay";

const DRAG_OVERLAY_MODIFIERS = [anchorDragOverlayToCursor];

const SORT_FIELDS = new Set<string>(["created_at", "deadline_at", "question_count"]);

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
	const company = searchParams.get("company") ?? undefined;
	const sort = parseSort(searchParams);

	const { data: companies = [] } = useProcurementCompanies();
	const [itemSearchQuery, setItemSearchQuery] = useState("");
	const itemSearch = useItemSearch(itemSearchQuery);

	const filterParams: TaskFilterParams = {
		...(search && { q: search }),
		...(activeItem && { item: activeItem }),
		...(company && { company }),
		...(sort && { sort: sort.field, dir: sort.direction }),
	};

	const columns = useTaskColumns(filterParams);
	const updateStatus = useUpdateTaskStatus();

	const taskTotalLoading = columns.assigned.isLoading;
	const taskTotal = taskTotalLoading
		? undefined
		: columns.assigned.count + columns.in_progress.count + columns.completed.count + columns.archived.count;

	// Drag state
	const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
	);

	// Answer-first flow state
	const [pendingDrag, setPendingDrag] = useState<{ taskId: string } | null>(null);

	function updateParams(modifier: (p: URLSearchParams) => void, replace = true) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				modifier(next);
				return next;
			},
			{ replace },
		);
	}

	function openTask(id: string) {
		updateParams((p) => p.set("task", id));
	}

	function closeTask() {
		if (pendingDrag) setPendingDrag(null);
		updateParams((p) => p.delete("task"));
	}

	function setView(mode: ViewMode) {
		updateParams((p) => (mode === "board" ? p.delete("view") : p.set("view", mode)));
	}

	function handleItemFilter(item: string | undefined) {
		updateParams((p) => (item ? p.set("item", item) : p.delete("item")));
	}

	function handleCompanySelect(companyId: string | undefined) {
		updateParams((p) => (companyId ? p.set("company", companyId) : p.delete("company")));
	}

	function handleSort(field: TaskSortField) {
		updateParams((p) => {
			const currentField = p.get("sort");
			const currentDir = p.get("dir");
			if (currentField === field) {
				if (currentDir === "asc") {
					p.set("dir", "desc");
				} else {
					p.delete("sort");
					p.delete("dir");
				}
			} else {
				p.set("sort", field);
				p.set("dir", "asc");
			}
		}, false);
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

	const taskToolbar = (
		<TaskToolbar
			sort={sort}
			onSort={handleSort}
			activeItem={activeItem}
			onItemFilter={handleItemFilter}
			onItemSearch={setItemSearchQuery}
			itemSearchResults={itemSearch.data ?? []}
			companies={companies}
			activeCompany={company}
			onCompanySelect={handleCompanySelect}
			view={view}
			onViewChange={setView}
		/>
	);

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={pointerWithin}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
				<PageToolbar
					left={<TotalCount value={taskTotal} isLoading={taskTotalLoading} forms={["задача", "задачи", "задач"]} />}
					middle={taskToolbar}
				/>
				{view === "board" ? (
					<TaskBoard
						columns={columns}
						onTaskClick={openTask}
						activeTaskId={activeTask?.id}
						activeTaskStatus={activeTask?.status}
						isMobile={isMobile}
					/>
				) : (
					<TaskTable onTaskClick={openTask} filterParams={filterParams} isMobile={isMobile} />
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
