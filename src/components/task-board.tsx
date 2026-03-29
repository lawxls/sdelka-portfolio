import type { Task, TaskStatus } from "@/data/task-types";
import { TaskColumn } from "./task-column";

const COLUMNS: { status: TaskStatus; label: string }[] = [
	{ status: "assigned", label: "Назначено" },
	{ status: "in_progress", label: "В работе" },
	{ status: "completed", label: "Завершено" },
	{ status: "archived", label: "Архив" },
];

interface ColumnData {
	tasks: Task[];
	isLoading: boolean;
}

export interface TaskBoardProps {
	columns: Record<TaskStatus, ColumnData>;
}

export function TaskBoard({ columns }: TaskBoardProps) {
	return (
		<div className="grid min-h-0 flex-1 grid-cols-4 gap-4 p-4" data-testid="task-board">
			{COLUMNS.map(({ status, label }) => (
				<TaskColumn
					key={status}
					status={status}
					label={label}
					tasks={columns[status].tasks}
					isLoading={columns[status].isLoading}
				/>
			))}
		</div>
	);
}
