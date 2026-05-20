import { Eye, EyeOff, LoaderCircle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { BulkCard } from "@/components/ui/bulk-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AddEmailPayload } from "@/data/emails-mock-data";
import { SURFACE_TINT } from "@/lib/class-presets";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InboxFormState {
	key: string;
	email: string;
	password: string;
	smtpHost: string;
	smtpPort: string;
	imapHost: string;
	imapPort: string;
}

function makeEmptyInbox(): InboxFormState {
	return {
		key: crypto.randomUUID(),
		email: "",
		password: "",
		smtpHost: "",
		smtpPort: "",
		imapHost: "",
		imapPort: "",
	};
}

interface InboxErrors {
	email: boolean;
	password: boolean;
	smtpHost: boolean;
	smtpPort: boolean;
	imapHost: boolean;
	imapPort: boolean;
}

function validateInbox(inbox: InboxFormState): InboxErrors {
	const trimmedEmail = inbox.email.trim();
	const smtpPortNum = Number.parseInt(inbox.smtpPort, 10);
	const imapPortNum = Number.parseInt(inbox.imapPort, 10);
	return {
		email: trimmedEmail === "" || !EMAIL_RE.test(trimmedEmail),
		password: inbox.password.trim() === "",
		smtpHost: inbox.smtpHost.trim() === "",
		smtpPort: inbox.smtpPort.trim() === "" || !Number.isFinite(smtpPortNum) || smtpPortNum <= 0,
		imapHost: inbox.imapHost.trim() === "",
		imapPort: inbox.imapPort.trim() === "" || !Number.isFinite(imapPortNum) || imapPortNum <= 0,
	};
}

function hasAnyError(errors: InboxErrors): boolean {
	return Object.values(errors).some(Boolean);
}

function inboxToPayload(inbox: InboxFormState): AddEmailPayload {
	return {
		email: inbox.email.trim(),
		password: inbox.password,
		smtpHost: inbox.smtpHost.trim(),
		smtpPort: Number.parseInt(inbox.smtpPort, 10),
		imapHost: inbox.imapHost.trim(),
		imapPort: Number.parseInt(inbox.imapPort, 10),
	};
}

interface AddEmailSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (payloads: AddEmailPayload[]) => void;
	isPending?: boolean;
}

export function AddEmailSheet({ open, onOpenChange, onSubmit, isPending }: AddEmailSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				showCloseButton={false}
				className="flex flex-col gap-0 max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none"
			>
				{open && <ConnectEmailForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} isPending={isPending} />}
			</SheetContent>
		</Sheet>
	);
}

