import { Building2, Layers, ListTodo, type LucideIcon, Mail, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EmployeePermissions, PermissionLevel, PermissionModuleKey } from "@/data/types";
import { PERMISSION_MODULE_LABELS } from "@/data/types";
import { cn } from "@/lib/utils";

const PERMISSION_MODULES: { key: PermissionModuleKey; Icon: LucideIcon }[] = [
	{ key: "procurement", Icon: Layers },
	{ key: "tasks", Icon: ListTodo },
	{ key: "companies", Icon: Building2 },
	{ key: "employees", Icon: Users },
	{ key: "emails", Icon: Mail },
];

const PERMISSION_LEVELS: { value: PermissionLevel; label: string; short: string }[] = [
	{ value: "none", label: "Нет доступа", short: "Нет" },
	{ value: "view", label: "Просмотр", short: "Просмотр" },
	{ value: "edit", label: "Редактирование", short: "Редакт." },
];

const LEVEL_LABEL: Record<PermissionLevel, string> = Object.fromEntries(
	PERMISSION_LEVELS.map((l) => [l.value, l.label]),
) as Record<PermissionLevel, string>;

const GRID_COLS = "minmax(0,1fr) repeat(3, 4.5rem)";

const ICON_TINT: Record<PermissionLevel, string> = {
	edit: "text-green-600 dark:text-green-400",
	view: "text-yellow-600 dark:text-yellow-400",
	none: "text-red-500/60 dark:text-red-400/60",
};

const DOT_FILL: Record<PermissionLevel, string> = {
	edit: "bg-green-600 dark:bg-green-400",
	view: "bg-yellow-500 dark:bg-yellow-400",
	none: "bg-red-500/70 dark:bg-red-400/70",
};

export function PermissionsMatrix({
	permissions,
	onChange,
	mode,
}: {
	permissions: EmployeePermissions;
	onChange: (module: PermissionModuleKey, level: PermissionLevel) => void;
	mode: "view" | "edit";
}) {
	if (mode === "view") {
		return (
			<div className="flex items-center gap-2" data-testid="permissions-matrix">
				{PERMISSION_MODULES.map((mod) => {
					const level = permissions[mod.key];
					const label = PERMISSION_MODULE_LABELS[mod.key];
					return (
						<Tooltip key={mod.key}>
							<TooltipTrigger asChild>
								<div className="rounded-md bg-muted/50 p-1.5" data-testid={`perm-row-${mod.key}`}>
									<mod.Icon className={`size-5 ${ICON_TINT[level]}`} aria-hidden="true" />
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs">
								{label}: {LEVEL_LABEL[level]}
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
		);
	}

	const allSame: PermissionLevel | null = (() => {
		const first = permissions[PERMISSION_MODULES[0].key];
		return PERMISSION_MODULES.every((m) => permissions[m.key] === first) ? first : null;
	})();

	function setAll(level: PermissionLevel) {
		for (const mod of PERMISSION_MODULES) {
			if (permissions[mod.key] !== level) onChange(mod.key, level);
		}
	}

	return (
		<div
			className="flex w-full flex-col gap-1.5 rounded-lg border border-border bg-muted/20 p-3"
			data-testid="permissions-matrix"
		>
			<div
				className="grid items-center gap-x-3 px-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80"
				style={{ gridTemplateColumns: GRID_COLS }}
			>
				<span />
				{PERMISSION_LEVELS.map((lvl) => (
					<span key={lvl.value} className="text-center">
						{lvl.short}
					</span>
				))}
			</div>

			<div
				className="grid items-center gap-x-3 rounded-md bg-background/60 px-1 py-1.5"
				style={{ gridTemplateColumns: GRID_COLS }}
				data-testid="perm-row-all"
			>
				<span className="truncate text-xs font-medium text-foreground">Все модули</span>
				{PERMISSION_LEVELS.map((lvl) => (
					<MatrixDot
						key={lvl.value}
						active={allSame === lvl.value}
						level={lvl.value}
						label={`Установить всем «${lvl.label}»`}
						testId={`perm-all-${lvl.value}`}
						onClick={() => setAll(lvl.value)}
					/>
				))}
			</div>

			<div className="my-0.5 h-px bg-border/60" aria-hidden="true" />

			{PERMISSION_MODULES.map((mod) => {
				const level = permissions[mod.key];
				const label = PERMISSION_MODULE_LABELS[mod.key];
				return (
					<div
						key={mod.key}
						className="grid items-center gap-x-3 px-1 py-0.5"
						style={{ gridTemplateColumns: GRID_COLS }}
						data-testid={`perm-row-${mod.key}`}
					>
						<div className="flex min-w-0 items-center gap-2">
							<mod.Icon className={cn("size-4 shrink-0", ICON_TINT[level])} aria-hidden="true" />
							<span className="truncate text-xs font-medium">{label}</span>
						</div>
						{PERMISSION_LEVELS.map((lvl) => (
							<MatrixDot
								key={lvl.value}
								active={level === lvl.value}
								level={lvl.value}
								label={`${label}: ${lvl.label}`}
								testId={`perm-${mod.key}-${lvl.value}`}
								onClick={() => onChange(mod.key, lvl.value)}
							/>
						))}
					</div>
				);
			})}
		</div>
	);
}

function MatrixDot({
	active,
	level,
	label,
	testId,
	onClick,
}: {
	active: boolean;
	level: PermissionLevel;
	label: string;
	testId: string;
	onClick: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-pressed={active}
					aria-label={label}
					data-testid={testId}
					onClick={onClick}
					className="group relative mx-auto inline-flex size-9 items-center justify-center rounded-full transition-[background-color,scale] duration-150 ease-out hover:bg-muted/60 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100 after:absolute after:inset-[-2px] after:content-['']"
				>
					<span
						className={cn(
							"block size-2.5 rounded-full transition-[background-color,box-shadow,scale] duration-150 ease-out",
							active
								? cn(DOT_FILL[level], "scale-110 shadow-[0_0_0_3px_var(--color-background)]")
								: "bg-transparent ring-1 ring-inset ring-muted-foreground/30 group-hover:ring-muted-foreground/60",
						)}
					/>
				</button>
			</TooltipTrigger>
			<TooltipContent side="top" className="text-xs">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}
