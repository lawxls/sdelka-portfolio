import { useSearchParams } from "react-router";
import { TaskBoard } from "@/components/task-board";
import { TaskDrawer } from "@/components/task-drawer";
import { useTaskColumns } from "@/data/use-tasks";

export function TasksPage() {
	const columns = useTaskColumns();
	const [searchParams, setSearchParams] = useSearchParams();
	const taskId = searchParams.get("task");

	function openTask(id: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("task", id);
				return next;
			},
			{ replace: true },
		);
	}

	function closeTask() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("task");
				return next;
			},
			{ replace: true },
		);
	}

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<header className="sticky top-0 z-30 flex shrink-0 items-center gap-md border-b border-border bg-background px-lg py-sm">
				<h1 className="text-lg tracking-tight">Задачи</h1>
			</header>
			<TaskBoard columns={columns} onTaskClick={openTask} />
			<TaskDrawer taskId={taskId} onClose={closeTask} />
		</div>
	);
}
