import { Bell } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NOTIFICATION_ICONS, NOTIFICATION_TITLES, type Notification } from "@/data/notification-types";
import { useAllItems } from "@/data/use-items";
import { useMarkAllNotificationsAsRead, useMarkNotificationAsRead, useNotifications } from "@/data/use-notifications";
import { useAllSuppliers } from "@/data/use-suppliers";
import { useAllTasks } from "@/data/use-tasks";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ResolvedNotification {
	notification: Notification;
	title: string;
	context: string | null;
	href: string | null;
}

function resolveNotification(
	n: Notification,
	lookups: {
		itemName: (id: string) => string | undefined;
		taskName: (id: string) => { name: string; itemName: string } | undefined;
		supplierName: (id: string) => string | undefined;
	},
): ResolvedNotification {
	const title = NOTIFICATION_TITLES[n.type];
	switch (n.type) {
		case "search_completed": {
			const itemName = lookups.itemName(n.itemId);
			return {
				notification: n,
				title,
				context: itemName ?? null,
				href: itemName ? `/procurement?item=${encodeURIComponent(n.itemId)}` : null,
			};
		}
		case "task_assigned":
		case "task_deadline_24h": {
			const task = lookups.taskName(n.taskId);
			return {
				notification: n,
				title,
				context: task ? `${task.name} · ${task.itemName}` : null,
				href: task ? `/tasks?task=${encodeURIComponent(n.taskId)}` : null,
			};
		}
		case "offer_received": {
			const itemName = lookups.itemName(n.itemId);
			const supplierName = lookups.supplierName(n.supplierId);
			const parts = [supplierName, itemName].filter(Boolean) as string[];
			return {
				notification: n,
				title,
				context: parts.length > 0 ? parts.join(" · ") : null,
				href:
					itemName && supplierName
						? `/procurement?item=${encodeURIComponent(n.itemId)}&supplier=${encodeURIComponent(n.supplierId)}`
						: null,
			};
		}
		case "negotiation_completed": {
			const itemName = lookups.itemName(n.itemId);
			return {
				notification: n,
				title,
				context: itemName ?? null,
				href: itemName ? `/procurement?item=${encodeURIComponent(n.itemId)}` : null,
			};
		}
	}
}

export function NotificationsPopover() {
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);
	const [everOpened, setEverOpened] = useState(false);

	const { notifications, isRead, unreadCount } = useNotifications();
	const itemsQ = useAllItems({ enabled: everOpened });
	const tasksQ = useAllTasks({ enabled: everOpened });
	const suppliersQ = useAllSuppliers({ enabled: everOpened });

	const markOne = useMarkNotificationAsRead();
	const markAll = useMarkAllNotificationsAsRead();
	const navigate = useNavigate();

	const lookups = useMemo(() => {
		const itemMap = new Map((itemsQ.data ?? []).map((i) => [i.id, i.name]));
		const taskMap = new Map((tasksQ.data ?? []).map((t) => [t.id, { name: t.name, itemName: t.item.name }]));
		const supplierMap = new Map((suppliersQ.data ?? []).map((s) => [s.id, s.companyName]));
		return {
			itemName: (id: string) => itemMap.get(id),
			taskName: (id: string) => taskMap.get(id),
			supplierName: (id: string) => supplierMap.get(id),
		};
	}, [itemsQ.data, tasksQ.data, suppliersQ.data]);

	const resolved = useMemo(
		() => notifications.filter((n) => !isRead(n.id)).map((n) => resolveNotification(n, lookups)),
		[notifications, isRead, lookups],
	);

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (next) setEverOpened(true);
	}

	function handleRowClick(href: string | null) {
		if (!href) return;
		setOpen(false);
		navigate(href);
	}

	function handleMarkOne(id: string) {
		markOne.mutate(id);
	}

	function handleMarkAll() {
		if (unreadCount === 0) return;
		markAll.mutate();
	}

	const trigger = (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label="Уведомления"
			className="relative text-muted-foreground hover:text-foreground"
		>
			<Bell className="size-5" aria-hidden="true" />
			{unreadCount > 0 && (
				<span
					aria-hidden="true"
					className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-sidebar"
				/>
			)}
			<span className="sr-only">{unreadCount > 0 ? `Есть непрочитанные уведомления (${unreadCount})` : ""}</span>
		</Button>
	);

	const body = (
		<NotificationsBody
			resolved={resolved}
			unreadCount={unreadCount}
			onRowClick={handleRowClick}
			onMarkOne={handleMarkOne}
			onMarkAll={handleMarkAll}
		/>
	);

	if (isMobile) {
		return (
			<Sheet open={open} onOpenChange={handleOpenChange}>
				<SheetTrigger asChild>{trigger}</SheetTrigger>
				<SheetContent side="bottom" size="full" className="gap-0 overflow-hidden p-0">
					{body}
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>{trigger}</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>Уведомления</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" className="max-h-[480px] w-[380px] gap-0 overflow-hidden p-0">
				{body}
			</PopoverContent>
		</Popover>
	);
}