function ConnectEmailForm({
	onSubmit,
	onCancel,
	isPending,
}: {
	onSubmit: (payloads: AddEmailPayload[]) => void;
	onCancel: () => void;
	isPending?: boolean;
}) {
	const [inboxes, setInboxes] = useState<InboxFormState[]>(() => [makeEmptyInbox()]);
	const [validated, setValidated] = useState(false);

	const errorsByRow = useMemo(() => inboxes.map(validateInbox), [inboxes]);
	const canSubmit = !errorsByRow.some(hasAnyError) && !isPending;

	function patch(key: string, change: Partial<Omit<InboxFormState, "key">>) {
		setInboxes((prev) => prev.map((row) => (row.key === key ? { ...row, ...change } : row)));
	}

	function addInbox() {
		setInboxes((prev) => [...prev, makeEmptyInbox()]);
	}

	function removeInbox(key: string) {
		setInboxes((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setValidated(true);
		if (!canSubmit) return;
		onSubmit(inboxes.map(inboxToPayload));
	}

	return (
		<>
			<SheetHeader className={cn("border-b pb-4", SURFACE_TINT)}>
				<SheetTitle>Добавить почту</SheetTitle>
				<SheetDescription className="sr-only">Подключение почтовых ящиков</SheetDescription>
			</SheetHeader>

			<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
				<div className="flex-1 overflow-y-auto px-4">
					<div className="flex flex-col gap-3 py-4">
						{inboxes.map((inbox, index) => (
							<InboxCard
								key={inbox.key}
								inbox={inbox}
								cardNumber={index + 1}
								canRemove={inboxes.length > 1}
								errors={validated ? errorsByRow[index] : null}
								onPatch={(change) => patch(inbox.key, change)}
								onRemove={() => removeInbox(inbox.key)}
							/>
						))}

						<Button type="button" variant="outline" size="sm" className="self-start" onClick={addInbox}>
							<Plus aria-hidden="true" />
							Добавить
						</Button>
					</div>
				</div>

				<SheetFooter className={cn("sticky bottom-0 flex-row justify-between border-t", SURFACE_TINT)}>
					<Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
						Отмена
					</Button>
					<Button type="submit" disabled={!canSubmit}>
						{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
						Подключить
					</Button>
				</SheetFooter>
			</form>
		</>
	);
}

function InboxCard({
	inbox,
	cardNumber,
	canRemove,
	errors,
	onPatch,
	onRemove,
}: {
	inbox: InboxFormState;
	cardNumber: number;
	canRemove: boolean;
	errors: InboxErrors | null;
	onPatch: (change: Partial<Omit<InboxFormState, "key">>) => void;
	onRemove: () => void;
}) {
	const [showPassword, setShowPassword] = useState(false);
	const fid = (name: string) => `${name}-${inbox.key}`;

	return (
		<BulkCard
			label={`Почта ${cardNumber}`}
			canRemove={canRemove}
			onRemove={onRemove}
			removeAriaLabel="Удалить почту"
			data-testid={`inbox-card-${cardNumber}`}
			className="gap-3"
		>
			<div className="flex flex-col gap-2">
				<FieldRow label="Email *" htmlFor={fid("email")}>
					<Input
						id={fid("email")}
						type="email"
						className={cn(errors?.email && "border-destructive")}
						value={inbox.email}
						onChange={(e) => onPatch({ email: e.target.value })}
						placeholder="user@example.com"
						aria-invalid={errors?.email || undefined}
						autoComplete="email"
						inputMode="email"
						spellCheck={false}
					/>
				</FieldRow>
				<FieldRow label="Пароль или App password *" htmlFor={fid("password")}>
					<div className="relative">
						<Input
							id={fid("password")}
							type={showPassword ? "text" : "password"}
							className={cn(errors?.password && "border-destructive", "pr-10")}
							value={inbox.password}
							onChange={(e) => onPatch({ password: e.target.value })}
							placeholder="••••••••"
							aria-invalid={errors?.password || undefined}
							autoComplete="new-password"
							spellCheck={false}
						/>
						<button
							type="button"
							onClick={() => setShowPassword((s) => !s)}
							aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
							className="absolute right-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:inset-[-6px] after:content-['']"
							tabIndex={-1}
						>
							{showPassword ? (
								<EyeOff className="size-4" aria-hidden="true" />
							) : (
								<Eye className="size-4" aria-hidden="true" />
							)}
						</button>
					</div>
				</FieldRow>

				<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
					<FieldRow label="SMTP хост *" htmlFor={fid("smtp-host")}>
						<Input
							id={fid("smtp-host")}
							className={cn(errors?.smtpHost && "border-destructive")}
							value={inbox.smtpHost}
							onChange={(e) => onPatch({ smtpHost: e.target.value })}
							placeholder="smtp.example.com"
							aria-invalid={errors?.smtpHost || undefined}
							autoComplete="off"
							spellCheck={false}
						/>
					</FieldRow>
					<FieldRow label="SMTP порт *" htmlFor={fid("smtp-port")}>
						<Input
							id={fid("smtp-port")}
							className={cn(errors?.smtpPort && "border-destructive", "tabular-nums")}
							value={inbox.smtpPort}
							onChange={(e) => onPatch({ smtpPort: e.target.value })}
							placeholder="465"
							aria-invalid={errors?.smtpPort || undefined}
							inputMode="numeric"
							autoComplete="off"
							spellCheck={false}
						/>
					</FieldRow>
				</div>

				<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
					<FieldRow label="IMAP хост *" htmlFor={fid("imap-host")}>
						<Input
							id={fid("imap-host")}
							className={cn(errors?.imapHost && "border-destructive")}
							value={inbox.imapHost}
							onChange={(e) => onPatch({ imapHost: e.target.value })}
							placeholder="imap.example.com"
							aria-invalid={errors?.imapHost || undefined}
							autoComplete="off"
							spellCheck={false}
						/>
					</FieldRow>
					<FieldRow label="IMAP порт *" htmlFor={fid("imap-port")}>
						<Input
							id={fid("imap-port")}
							className={cn(errors?.imapPort && "border-destructive", "tabular-nums")}
							value={inbox.imapPort}
							onChange={(e) => onPatch({ imapPort: e.target.value })}
							placeholder="993"
							aria-invalid={errors?.imapPort || undefined}
							inputMode="numeric"
							autoComplete="off"
							spellCheck={false}
						/>
					</FieldRow>
				</div>
			</div>
		</BulkCard>
	);
}

function FieldRow({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<label className="text-xs text-muted-foreground" htmlFor={htmlFor}>
				{label}
			</label>
			{children}
		</div>
	);
}
