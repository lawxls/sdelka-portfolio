import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AddEmailPayload } from "@/data/emails-mock-data";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
	email: string;
	password: string;
	smtpHost: string;
	smtpPort: string;
	imapHost: string;
	imapPort: string;
}

const EMPTY_FORM: FormState = {
	email: "",
	password: "",
	smtpHost: "",
	smtpPort: "",
	imapHost: "",
	imapPort: "",
};

interface AddEmailSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (payload: AddEmailPayload) => void;
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
	onSubmit: (payload: AddEmailPayload) => void;
	onCancel: () => void;
	isPending?: boolean;
}) {
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [validated, setValidated] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	function update<K extends keyof FormState>(field: K, value: FormState[K]) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	const trimmedEmail = form.email.trim();
	const emailFormatError = trimmedEmail !== "" && !EMAIL_RE.test(trimmedEmail);
	const smtpPortNum = Number.parseInt(form.smtpPort, 10);
	const imapPortNum = Number.parseInt(form.imapPort, 10);
	const smtpPortInvalid = form.smtpPort.trim() !== "" && (!Number.isFinite(smtpPortNum) || smtpPortNum <= 0);
	const imapPortInvalid = form.imapPort.trim() !== "" && (!Number.isFinite(imapPortNum) || imapPortNum <= 0);

	const canSubmit =
		trimmedEmail !== "" &&
		!emailFormatError &&
		form.password.trim() !== "" &&
		form.smtpHost.trim() !== "" &&
		form.smtpPort.trim() !== "" &&
		!smtpPortInvalid &&
		form.imapHost.trim() !== "" &&
		form.imapPort.trim() !== "" &&
		!imapPortInvalid &&
		!isPending;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setValidated(true);
		if (!canSubmit) return;
		onSubmit({
			email: trimmedEmail,
			password: form.password,
			smtpHost: form.smtpHost.trim(),
			smtpPort: smtpPortNum,
			imapHost: form.imapHost.trim(),
			imapPort: imapPortNum,
		});
	}

	const showEmailError = validated && (trimmedEmail === "" || emailFormatError);
	const showPasswordError = validated && form.password.trim() === "";
	const showSmtpHostError = validated && form.smtpHost.trim() === "";
	const showSmtpPortError = validated && (form.smtpPort.trim() === "" || smtpPortInvalid);
	const showImapHostError = validated && form.imapHost.trim() === "";
	const showImapPortError = validated && (form.imapPort.trim() === "" || imapPortInvalid);

	return (
		<>
			<SheetHeader className="border-b pb-4">
				<SheetTitle>Добавить почту</SheetTitle>
				<SheetDescription className="sr-only">Подключение почтового ящика</SheetDescription>
			</SheetHeader>

			<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
				<div className="flex-1 overflow-y-auto px-4">
					<div className="flex flex-col gap-6 py-4">
						<section className="flex flex-col gap-3">
							<h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Учётная запись
							</h3>
							<FieldRow label="Email *" htmlFor="email">
								<Input
									id="email"
									type="email"
									className={cn(showEmailError && "border-destructive")}
									value={form.email}
									onChange={(e) => update("email", e.target.value)}
									placeholder="user@example.com"
									aria-invalid={showEmailError || undefined}
									autoComplete="email"
									inputMode="email"
									spellCheck={false}
								/>
							</FieldRow>
							<FieldRow label="Пароль или App password *" htmlFor="password">
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										className={cn(showPasswordError && "border-destructive", "pr-10")}
										value={form.password}
										onChange={(e) => update("password", e.target.value)}
										placeholder="••••••••"
										aria-invalid={showPasswordError || undefined}
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
						</section>

						<section className="flex flex-col gap-3">
							<h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								SMTP (отправка)
							</h3>
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
								<FieldRow label="SMTP хост *" htmlFor="smtp-host">
									<Input
										id="smtp-host"
										className={cn(showSmtpHostError && "border-destructive")}
										value={form.smtpHost}
										onChange={(e) => update("smtpHost", e.target.value)}
										placeholder="smtp.example.com"
										aria-invalid={showSmtpHostError || undefined}
										autoComplete="off"
										spellCheck={false}
									/>
								</FieldRow>
								<FieldRow label="SMTP порт *" htmlFor="smtp-port">
									<Input
										id="smtp-port"
										className={cn(showSmtpPortError && "border-destructive", "tabular-nums")}
										value={form.smtpPort}
										onChange={(e) => update("smtpPort", e.target.value)}
										placeholder="465"
										aria-invalid={showSmtpPortError || undefined}
										inputMode="numeric"
										autoComplete="off"
										spellCheck={false}
									/>
								</FieldRow>
							</div>
						</section>

						<section className="flex flex-col gap-3">
							<h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								IMAP (получение)
							</h3>
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
								<FieldRow label="IMAP хост *" htmlFor="imap-host">
									<Input
										id="imap-host"
										className={cn(showImapHostError && "border-destructive")}
										value={form.imapHost}
										onChange={(e) => update("imapHost", e.target.value)}
										placeholder="imap.example.com"
										aria-invalid={showImapHostError || undefined}
										autoComplete="off"
										spellCheck={false}
									/>
								</FieldRow>
								<FieldRow label="IMAP порт *" htmlFor="imap-port">
									<Input
										id="imap-port"
										className={cn(showImapPortError && "border-destructive", "tabular-nums")}
										value={form.imapPort}
										onChange={(e) => update("imapPort", e.target.value)}
										placeholder="993"
										aria-invalid={showImapPortError || undefined}
										inputMode="numeric"
										autoComplete="off"
										spellCheck={false}
									/>
								</FieldRow>
							</div>
						</section>
					</div>
				</div>

				<SheetFooter className="sticky bottom-0 flex-row justify-between border-t bg-background">
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
