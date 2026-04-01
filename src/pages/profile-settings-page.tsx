import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { extractFormErrors, forgotPassword } from "@/data/auth-api";
import type { UserSettings } from "@/data/settings-api";
import { useSettings, useUpdateSettings } from "@/data/use-settings";
import { getAvatarColor } from "@/lib/avatar-colors";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PHONE_RE = /^\+?[0-9]{10,15}$/;

function ProfileForm({ data }: { data: UserSettings }) {
	const updateSettings = useUpdateSettings();

	const [firstName, setFirstName] = useState(data.first_name);
	const [lastName, setLastName] = useState(data.last_name);
	const [patronymic, setPatronymic] = useState(data.patronymic ?? "");
	const [phone, setPhone] = useState(data.phone);
	const [phoneError, setPhoneError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [forgotPending, setForgotPending] = useState(false);

	const isDirty =
		firstName !== data.first_name ||
		lastName !== data.last_name ||
		patronymic !== (data.patronymic ?? "") ||
		phone !== data.phone;

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

	return (
		<>
			<div className="mb-6 flex items-center gap-4">
				<div
					data-testid="profile-avatar"
					className={cn(
						"flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white",
						avatarColor,
					)}
				>
					{initials}
				</div>
				<div>
					<p className="font-semibold">
						{data.first_name} {data.last_name}
					</p>
					<p className="text-sm text-muted-foreground">{data.email}</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="max-w-md space-y-4">
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
				<Button type="submit" disabled={!isDirty || updateSettings.isPending}>
					{updateSettings.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
					Сохранить
				</Button>
			</form>

			<div className="mt-8 max-w-md">
				<h2 className="mb-1 text-base font-semibold">Изменить пароль</h2>
				<p className="mb-3 text-sm text-muted-foreground">Получить письмо со ссылкой для обновления пароля</p>
				<Button type="button" variant="outline" onClick={handleForgotPassword} disabled={forgotPending}>
					{forgotPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
					Изменить пароль
				</Button>
			</div>
		</>
	);
}

export function ProfileSettingsPage() {
	const { data } = useSettings();

	if (!data) {
		return (
			<div data-testid="profile-skeleton" className="p-6">
				<div className="animate-pulse space-y-4">
					<div className="size-14 rounded-full bg-muted" />
					<div className="h-4 w-40 rounded bg-muted" />
					<div className="h-10 w-full max-w-md rounded bg-muted" />
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<header className="sticky top-0 z-30 flex shrink-0 items-center gap-md border-b border-border bg-background px-lg py-sm">
				<nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="breadcrumb">
					<span>Пользователь</span>
					<span aria-hidden="true">/</span>
					<span className="text-foreground">Профиль</span>
				</nav>
			</header>
			<main className="flex min-h-0 flex-1 flex-col overflow-auto px-lg py-md">
				<ProfileForm key={data.email} data={data} />
			</main>
		</div>
	);
}
