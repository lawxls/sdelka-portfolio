import { useState } from "react";
import { STATUS_LABELS, TASK_STATUSES, type Task, type TaskStatus } from "@/data/task-types";
import { cn } from "@/lib/utils";
import { TaskColumn } from "./task-column";

interface ColumnData {
	tasks: Task[];
	isLoading: boolean;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	loadMore: () => void;
}

export interface TaskBoardProps {
	columns: Record<TaskStatus, ColumnData>;
	onTaskClick?: (taskId: string) => void;
	activeTaskId?: string;
	activeTaskStatus?: TaskStatus;
	isMobile?: boolean;
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

export function TaskBoard({ columns, onTaskClick, activeTaskId, activeTaskStatus, isMobile }: TaskBoardProps) {
	const [activeTab, setActiveTab] = useState<TaskStatus>("assigned");

	if (isMobile) {
		return (
			<div className="flex min-h-0 flex-1 flex-col" data-testid="task-board">
				<div role="tablist" className="flex shrink-0 border-b border-border">
					{TASK_STATUSES.map((status) => (
						<button
							key={status}
							role="tab"
							type="button"
							aria-selected={activeTab === status}
							onClick={() => setActiveTab(status)}
							className={cn(
								"flex-1 px-2 py-2.5 text-sm transition-colors",
								activeTab === status
									? "border-b-2 border-primary font-medium text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{STATUS_LABELS[status]}
						</button>
					))}
				</div>
				<div className="min-h-0 flex-1 p-4">
					<TaskColumn
						key={activeTab}
						status={activeTab}
						label={STATUS_LABELS[activeTab]}
						tasks={columns[activeTab].tasks}
						isLoading={columns[activeTab].isLoading}
						onTaskClick={onTaskClick}
						hasNextPage={columns[activeTab].hasNextPage}
						isFetchingNextPage={columns[activeTab].isFetchingNextPage}
						loadMore={columns[activeTab].loadMore}
						hideHeader
					/>
				</div>
			</div>
		);
	}

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
					draggableCards
					activeTaskId={activeTaskId}
					isValidDrop={activeTaskStatus ? isValidTransition(activeTaskStatus, status) : false}
					hasNextPage={columns[status].hasNextPage}
					isFetchingNextPage={columns[status].isFetchingNextPage}
					loadMore={columns[status].loadMore}
				/>
			))}
		</div>
	);
}
