import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractFormErrors, forgotPassword } from "@/data/auth-api";
import type { UserSettings } from "@/data/settings-api";
import { useSettings, useUpdateSettings } from "@/data/use-settings";
import { getAvatarColor } from "@/lib/avatar-colors";
import { formatDate, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

function stripPhonePrefix(phone: string): string {
	return phone.startsWith("+7") ? phone.slice(2) : phone;
}

function normalizePhone(value: string): string {
	const digits = value.replace(/\D/g, "");
	if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
		return digits.slice(1);
	}
	return digits;
}

function AccountForm({ data }: { data: UserSettings }) {
	const updateSettings = useUpdateSettings();
	const strippedPhone = stripPhonePrefix(data.phone);

	const [firstName, setFirstName] = useState(data.first_name);
	const [lastName, setLastName] = useState(data.last_name);
	const [patronymic, setPatronymic] = useState(data.patronymic ?? "");
	const [phone, setPhone] = useState(strippedPhone);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const isDirty =
		firstName !== data.first_name ||
		lastName !== data.last_name ||
		patronymic !== (data.patronymic ?? "") ||
		phone !== strippedPhone;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setFieldErrors({});

		const patch: Record<string, unknown> = {};
		if (firstName !== data.first_name) patch.first_name = firstName;
		if (lastName !== data.last_name) patch.last_name = lastName;
		if (patronymic !== (data.patronymic ?? "")) patch.patronymic = patronymic;
		if (phone !== strippedPhone) patch.phone = `+7${normalizePhone(phone)}`;

		updateSettings.mutate(patch, {
			onSuccess: () => {
				toast.success("Изменения сохранены");
			},
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

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<FloatingInput
				label="Имя"
				name="firstName"
				value={firstName}
				onChange={(e) => setFirstName(e.target.value)}
				error={fieldErrors.first_name}
				autoComplete="given-name"
			/>
			<FloatingInput
				label="Фамилия"
				name="lastName"
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
				error={fieldErrors.patronymic}
				autoComplete="additional-name"
			/>
			<FloatingInput label="Email" name="email" type="email" value={data.email} readOnly autoComplete="email" />
			<FloatingInput
				label="Телефон"
				name="phone"
				value={phone}
				onChange={(e) => setPhone(e.target.value)}
				error={fieldErrors.phone}
				prefix="+7"
				inputMode="tel"
				autoComplete="tel"
			/>
			<Button type="submit" disabled={!isDirty || updateSettings.isPending}>
				{updateSettings.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
				Сохранить
			</Button>
		</form>
	);
}

function PasswordSection({ email }: { email: string }) {
	const [isPending, setIsPending] = useState(false);

	async function handleResetPassword() {
		setIsPending(true);
		try {
			await forgotPassword(email);
			toast.success(`Письмо отправлено на ${email}`);
		} catch {
			toast.error("Не удалось отправить письмо");
		} finally {
			setIsPending(false);
		}
	}

	return (
		<div>
			<h2 className="mb-3 text-base font-semibold">Безопасность</h2>
			<p className="mb-3 text-sm text-muted-foreground">Мы отправим ссылку для смены пароля на {email}.</p>
			<Button type="button" variant="outline" onClick={handleResetPassword} disabled={isPending}>
				{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
				Изменить пароль
			</Button>
		</div>
	);
}

function ProfileSkeleton() {
	return (
		<div data-testid="profile-skeleton" className="flex flex-col items-center gap-4 py-8">
			<Skeleton className="size-20 rounded-full" />
			<Skeleton className="h-6 w-40" />
			<Skeleton className="h-4 w-32" />
		</div>
	);
}

export function ProfileSettingsPage() {
	const { data, isLoading, error, refetch } = useSettings();

	if (isLoading) {
		return (
			<div className="mx-auto w-full max-w-2xl px-4 py-8">
				<ProfileSkeleton />
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 px-4 py-16">
				<AlertTriangle className="size-8 text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Не удалось загрузить профиль</p>
				<Button variant="outline" size="sm" onClick={() => refetch()}>
					<RotateCcw className="size-4" aria-hidden="true" />
					Повторить
				</Button>
			</div>
		);
	}

	const initials = getInitials(data.first_name, data.last_name);
	const avatarColor = getAvatarColor(data.avatar_icon);

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-8">
			<div className="mb-6 flex flex-col items-center gap-2">
				<div
					data-testid="profile-avatar"
					className={cn(
						"flex size-20 items-center justify-center rounded-full text-2xl font-semibold text-white",
						avatarColor,
					)}
				>
					{initials}
				</div>
				<h1 className="text-xl font-semibold">
					{data.first_name} {data.last_name}
				</h1>
				<p className="text-sm text-muted-foreground">Зарегистрирован {formatDate(data.date_joined)}</p>
			</div>

			<div className="space-y-8">
				<section>
					<h2 className="mb-4 text-base font-semibold">Личные данные</h2>
					<AccountForm key={data.date_joined} data={data} />
				</section>

				<div className="border-t border-border" />

				<section>
					<PasswordSection email={data.email} />
				</section>
			</div>
		</div>
	);
}
