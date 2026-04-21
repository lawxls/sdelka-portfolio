import type { Task } from "@/data/task-types";
import { formatAssigneeName, formatDayMonthShort, formatDayMonthShortTime, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TaskCardProps {
	task: Task;
	onClick: (id: string) => void;
	hideItemName?: boolean;
}

export function TaskCard({ task, onClick, hideItemName }: TaskCardProps) {
	const overdue = isOverdue(task.deadlineAt);
	const assigneeName = formatAssigneeName(task.assignee);

	return (
		<button
			type="button"
			data-testid={`task-row-${task.id}`}
			onClick={() => onClick(task.id)}
			className="w-full rounded-lg border bg-background p-4 text-left touch-manipulation transition-[background-color,border-color,scale] duration-150 ease-out hover:bg-muted/50 active:bg-muted active:scale-[0.99] motion-reduce:active:scale-100"
		>
			<div className="min-w-0 line-clamp-2 text-sm font-medium break-words">{task.name}</div>
			{!hideItemName && <div className="mt-0.5 truncate text-xs text-muted-foreground">{task.item.name}</div>}
			<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				<div>
					<div className="text-xs text-muted-foreground">Назначена</div>
					<div className="truncate">{assigneeName}</div>
				</div>
				<div>
					<div className="text-xs text-muted-foreground">Вопросы</div>
					<div className="tabular-nums">{task.questionCount > 0 ? task.questionCount : "\u2014"}</div>
				</div>
				<div>
					<div className="text-xs text-muted-foreground">Дедлайн</div>
					<time dateTime={task.deadlineAt} className={cn("tabular-nums", overdue && "font-medium text-destructive")}>
						{formatDayMonthShort(task.deadlineAt)}
					</time>
				</div>
				<div>
					<div className="text-xs text-muted-foreground">Создана</div>
					<time dateTime={task.createdAt} className="tabular-nums">
						{formatDayMonthShortTime(task.createdAt)}
					</time>
				</div>
			</div>
		</button>
	);
}
