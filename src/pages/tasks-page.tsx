import { TaskBoard } from "@/components/task-board";
import { useTaskColumns } from "@/data/use-tasks";

export function TasksPage() {
	const columns = useTaskColumns();

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<header className="sticky top-0 z-30 flex shrink-0 items-center gap-md border-b border-border bg-background px-lg py-sm">
				<h1 className="text-lg tracking-tight">Задачи</h1>
			</header>
			<TaskBoard columns={columns} />
		</div>
	);
}
