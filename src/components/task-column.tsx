import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/data/task-types";
import { TaskCard } from "./task-card";

interface TaskColumnProps {
	status: string;
	label: string;
	tasks: Task[];
	isLoading: boolean;
	onTaskClick?: (taskId: string) => void;
}

export function TaskColumn({ status, label, tasks, isLoading, onTaskClick }: TaskColumnProps) {
	return (
		<section className="flex min-h-0 flex-col" data-testid={`column-${status}`}>
			<div className="flex shrink-0 items-center gap-2 px-1 pb-2">
				<h2 className="text-sm font-medium">{label}</h2>
				<Badge variant="secondary" className="tabular-nums">
					{tasks.length}
				</Badge>
			</div>
			<div className="flex-1 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-2 scrollbar-hover">
				{isLoading
					? ["sk-1", "sk-2", "sk-3"].map((key) => <Skeleton key={key} className="h-24 rounded-lg" />)
					: tasks.map((task) => (
							<TaskCard key={task.id} task={task} onClick={onTaskClick ? () => onTaskClick(task.id) : undefined} />
						))}
			</div>
		</section>
	);
}
