import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { extractFormErrors, forgotPassword } from "@/data/auth-api";
import type { UserSettings } from "@/data/settings-api";
import { useSettings, useUpdateSettings } from "@/data/use-settings";
import { getAvatarColor } from "@/lib/avatar-colors";
import { formatDate, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PHONE_RE = /^\+?[0-9]{10,15}$/;
const DEFAULT_TARIFF_NAME = "Базовый";

function ProfileForm({ data }: { data: UserSettings }) {
	const updateSettings = useUpdateSettings();

	const [firstName, setFirstName] = useState(data.first_name);
	const [lastName, setLastName] = useState(data.last_name);
	const [patronymic, setPatronymic] = useState(data.patronymic ?? "");
	const [phone, setPhone] = useState(data.phone);
	const [mailingAllowed, setMailingAllowed] = useState(data.mailing_allowed);
	const [phoneError, setPhoneError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [forgotPending, setForgotPending] = useState(false);

	const isDirty =
		firstName !== data.first_name ||
		lastName !== data.last_name ||
		patronymic !== (data.patronymic ?? "") ||
		phone !== data.phone ||
		mailingAllowed !== data.mailing_allowed;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setPhoneError(null);
		setFieldErrors({});

		if (phone && !PHONE_RE.test(phone)) {
			setPhoneError("Неверный формат номера телефона");
			return;
		}

		const patch: Record<string, unknown> = {};
		if (firstName !== data.first_name) patch.first_name = firstName;
		if (lastName !== data.last_name) patch.last_name = lastName;
		if (patronymic !== (data.patronymic ?? "")) patch.patronymic = patronymic;
		if (phone !== data.phone) patch.phone = phone;
		if (mailingAllowed !== data.mailing_allowed) patch.mailing_allowed = mailingAllowed;

		updateSettings.mutate(patch, {
			onSuccess: () => toast.success("Изменения сохранены"),
			onError: (err) => {
				const { error, fieldErrors: fields } = extractFormErrors(err);
				if (Object.keys(fields).length > 0) {
					setFieldErrors(fields);
				} else if (error) {
					toast.error(error);
				}
			},
		});
	}

	async function handleForgotPassword() {
		setForgotPending(true);
		try {
			await forgotPassword(data.email);
			toast.success("Письмо отправлено");
		} catch {
			toast.error("Не удалось отправить письмо");
		} finally {
			setForgotPending(false);
		}
	}

	const initials = getInitials(data.first_name, data.last_name);
	const avatarColor = getAvatarColor(data.avatar_icon);
	const fullName = [data.last_name, data.first_name, data.patronymic].filter(Boolean).join(" ");
	const joinDate = formatDate(data.date_joined);

	return (
		<>
			<section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
				<div className="flex flex-wrap items-start gap-5">
					<div
						data-testid="profile-avatar"
						className={cn(
							"flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white shadow-sm",
							avatarColor,
						)}
					>
						{initials}
					</div>
					<div className="min-w-0 flex-1 space-y-2">
						<div>
							<h2 className="font-heading text-xl font-semibold tracking-tight">{fullName}</h2>
							<p className="truncate text-sm text-muted-foreground">{data.email}</p>
						</div>
						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
							<span>
								Тариф: <span className="text-foreground">{DEFAULT_TARIFF_NAME}</span>
							</span>
							<span>
								Дата регистрации: <span className="tabular-nums text-foreground">{joinDate}</span>
							</span>
						</div>
					</div>
				</div>
			</section>

			<section className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-sm">
				<h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Личные данные</h3>
				<form onSubmit={handleSubmit} className="w-full max-w-[28rem] space-y-4">
					<FloatingInput
						label="Имя"
						name="first_name"
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
						error={fieldErrors.first_name}
						autoComplete="given-name"
					/>
					<FloatingInput
						label="Фамилия"
						name="last_name"
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
						error={fieldErrors.last_name}
						autoComplete="family-name"
					/>
					<FloatingInput
						label="Отчество"
						name="patronymic"
						value={patronymic}
						onChange={(e) => setPatronymic(e.target.value)}
						autoComplete="off"
					/>
					<FloatingInput
						label="Номер телефона"
						name="phone"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						error={phoneError ?? fieldErrors.phone}
						inputMode="tel"
						autoComplete="tel"
					/>
					<FloatingInput label="Почта" name="email" type="email" value={data.email} readOnly autoComplete="email" />
					{/* biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox renders input internally */}
					<label className="flex items-center gap-2 pt-1">
						<Checkbox
							checked={mailingAllowed}
							onCheckedChange={(checked) => setMailingAllowed(checked === true)}
							aria-label="Получать уведомления на почту"
						/>
						<span className="text-sm">Получать уведомления на почту</span>
					</label>
					<div className="pt-2">
						<Button type="submit" disabled={!isDirty || updateSettings.isPending}>
							{updateSettings.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							Сохранить
						</Button>
					</div>
				</form>
			</section>

			<section className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-sm">
				<h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Безопасность</h3>
				<h2 className="text-base font-semibold">Изменить пароль</h2>
				<p className="mt-1 mb-4 max-w-[28rem] text-sm text-muted-foreground">
					Получить письмо со ссылкой для обновления пароля
				</p>
				<Button type="button" variant="outline" onClick={handleForgotPassword} disabled={forgotPending}>
					{forgotPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
					Изменить пароль
				</Button>
			</section>
		</>
	);
}

export function ProfileSettingsPage() {
	const { data, isError, refetch } = useSettings();

	if (isError) {
		return (
			<div className="px-xl py-lg">
				<p className="mb-3 text-sm text-muted-foreground">Не удалось загрузить профиль</p>
				<Button variant="outline" onClick={() => refetch()}>
					Повторить
				</Button>
			</div>
		);
	}

	if (!data) {
		return (
			<div data-testid="profile-skeleton" className="px-xl py-lg">
				<div className="animate-pulse space-y-4">
					<div className="size-16 rounded-full bg-muted" />
					<div className="h-4 w-40 rounded bg-muted" />
					<div className="h-10 w-full max-w-[28rem] rounded bg-muted" />
				</div>
			</div>
		);
	}

	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
			<div className="mx-auto w-full max-w-[48rem]">
				<ProfileForm key={data.email} data={data} />
			</div>
		</main>
	);
}
