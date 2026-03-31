import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_ICONS, STATUS_LABELS, type TaskStatus } from "@/data/task-types";
import { useSubmitAnswer, useTask, useUpdateTaskStatus } from "@/data/use-tasks";
import { formatDateTime } from "@/lib/format";

interface TaskDrawerProps {
	taskId: string | null;
	onClose: () => void;
	answerFirstMode?: boolean;
	onAnswerFirstComplete?: () => void;
	isMobile?: boolean;
}

export function TaskDrawer({ taskId, onClose, answerFirstMode, onAnswerFirstComplete, isMobile }: TaskDrawerProps) {
	return (
		<Sheet
			open={taskId !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-dvh" : undefined}>
				{taskId && (
					<TaskDrawerContent
						key={taskId}
						taskId={taskId}
						onClose={onClose}
						answerFirstMode={answerFirstMode}
						onAnswerFirstComplete={onAnswerFirstComplete}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}

function TaskDrawerContent({
	taskId,
	onClose,
	answerFirstMode,
	onAnswerFirstComplete,
}: {
	taskId: string;
	onClose: () => void;
	answerFirstMode?: boolean;
	onAnswerFirstComplete?: () => void;
}) {
	const { data: task } = useTask(taskId);
	const updateStatus = useUpdateTaskStatus();
	const submitAnswerMutation = useSubmitAnswer();

	const [answerText, setAnswerText] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	if (!task) {
		return (
			<SheetHeader>
				<SheetTitle>Загрузка…</SheetTitle>
			</SheetHeader>
		);
	}

	// local const so TS narrows `task` inside closures below the early-return guard
	const currentTask = task;
	const isAnswered = currentTask.completedResponse != null;

	function handleStatusChange(value: string) {
		const newStatus = value as TaskStatus;
		if (newStatus === "completed" && !isAnswered) {
			toast.info("Ответьте на вопрос, чтобы перевести задачу в «Завершено»");
			setTimeout(() => textareaRef.current?.focus(), 0);
			return;
		}
		updateStatus.mutate({ id: currentTask.id, status: newStatus });
	}

	function handleSubmitAnswer() {
		if (!answerText.trim()) return;
		submitAnswerMutation.mutate(
			{ id: currentTask.id, answer: answerText.trim(), attachments: files.map((f) => f.name) },
			{
				onSuccess: () => {
					toast.success("Ответ отправлен");
					if (answerFirstMode) onAnswerFirstComplete?.();
					onClose();
				},
			},
		);
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const selected = e.target.files;
		if (selected) {
			setFiles((prev) => [...prev, ...Array.from(selected)]);
		}
		e.target.value = "";
	}

	function removeFile(name: string) {
		setFiles((prev) => {
			const idx = prev.findIndex((f) => f.name === name);
			return idx === -1 ? prev : prev.filter((_, i) => i !== idx);
		});
	}

	return (
		<>
			<SheetHeader className="flex-row items-start justify-between gap-4 pr-12">
				<div className="min-w-0 flex-1">
					<SheetTitle>{task.name}</SheetTitle>
					<SheetDescription>{task.item.name}</SheetDescription>
				</div>
				{isAnswered ? (
					<Badge variant="secondary">{STATUS_LABELS[task.status]}</Badge>
				) : (
					<Select value={task.status} onValueChange={handleStatusChange}>
						<SelectTrigger size="sm" aria-label="Статус задачи">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([value, label]) => {
								const Icon = STATUS_ICONS[value];
								return (
									<SelectItem key={value} value={value}>
										<Icon className="size-4 text-muted-foreground" aria-hidden="true" />
										{label}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
				)}
			</SheetHeader>

			<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
				<time className="block text-xs text-muted-foreground" dateTime={task.createdAt}>
					{formatDateTime(task.createdAt)}
				</time>

				<p className="text-sm">{task.description}</p>

				{isAnswered ? (
					<div className="rounded-lg bg-muted p-3">
						<p className="text-xs font-medium text-muted-foreground">Ответ</p>
						<p className="mt-1 text-sm">{task.completedResponse}</p>
					</div>
				) : (
					<div className="space-y-3">
						<div className="rounded-lg border focus-within:ring-2 focus-within:ring-ring">
							<Textarea
								ref={textareaRef}
								value={answerText}
								onChange={(e) => setAnswerText(e.target.value)}
								placeholder="Введите ответ…"
								className="border-0 shadow-none focus-visible:ring-0"
							/>
							{files.length > 0 && (
								<ul className="space-y-1 px-3 pb-2">
									{files.map((file) => (
										<li key={file.name} className="flex items-center gap-2 text-sm">
											<span className="truncate">{file.name}</span>
											<button
												type="button"
												onClick={() => removeFile(file.name)}
												className="shrink-0 text-muted-foreground hover:text-foreground"
												aria-label={`Удалить ${file.name}`}
											>
												<X className="size-3.5" aria-hidden="true" />
											</button>
										</li>
									))}
								</ul>
							)}
							<div className="flex items-center justify-between border-t px-2 py-1.5">
								<div className="flex items-center">
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => fileInputRef.current?.click()}
										aria-label="Прикрепить файл"
									>
										<Paperclip className="size-4" aria-hidden="true" />
									</Button>
									<input
										ref={fileInputRef}
										type="file"
										className="hidden"
										multiple
										onChange={handleFileChange}
										tabIndex={-1}
									/>
								</div>
								<Button
									size="sm"
									onClick={handleSubmitAnswer}
									disabled={!answerText.trim() || submitAnswerMutation.isPending}
								>
									{submitAnswerMutation.isPending ? "Отправка…" : "Отправить"}
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
