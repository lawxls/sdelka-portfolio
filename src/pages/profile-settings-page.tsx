import { IdCard, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { CheckboxBadge } from "@/components/ui/checkbox-badge";
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
				<div className="mb-4 flex items-center gap-2">
					<IdCard aria-hidden="true" className="size-5 shrink-0 text-primary" />
					<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Личные данные</h3>
				</div>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-3">
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
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
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
					</div>
					<div className="pt-1">
						<CheckboxBadge
							id="mailing-allowed"
							checked={mailingAllowed}
							onChange={setMailingAllowed}
							ariaLabel="Получать уведомления на почту"
						>
							Получать уведомления на почту
						</CheckboxBadge>
					</div>
					<div className="flex justify-end border-t border-border pt-4">
						<Button type="submit" disabled={!isDirty || updateSettings.isPending}>
							{updateSettings.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							Сохранить
						</Button>
					</div>
				</form>
			</section>

			<section className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<KeyRound aria-hidden="true" className="size-5 shrink-0 text-primary" />
					<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Безопасность</h3>
				</div>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						<h2 className="text-base font-semibold">Изменить пароль</h2>
						<p className="mt-0.5 text-sm text-muted-foreground">Получить письмо со ссылкой для обновления пароля</p>
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={handleForgotPassword}
						disabled={forgotPending}
						className="sm:shrink-0"
					>
						{forgotPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
						Изменить пароль
					</Button>
				</div>
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
