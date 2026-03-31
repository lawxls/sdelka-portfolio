import { useDraggable } from "@dnd-kit/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task } from "@/data/task-types";
import { getAvatarColor } from "@/lib/avatar-colors";
import { formatAssigneeName, formatShortDate, pluralizeRu } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TaskCardProps {
	task: Task;
	onClick?: () => void;
	draggable?: boolean;
	isDragging?: boolean;
}

function getAssigneeInitials(assignee: Task["assignee"]): string {
	if (!assignee) return "?";
	return `${assignee.lastName[0]}${assignee.firstName[0]}`;
}

export function TaskCard({ task, onClick, draggable, isDragging }: TaskCardProps) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: task.id,
		disabled: !draggable,
	});
	const isOverdue = new Date(task.deadlineAt) < new Date();

	return (
		<article
			ref={draggable ? setNodeRef : undefined}
			className={cn(
				"rounded-lg border bg-background p-4",
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
					<Tooltip>
						<TooltipTrigger asChild>
							<p className="line-clamp-2 min-h-[2lh] text-sm font-medium">{task.name}</p>
						</TooltipTrigger>
						<TooltipContent side="top">{task.name}</TooltipContent>
					</Tooltip>
					<p className="truncate text-xs text-muted-foreground">{task.item.name}</p>
				</div>
				{task.assignee ? (
					<span
						role="img"
						className={cn(
							"flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white",
							getAvatarColor(task.assignee.avatarIcon),
						)}
						aria-label={formatAssigneeName(task.assignee)}
					>
						{getAssigneeInitials(task.assignee)}
					</span>
				) : (
					<span
						role="img"
						className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground"
						aria-label="Не назначен"
					>
						?
					</span>
				)}
			</div>
			<div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
				<div className="flex items-center gap-3">
					<span>
						Создана <time dateTime={task.createdAt}>{formatShortDate(task.createdAt)}</time>
					</span>
					<span className={cn(isOverdue && "font-medium text-destructive")}>
						Дедлайн{" "}
						<time dateTime={task.deadlineAt} data-testid={`deadline-${task.id}`}>
							{formatShortDate(task.deadlineAt)}
						</time>
					</span>
				</div>
				<span>{pluralizeRu(task.questionCount, "вопрос", "вопроса", "вопросов")}</span>
			</div>
		</article>
	);
}
