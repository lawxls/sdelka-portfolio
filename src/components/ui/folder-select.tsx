import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FOLDER_COLORS, FOLDER_NAME_MAX_LENGTH, type Folder } from "@/data/types";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { cn } from "@/lib/utils";

interface FolderSelectProps {
	folders: Folder[];
	value: string | null;
	onChange: (folderId: string | null) => void;
	onCreateFolder: (name: string, color: string) => void;
	nextFolderColor: string;
	placeholder?: string;
	triggerAriaLabel?: string;
}

export function FolderSelect({
	folders,
	value,
	onChange,
	onCreateFolder,
	nextFolderColor,
	placeholder = "Без категории",
	triggerAriaLabel = "Категория",
}: FolderSelectProps) {
	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);

	const selected = value ? folders.find((f) => f.id === value) : undefined;

	function handleSelect(folderId: string | null) {
		onChange(folderId);
		setCreating(false);
		setOpen(false);
	}

	function handleCreate(name: string, color: string) {
		onCreateFolder(name, color);
		setCreating(false);
		setOpen(false);
	}

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setCreating(false);
			}}
		>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					aria-label={triggerAriaLabel}
					className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
				>
					<span className="flex min-w-0 flex-1 items-center gap-2">
						{selected && (
							<span
								className="size-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: `var(--folder-${selected.color})` }}
								aria-hidden="true"
							/>
						)}
						<span className="truncate">{selected ? selected.name : placeholder}</span>
					</span>
					<ChevronDown aria-hidden="true" className="ml-2 size-4 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-(--radix-popover-trigger-width) gap-1 p-1">
				<button
					type="button"
					onClick={() => handleSelect(null)}
					className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-hidden"
				>
					<span
						className="size-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground"
						aria-hidden="true"
					/>
					<span className="text-muted-foreground">{placeholder}</span>
				</button>
				{folders.map((folder) => (
					<button
						key={folder.id}
						type="button"
						onClick={() => handleSelect(folder.id)}
						className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-hidden"
					>
						<span
							className="size-2.5 shrink-0 rounded-full"
							style={{ backgroundColor: `var(--folder-${folder.color})` }}
							aria-hidden="true"
						/>
						<span className="truncate">{folder.name}</span>
					</button>
				))}
				<div className="my-1 border-t border-border" />
				{creating ? (
					<CreateFolderRow defaultColor={nextFolderColor} onSave={handleCreate} onCancel={() => setCreating(false)} />
				) : (
					<button
						type="button"
						onClick={() => setCreating(true)}
						className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-accent focus-visible:bg-accent focus-visible:outline-hidden"
					>
						<Plus className="size-3.5" aria-hidden="true" />
						<span>Создать категорию</span>
					</button>
				)}
			</PopoverContent>
		</Popover>
	);
}

export function CreateFolderRow({
	defaultColor,
	onSave,
	onCancel,
}: {
	defaultColor: string;
	onSave: (name: string, color: string) => void;
	onCancel: () => void;
}) {
	const [color, setColor] = useState(defaultColor);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const { inputRef, handleKeyDown, handleBlur } = useInlineEdit({
		onSave: (name) => onSave(name, color),
		onCancel,
		deferFocus: true,
	});

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center gap-2 rounded-md px-2 py-1.5">
				<button
					type="button"
					aria-label="Выбрать цвет категории"
					aria-expanded={paletteOpen}
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => setPaletteOpen((v) => !v)}
					className="flex shrink-0 items-center gap-0.5 rounded-sm px-0.5 py-0.5 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-hidden"
				>
					<span
						className="size-2.5 rounded-full"
						style={{ backgroundColor: `var(--folder-${color})` }}
						aria-hidden="true"
					/>
					<ChevronDown aria-hidden="true" className="size-3 opacity-60" />
				</button>
				<input
					ref={inputRef}
					type="text"
					className="h-5 flex-1 bg-transparent text-sm outline-none"
					placeholder="Название категории"
					maxLength={FOLDER_NAME_MAX_LENGTH}
					aria-label="Название категории"
					spellCheck={false}
					autoComplete="off"
					onKeyDown={handleKeyDown}
					onBlur={handleBlur}
				/>
			</div>
			{paletteOpen && (
				<fieldset aria-label="Цвет категории" className="flex flex-wrap gap-1.5 rounded-md bg-muted/40 px-2 py-2">
					{FOLDER_COLORS.map((c) => {
						const isSelected = c === color;
						return (
							<button
								key={c}
								type="button"
								aria-label={`Цвет: ${c}`}
								aria-pressed={isSelected}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => {
									setColor(c);
									setPaletteOpen(false);
								}}
								className={cn(
									"flex size-6 items-center justify-center rounded-full transition-[box-shadow] motion-reduce:transition-none",
									isSelected && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-popover",
								)}
								style={{ backgroundColor: `var(--folder-${c})` }}
							>
								{isSelected && <Check aria-hidden="true" className="size-3 text-white drop-shadow" />}
							</button>
						);
					})}
				</fieldset>
			)}
		</div>
	);
}
