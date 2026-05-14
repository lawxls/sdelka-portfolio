import { ArrowRight, CreditCard, IdCard, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FloatingInput } from "@/components/floating-input";
import { TopUpRequestsDialog } from "@/components/top-up-requests-dialog";
import { Button } from "@/components/ui/button";
import { CheckboxBadge } from "@/components/ui/checkbox-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { extractFormErrors } from "@/data/auth-errors";
import type { CurrentEmployee } from "@/data/domains/profile";
import type { Subscription } from "@/data/domains/subscription";
import { useMe, useUpdateSettings } from "@/data/use-me";
import { useRequestPasswordChange } from "@/data/use-session";
import { useSubscription } from "@/data/use-subscription";
import { getAvatarColor } from "@/lib/avatar-colors";
import { formatDate, formatFullName, formatInteger, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PHONE_RE = /^\+?[0-9]{10,15}$/;
const formatFraction = (used: number, limit: number) => `${formatInteger(used)} / ${formatInteger(limit)}`;

function ProfileForm({ data }: { data: CurrentEmployee }) {
	const updateSettings = useUpdateSettings();
	const requestPasswordChange = useRequestPasswordChange();

	const [firstName, setFirstName] = useState(data.first_name);
	const [lastName, setLastName] = useState(data.last_name);
	const [patronymic, setPatronymic] = useState(data.patronymic ?? "");
	const [phone, setPhone] = useState(data.phone);
	const [mailingAllowed, setMailingAllowed] = useState(data.mailing_allowed);
	const [phoneError, setPhoneError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

	function handleRequestPasswordChange() {
		requestPasswordChange.mutate(undefined, {
			onSuccess: () => toast.success("Письмо отправлено"),
			onError: () => toast.error("Не удалось отправить письмо"),
		});
	}

	const initials = getInitials(data.first_name, data.last_name);
	const avatarColor = getAvatarColor(data.avatar_icon);
	const fullName = formatFullName(data.last_name, data.first_name, data.patronymic);
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
								Дата регистрации: <span className="tabular-nums text-foreground">{joinDate}</span>
							</span>
						</div>
					</div>
				</div>
			</section>

			<SubscriptionSection />

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
						<p className="mt-0.5 text-sm text-muted-foreground">Мы отправим ссылку для смены пароля на вашу почту</p>
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={handleRequestPasswordChange}
						disabled={requestPasswordChange.isPending}
						className="sm:shrink-0"
					>
						{requestPasswordChange.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
						Отправить ссылку для смены пароля на почту
					</Button>
				</div>
			</section>
		</>
	);
}

function MetricTile({
	label,
	value,
	action,
	testId,
}: {
	label: string;
	value: string;
	action?: React.ReactNode;
	testId?: string;
}) {
	return (
		<div data-testid={testId} className="rounded-xl border border-border bg-muted/30 p-4">
			<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
			<p className="mt-1.5 font-heading text-lg font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}

function SubscriptionView({ data }: { data: Subscription }) {
	const [topUpOpen, setTopUpOpen] = useState(false);

	return (
		<section
			data-testid="subscription-section"
			className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-sm"
		>
			<div className="mb-4 flex items-center gap-2">
				<CreditCard aria-hidden="true" className="size-5 shrink-0 text-primary" />
				<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Подписка</h3>
			</div>

			<div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Текущий тариф</p>
					<p
						data-testid="current-tariff"
						className="mt-0.5 font-heading text-xl font-semibold tracking-tight text-foreground"
					>
						{data.tariff_name}
					</p>
				</div>
				<Button asChild variant="outline" size="sm" className="sm:shrink-0">
					<Link to="/settings/tariffs">
						Сменить тариф
						<ArrowRight
							aria-hidden="true"
							className="size-3.5 transition-transform duration-150 ease-out group-hover/button:translate-x-0.5"
						/>
					</Link>
				</Button>
			</div>

			<div className="mt-4 grid gap-3 sm:grid-cols-3">
				<MetricTile
					testId="metric-requests"
					label="Лимит запросов"
					value={formatFraction(data.requests_used, data.requests_limit)}
					action={
						<Button
							type="button"
							variant="link"
							size="sm"
							className="-ml-2.5 h-auto p-0 px-2.5"
							onClick={() => setTopUpOpen(true)}
						>
							Докупить запросы
							<ArrowRight
								aria-hidden="true"
								className="size-3.5 transition-transform duration-150 ease-out group-hover/button:translate-x-0.5"
							/>
						</Button>
					}
				/>
				<MetricTile
					testId="metric-employees"
					label="Сотрудники"
					value={formatFraction(data.employees_used, data.employees_limit)}
				/>
				<MetricTile testId="metric-emails" label="Писем отправлено" value={formatInteger(data.emails_sent)} />
			</div>

			<TopUpRequestsDialog
				open={topUpOpen}
				onOpenChange={setTopUpOpen}
				tariffId={data.tariff_id}
				tariffName={data.tariff_name}
			/>
		</section>
	);
}

function SubscriptionSection() {
	const { data, isError } = useSubscription();

	if (isError) {
		return (
			<section
				data-testid="subscription-section"
				className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-sm"
			>
				<p className="text-sm text-muted-foreground">Не удалось загрузить подписку</p>
			</section>
		);
	}

	if (!data) {
		return (
			<section
				data-testid="subscription-skeleton"
				className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-sm"
			>
				<div className="space-y-3">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-14 w-full rounded-xl" />
					<div className="grid grid-cols-3 gap-3">
						<Skeleton className="h-20 rounded-xl" />
						<Skeleton className="h-20 rounded-xl" />
						<Skeleton className="h-20 rounded-xl" />
					</div>
				</div>
			</section>
		);
	}

	return <SubscriptionView data={data} />;
}

export function ProfileSettingsPage() {
	const { data, isError, refetch } = useMe();
	useSubscription();

	if (isError) {
		return (
			<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
				<p className="mb-3 text-sm text-muted-foreground">Не удалось загрузить профиль</p>
				<Button variant="outline" onClick={() => refetch()} className="self-start">
					Повторить
				</Button>
			</main>
		);
	}

	if (!data) {
		return (
			<main
				data-testid="profile-skeleton"
				className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg"
			>
				<div className="animate-pulse space-y-4">
					<div className="size-16 rounded-full bg-muted" />
					<div className="h-4 w-40 rounded bg-muted" />
					<div className="h-10 w-full max-w-[28rem] rounded bg-muted" />
				</div>
			</main>
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
