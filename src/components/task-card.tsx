import { useDraggable } from "@dnd-kit/core";
import type { Task } from "@/data/task-types";
import { formatShortDate, pluralizeRu } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TaskCardProps {
	task: Task;
	onClick?: () => void;
	draggable?: boolean;
	isDragging?: boolean;
}

export function TaskCard({ task, onClick, draggable, isDragging }: TaskCardProps) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: task.id,
		disabled: !draggable,
	});
	const isOverdue = new Date(task.deadline) < new Date();

	return (
		<article
			ref={draggable ? setNodeRef : undefined}
			className={cn(
				"rounded-lg border bg-background p-3",
				onClick &&
					"cursor-pointer transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isDragging && "opacity-50",
			)}
			data-testid={`task-card-${task.id}`}
			onClick={onClick}
			onKeyDown={
				onClick
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick();
							}
						}
					: undefined
			}
			{...(draggable
				? { ...attributes, ...listeners }
				: { tabIndex: onClick ? 0 : undefined, role: onClick ? "button" : undefined })}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate text-sm font-medium">{task.title}</p>
					<p className="truncate text-xs text-muted-foreground">{task.procurementItemName}</p>
				</div>
				<span
					role="img"
					className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
					aria-label={task.assignee.name}
				>
					{task.assignee.initials}
				</span>
			</div>
			<div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
				<div className="flex items-center gap-2">
					<time dateTime={task.createdAt}>{formatShortDate(task.createdAt)}</time>
					<time
						dateTime={task.deadline}
						className={cn(isOverdue && "font-medium text-destructive")}
						data-testid={`deadline-${task.id}`}
					>
						{formatShortDate(task.deadline)}
					</time>
				</div>
				<span>{pluralizeRu(task.questionCount, "вопрос", "вопроса", "вопросов")}</span>
			</div>
		</article>
	);
}
