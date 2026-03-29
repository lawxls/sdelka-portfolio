import { STATUS_LABELS, TASK_STATUSES, type Task, type TaskStatus } from "@/data/task-types";
import { TaskColumn } from "./task-column";

interface ColumnData {
	tasks: Task[];
	isLoading: boolean;
}

export interface TaskBoardProps {
	columns: Record<TaskStatus, ColumnData>;
	onTaskClick?: (taskId: string) => void;
	activeTaskId?: string;
	activeTaskStatus?: TaskStatus;
}

/** Which statuses each source status can transition to */
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
	assigned: ["in_progress", "completed", "archived"],
	in_progress: ["assigned", "completed", "archived"],
	completed: [],
	archived: ["assigned", "in_progress"],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
	return ALLOWED_TRANSITIONS[from].includes(to);
}

export function TaskBoard({ columns, onTaskClick, activeTaskId, activeTaskStatus }: TaskBoardProps) {
	return (
		<div className="grid min-h-0 flex-1 grid-cols-4 gap-4 p-4" data-testid="task-board">
			{TASK_STATUSES.map((status) => (
				<TaskColumn
					key={status}
					status={status}
					label={STATUS_LABELS[status]}
					tasks={columns[status].tasks}
					isLoading={columns[status].isLoading}
					onTaskClick={onTaskClick}
					draggableCards={!!activeTaskId || true}
					activeTaskId={activeTaskId}
					isValidDrop={activeTaskStatus ? isValidTransition(activeTaskStatus, status) : false}
				/>
			))}
		</div>
	);
}
