import type { LucideIcon } from "lucide-react";
import {
	Archive,
	CalendarClock,
	CalendarPlus,
	EllipsisVertical,
	MessageCircleQuestion,
	UserRound,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { ChatComposer } from "@/components/chat-composer";
import { SupplierDetailDrawer } from "@/components/supplier-detail-drawer";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { SupplierQuestion, TaskAssignee } from "@/data/task-types";
import { useSupplier } from "@/data/use-suppliers";
import { useSubmitAnswer, useTask, useUpdateTaskStatus } from "@/data/use-tasks";
import { formatAssigneeName, formatDate, formatDateTime, formatDayMonthShortTime, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

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
			<SheetContent side={isMobile ? "bottom" : "right"} size={isMobile ? "full" : undefined} showCloseButton={false}>
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

function InfoTile({
	icon: Icon,
	label,
	children,
	variant = "default",
}: {
	icon: LucideIcon;
	label: string;
	children: ReactNode;
	variant?: "default" | "warning";
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2.5",
				variant === "warning" && "bg-destructive/5",
			)}
		>
			<Icon
				className={cn("size-3.5 shrink-0 text-muted-foreground", variant === "warning" && "text-destructive")}
				aria-hidden="true"
			/>
			<div className="flex min-w-0 flex-col gap-0.5 leading-tight">
				<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
				<span
					className={cn(
						"truncate text-[13px] font-medium text-foreground",
						variant === "warning" && "text-destructive",
					)}
				>
					{children}
				</span>
			</div>
		</div>
	);
}

function AssigneeTile({ assignee }: { assignee: TaskAssignee | null }) {
	return (
		<InfoTile icon={UserRound} label="Назначена">
			{formatAssigneeName(assignee)}
		</InfoTile>
	);
}

interface SupplierCardProps {
	question: SupplierQuestion;
	onClick: () => void;
}

function SupplierCard({ question, onClick }: SupplierCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			data-testid={`supplier-question-card-${question.id}`}
			className={cn(
				"group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors",
				"hover:border-ring/40 hover:bg-muted/30",
				"focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
			)}
		>
			<span className="truncate text-sm font-medium text-foreground group-hover:text-foreground">
				{question.supplierName}
			</span>
			<time dateTime={question.askedAt} className="shrink-0 tabular-nums text-xs text-muted-foreground">
				{formatDayMonthShortTime(question.askedAt)}
			</time>
		</button>
	);
}

function SuppliersSection({
	questions,
	onSelect,
}: {
	questions: SupplierQuestion[];
	onSelect: (supplierId: string) => void;
}) {
	if (questions.length === 0) return null;
	const many = questions.length > 10;
	return (
		<section>
			<h3 className="mb-2 text-sm font-medium text-foreground">Поставщики, задавшие вопрос</h3>
			<div
				className={cn("flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-1.5", many && "max-h-80 overflow-y-auto")}
				data-testid="suppliers-list"
			>
				{questions.map((q) => (
					<SupplierCard key={q.id} question={q} onClick={() => onSelect(q.supplierId)} />
				))}
			</div>
		</section>
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
	const submitAnswerMutation = useSubmitAnswer();
	const updateStatus = useUpdateTaskStatus();

	const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);
	const itemId = task?.item.id ?? "";
	const { data: activeSupplier } = useSupplier(itemId, activeSupplierId);

	if (!task) {
		return (
			<SheetHeader>
				<SheetTitle>Загрузка…</SheetTitle>
				<SheetDescription className="sr-only">Загрузка данных задачи</SheetDescription>
			</SheetHeader>
		);
	}

	const currentTask = task;
	const isAnswered = !!currentTask.completedResponse;
	const overdue = isOverdue(currentTask.deadlineAt);

	async function handleSend(body: string, files: File[]) {
		await submitAnswerMutation.mutateAsync({
			id: currentTask.id,
			answer: body,
			files: files.length > 0 ? files : undefined,
		});
		toast.success("Ответ отправлен");
		if (answerFirstMode) onAnswerFirstComplete?.();
		onClose();
	}

	function handleArchive() {
		updateStatus.mutate(
			{ id: currentTask.id, status: "archived" },
			{
				onSuccess: () => {
					toast.success("Задача отправлена в архив");
					onClose();
				},
			},
		);
	}

	return (
		<>
			<SheetHeader className="relative border-b pr-24 pb-4">
				<SheetTitle className="pr-4">{currentTask.name}</SheetTitle>
				<SheetDescription className="text-xs">{currentTask.item.name}</SheetDescription>
				<div className="absolute top-3 right-3 flex items-center gap-1">
					{!isAnswered && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon-sm" aria-label="Действия" disabled={updateStatus.isPending}>
									<EllipsisVertical aria-hidden="true" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onSelect={handleArchive}>
									<Archive className="size-3.5" />В архив
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
					<SheetClose asChild>
						<Button variant="ghost" size="icon-sm" aria-label="Закрыть">
							<X aria-hidden="true" />
						</Button>
					</SheetClose>
				</div>
			</SheetHeader>

			<div className="flex-1 overflow-y-auto px-4 py-4">
				<div className="flex flex-col gap-5">
					<div className="grid grid-cols-2 gap-1.5">
						<InfoTile icon={CalendarPlus} label="Создана">
							<time dateTime={currentTask.createdAt} className="tabular-nums">
								{formatDateTime(currentTask.createdAt)}
							</time>
						</InfoTile>
						<InfoTile icon={CalendarClock} label="Дедлайн" variant={overdue ? "warning" : "default"}>
							<time dateTime={currentTask.deadlineAt} className="tabular-nums">
								{formatDate(currentTask.deadlineAt)}
							</time>
						</InfoTile>
						<AssigneeTile assignee={currentTask.assignee} />
						<InfoTile icon={MessageCircleQuestion} label="Вопросы">
							<span className="tabular-nums">{currentTask.questionCount}</span>
						</InfoTile>
					</div>

					<section>
						<h3 className="mb-1.5 text-sm font-medium text-foreground">Описание</h3>
						<p className="text-sm text-foreground/90">{currentTask.description}</p>
					</section>

					<SuppliersSection questions={currentTask.supplierQuestions} onSelect={setActiveSupplierId} />

					{isAnswered && (
						<section className="rounded-lg border border-primary/20 bg-primary/5 p-3" data-testid="task-answer-panel">
							<p className="text-xs font-medium uppercase tracking-wide text-primary/90">Ответ</p>
							<p className="mt-1 text-sm text-foreground">{currentTask.completedResponse}</p>
						</section>
					)}
				</div>
			</div>

			{!isAnswered && (
				<div className="shrink-0 bg-popover px-4 pt-1 pb-3" data-testid="task-chat-composer">
					<ChatComposer
						onSend={handleSend}
						isPending={submitAnswerMutation.isPending}
						error={submitAnswerMutation.error?.message ?? null}
						placeholder="Написать ответ…"
					/>
				</div>
			)}

			<SupplierDetailDrawer
				supplier={activeSupplier ?? null}
				open={activeSupplierId !== null}
				onClose={() => setActiveSupplierId(null)}
			/>
		</>
	);
}
