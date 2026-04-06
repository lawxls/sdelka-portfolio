import { useDraggable } from "@dnd-kit/core";
import { MessageCircleQuestion } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task } from "@/data/task-types";
import { getAvatarColor } from "@/lib/avatar-colors";
import { formatAssigneeName, formatDayMonth, getInitials, isOverdue, pluralizeRu } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TaskCardProps {
	task: Task;
	onClick?: () => void;
	draggable?: boolean;
	isDragging?: boolean;
	hideItemName?: boolean;
	showQuestionCount?: boolean;
	compact?: boolean;
}

export function TaskCard({
	task,
	onClick,
	draggable,
	isDragging,
	hideItemName,
	showQuestionCount,
	compact,
}: TaskCardProps) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: task.id,
		disabled: !draggable,
	});
	const overdue = isOverdue(task.deadlineAt);

	const title = compact ? (
		<p className="truncate text-sm font-medium">{task.name}</p>
	) : (
		<Tooltip>
			<TooltipTrigger asChild>
				<p className="line-clamp-2 min-h-[2lh] text-sm font-medium">{task.name}</p>
			</TooltipTrigger>
			<TooltipContent side="top">{task.name}</TooltipContent>
		</Tooltip>
	);

	return (
		<article
			ref={draggable ? setNodeRef : undefined}
			className={cn(
				"rounded-lg border bg-background",
				compact ? "px-3 py-2" : "p-4",
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
			<div className="min-w-0">{title}</div>
			{!hideItemName && <p className="truncate text-xs text-muted-foreground">{task.item.name}</p>}
			<div
				className={cn("flex items-center justify-between text-xs text-muted-foreground", compact ? "mt-1.5" : "mt-4")}
			>
				<div className="flex items-center gap-3">
					<span>
						Создана <time dateTime={task.createdAt}>{formatDayMonth(task.createdAt)}</time>
					</span>
					<span className={cn(overdue && "font-medium text-destructive")}>
						Дедлайн{" "}
						<time dateTime={task.deadlineAt} data-testid={`deadline-${task.id}`}>
							{formatDayMonth(task.deadlineAt)}
						</time>
					</span>
					{showQuestionCount && (
						<span className="inline-flex items-center gap-1">
							<MessageCircleQuestion className="size-3.5" aria-hidden="true" />
							{pluralizeRu(task.questionCount, "вопрос", "вопроса", "вопросов")}
						</span>
					)}
				</div>
				{task.assignee ? (
					<span
						role="img"
						className={cn(
							"flex shrink-0 items-center justify-center rounded-full text-xs font-medium text-white",
							compact ? "size-6" : "size-7",
							getAvatarColor(task.assignee.avatarIcon),
						)}
						aria-label={formatAssigneeName(task.assignee)}
					>
						{getInitials(task.assignee.firstName, task.assignee.lastName)}
					</span>
				) : (
					<span
						role="img"
						className={cn(
							"flex shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground",
							compact ? "size-6" : "size-7",
						)}
						aria-label="Не назначен"
					>
						?
					</span>
				)}
			</div>
		</article>
	);
}