interface NotificationsBodyProps {
	resolved: ResolvedNotification[];
	unreadCount: number;
	onRowClick: (href: string | null) => void;
	onMarkOne: (id: string) => void;
	onMarkAll: () => void;
}

function NotificationsBody({ resolved, unreadCount, onRowClick, onMarkOne, onMarkAll }: NotificationsBodyProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-3 pr-12 md:py-2 md:pr-3">
				<div className="font-heading text-sm font-medium text-foreground">Уведомления</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="relative h-7 px-2 text-xs tabular-nums after:absolute after:inset-[-6px] after:content-['']"
					disabled={unreadCount === 0}
					onClick={onMarkAll}
				>
					Прочитать все{unreadCount > 0 ? ` (${unreadCount})` : ""}
				</Button>
			</div>
			{resolved.length === 0 ? (
				<EmptyState />
			) : (
				<ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
					{resolved.map((item) => (
						<NotificationRow key={item.notification.id} resolved={item} onRowClick={onRowClick} onMarkOne={onMarkOne} />
					))}
				</ul>
			)}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
			<Bell className="size-8 text-muted-foreground/60" aria-hidden="true" />
			<div className="text-sm text-muted-foreground">Непрочитанных уведомлений нет</div>
		</div>
	);
}

interface NotificationRowProps {
	resolved: ResolvedNotification;
	onRowClick: (href: string | null) => void;
	onMarkOne: (id: string) => void;
}

function NotificationRow({ resolved, onRowClick, onMarkOne }: NotificationRowProps) {
	const { notification, title, context, href } = resolved;
	const Icon = NOTIFICATION_ICONS[notification.type];
	const disabled = href === null;

	function handleClick() {
		if (disabled) return;
		onRowClick(href);
	}

	function handleMarkClick() {
		onMarkOne(notification.id);
	}

	const content = (
		<>
			<div className="mt-0.5 shrink-0 text-foreground">
				<Icon className="size-4" aria-hidden="true" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex items-center gap-1.5">
					{!disabled && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-destructive" />}
					<div className="truncate text-sm text-foreground">{title}</div>
				</div>
				{context && <div className="truncate text-xs text-muted-foreground">{context}</div>}
				<div className="flex items-center gap-2 pt-0.5 text-xs text-muted-foreground">
					<time
						dateTime={notification.createdAt}
						title={formatDateTime(notification.createdAt)}
						className="tabular-nums"
					>
						{formatRelativeTime(notification.createdAt)}
					</time>
					{disabled && <span>· Недоступно</span>}
				</div>
			</div>
		</>
	);

	const surfaceClass = cn(
		"flex w-full gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0",
		disabled && "cursor-default text-muted-foreground",
	);

	return (
		<li className="relative">
			{disabled ? (
				<div className={surfaceClass} aria-disabled="true">
					{content}
				</div>
			) : (
				<button
					type="button"
					onClick={handleClick}
					className={cn(
						surfaceClass,
						"cursor-pointer pr-20 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
					)}
				>
					{content}
				</button>
			)}
			{!disabled && (
				<button
					type="button"
					onClick={handleMarkClick}
					className="absolute right-3 bottom-2.5 text-xs text-muted-foreground transition-[scale,opacity,color] duration-150 hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none active:scale-[0.96] after:absolute after:inset-[-12px] after:content-['']"
				>
					Прочитать
				</button>
			)}
		</li>
	);
}
