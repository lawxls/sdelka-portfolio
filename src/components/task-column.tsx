import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task, TaskStatus } from "@/data/task-types";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";

interface TaskColumnProps {
	status: TaskStatus;
	label: string;
	tasks: Task[];
	isLoading: boolean;
	onTaskClick?: (taskId: string) => void;
	draggableCards?: boolean;
	activeTaskId?: string;
	isValidDrop?: boolean;
}

export function TaskColumn({
	status,
	label,
	tasks,
	isLoading,
	onTaskClick,
	draggableCards,
	activeTaskId,
	isValidDrop,
}: TaskColumnProps) {
	const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
	const showHighlight = isOver && isValidDrop;

	return (
		<section className="flex min-h-0 flex-col" data-testid={`column-${status}`}>
			<div className="flex shrink-0 items-center gap-2 px-1 pb-2">
				<h2 className="text-sm font-medium">{label}</h2>
				<Badge variant="secondary" className="tabular-nums">
					{tasks.length}
				</Badge>
			</div>
			<div
				ref={setNodeRef}
				data-droppable-id={`column-${status}`}
				className={cn(
					"flex-1 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-2 scrollbar-hover transition-colors",
					showHighlight && "ring-2 ring-primary/50 bg-primary/5",
				)}
			>
				{isLoading
					? ["sk-1", "sk-2", "sk-3"].map((key) => <Skeleton key={key} className="h-24 rounded-lg" />)
					: tasks.map((task) => (
							<TaskCard
								key={task.id}
								task={task}
								onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
								draggable={draggableCards && status !== "completed"}
								isDragging={activeTaskId === task.id}
							/>
						))}
			</div>
		</section>
	);
}
