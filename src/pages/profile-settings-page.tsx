import { ArrowRight, Gauge, IdCard, KeyRound, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FloatingInput } from "@/components/floating-input";
import { FloatingPhoneInput } from "@/components/floating-phone-input";
import { TopUpRequestsDialog } from "@/components/top-up-requests-dialog";
import { Button } from "@/components/ui/button";
import { CheckboxBadge } from "@/components/ui/checkbox-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { extractFormErrors } from "@/data/auth-errors";
import type { CurrentEmployee, SettingsPatch } from "@/data/domains/profile";
import type { Subscription } from "@/data/domains/subscription";
import { validateNames } from "@/data/name-validation";
import { useMe, useUpdateSettings } from "@/data/use-me";
import { useRequestPasswordChange } from "@/data/use-session";
import { useSubscription } from "@/data/use-subscription";
import { getAvatarColor } from "@/lib/avatar-colors";
import { formatDate, formatFullName, formatInteger, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PHONE_RE = /^\+?[0-9]{10,15}$/;

function buildDefaultSignature(firstName: string, lastName: string): string {
	const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
	return fullName ? `С уважением,\n${fullName}` : "С уважением,";
}

const CARD_BASE = "rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6";

function SectionCard({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
	return (
		<section className={cn(CARD_BASE, className)} {...props}>
			{children}
		</section>
	);
}

function SectionHeader({
	icon: Icon,
	title,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	title: string;
}) {
	return (
		<div className="mb-5 flex items-center gap-2">
			<Icon aria-hidden className="size-5 shrink-0 text-primary" />
			<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
		</div>
	);
}

function ProfileForm({ data }: { data: CurrentEmployee }) {
	const updateSettings = useUpdateSettings();
	const requestPasswordChange = useRequestPasswordChange();

	const initialSignature = data.emailSignature || buildDefaultSignature(data.firstName, data.lastName);
	const savedSignature = data.emailSignature || initialSignature;

	const [firstName, setFirstName] = useState(data.firstName);
	const [lastName, setLastName] = useState(data.lastName);
	const [patronymic, setPatronymic] = useState(data.patronymic ?? "");
	const [phone, setPhone] = useState(data.phone);
	const [mailingAllowed, setMailingAllowed] = useState(data.mailingAllowed);
	const [emailSignature, setEmailSignature] = useState(initialSignature);
	const [phoneError, setPhoneError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const signatureId = useId();

	const isDirty =
		firstName !== data.firstName ||
		lastName !== data.lastName ||
		patronymic !== (data.patronymic ?? "") ||
		phone !== data.phone ||
		mailingAllowed !== data.mailingAllowed ||
		emailSignature !== savedSignature;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setPhoneError(null);
		setFieldErrors({});

		const nameErrors = validateNames(
			{ firstName, lastName, patronymic },
			{ firstName: "firstName", lastName: "lastName", patronymic: "patronymic" },
		);
		if (nameErrors) {
			setFieldErrors(nameErrors);
			return;
		}

		if (phone && !PHONE_RE.test(phone)) {
			setPhoneError("Неверный формат номера телефона");
			return;
		}

		const patch: SettingsPatch = {};
		if (firstName !== data.firstName) patch.firstName = firstName;
		if (lastName !== data.lastName) patch.lastName = lastName;
		if (patronymic !== (data.patronymic ?? "")) patch.patronymic = patronymic;
		if (phone !== data.phone) patch.phone = phone;
		if (mailingAllowed !== data.mailingAllowed) patch.mailingAllowed = mailingAllowed;
		if (emailSignature !== savedSignature) patch.emailSignature = emailSignature;

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

	const initials = getInitials(data.firstName, data.lastName);
	const avatarColor = getAvatarColor(data.avatarIcon);
	const fullName = formatFullName(data.lastName, data.firstName, data.patronymic);
	const joinDate = formatDate(data.dateJoined);

	return (
		<>
			<IdentityCard
				initials={initials}
				avatarColor={avatarColor}
				fullName={fullName}
				email={data.email}
				joinDate={joinDate}
			/>

			<LimitsSection />

			<form onSubmit={handleSubmit}>
				<SectionCard className="mt-5">
					<SectionHeader icon={IdCard} title="Личные данные" />
					<div className="space-y-5">
						<div className="grid gap-4 sm:grid-cols-3">
							<FloatingInput
								label="Имя"
								name="firstName"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								error={fieldErrors.firstName}
								autoComplete="given-name"
							/>
							<FloatingInput
								label="Фамилия"
								name="lastName"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								error={fieldErrors.lastName}
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
							<FloatingPhoneInput
								label="Номер телефона"
								name="phone"
								value={phone}
								onChange={setPhone}
								error={phoneError ?? fieldErrors.phone}
							/>
							<FloatingInput label="Почта" name="email" type="email" value={data.email} readOnly autoComplete="email" />
						</div>
						<CheckboxBadge
							id="mailing-allowed"
							checked={mailingAllowed}
							onChange={setMailingAllowed}
							ariaLabel="Получать уведомления на почту"
						>
							Получать уведомления на почту
						</CheckboxBadge>
						<div className="space-y-1.5 border-t border-border pt-5">
							<label htmlFor={signatureId} className="text-sm font-medium text-foreground">
								Подпись в письмах
							</label>
							<p className="text-xs text-muted-foreground">
								Будет добавляться в конце писем поставщикам — например, ФИО, должность и контакты.
							</p>
							<Textarea
								id={signatureId}
								value={emailSignature}
								onChange={(e) => setEmailSignature(e.target.value)}
								rows={4}
								className="mt-1.5 whitespace-pre-wrap"
							/>
						</div>
						<div className="flex justify-end border-t border-border pt-5">
							<Button type="submit" disabled={!isDirty || updateSettings.isPending}>
								{updateSettings.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
								Сохранить
							</Button>
						</div>
					</div>
				</SectionCard>
			</form>

			<SectionCard className="mt-5">
				<SectionHeader icon={KeyRound} title="Безопасность" />
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0 space-y-1">
						<h2 className="text-base font-semibold leading-none">Изменить пароль</h2>
						<p className="text-sm text-muted-foreground text-pretty">
							Мы отправим ссылку для смены пароля на вашу почту
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={handleRequestPasswordChange}
						disabled={requestPasswordChange.isPending}
						className="sm:shrink-0"
					>
						{requestPasswordChange.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
						Отправить письмо
					</Button>
				</div>
			</SectionCard>
		</>
	);
}

function IdentityCard({
	initials,
	avatarColor,
	fullName,
	email,
	joinDate,
}: {
	initials: string;
	avatarColor: string;
	fullName: string;
	email: string;
	joinDate: string;
}) {
	const { data: subscription } = useSubscription();

	return (
		<SectionCard>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<div
					data-testid="profile-avatar"
					className={cn(
						"flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white shadow-sm ring-1 ring-black/5",
						avatarColor,
					)}
				>
					{initials}
				</div>
				<div className="min-w-0 flex-1 space-y-1.5">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
						<h2 className="font-heading text-lg font-semibold tracking-tight leading-none text-balance">{fullName}</h2>
						{subscription ? (
							<Link
								to="/settings/tariffs"
								aria-label="Сменить тариф"
								title={`Текущий тариф: ${subscription.tariff_name}`}
								className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<span aria-hidden="true">Тариф</span>
								<span
									aria-hidden="true"
									data-testid="current-tariff"
									className="font-semibold tracking-tight text-foreground"
								>
									{subscription.tariff_name}
								</span>
							</Link>
						) : (
							<Skeleton className="h-7 w-28 rounded-full" />
						)}
					</div>
					<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
						<span className="truncate">{email}</span>
						<span aria-hidden="true" className="text-muted-foreground/50">
							·
						</span>
						<span className="whitespace-nowrap">
							Зарегистрирован с <span className="tabular-nums text-foreground">{joinDate}</span>
						</span>
					</div>
				</div>
			</div>
		</SectionCard>
	);
}

function LimitMetric({
	testId,
	label,
	used,
	limit,
	action,
}: {
	testId: string;
	label: string;
	used: number;
	limit: number;
	action?: React.ReactNode;
}) {
	const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
	const pct = Math.round(ratio * 100);

	return (
		<div data-testid={testId} className="flex min-w-0 flex-col gap-2.5">
			<span className="text-[11px] font-medium uppercase tracking-wider leading-none text-muted-foreground">
				{label}
			</span>
			<div className="flex items-baseline justify-between gap-3">
				<p className="font-heading text-lg font-semibold tracking-tight tabular-nums leading-none">
					{formatInteger(used)}{" "}
					<span className="text-sm font-normal text-muted-foreground">/ {formatInteger(limit)}</span>
				</p>
				{action}
			</div>
			<div
				role="progressbar"
				aria-label={`${label}: использовано ${pct}%`}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={pct}
				className="h-1 w-full overflow-hidden rounded-full bg-muted"
			>
				<div
					className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

function LimitsView({ data }: { data: Subscription }) {
	const [topUpOpen, setTopUpOpen] = useState(false);

	return (
		<SectionCard data-testid="limits-section" className="mt-5">
			<SectionHeader icon={Gauge} title="Лимиты" />

			<div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-3">
				<LimitMetric
					testId="metric-requests"
					label="Запросы"
					used={data.requests_used}
					limit={data.requests_limit}
					action={
						<Button
							type="button"
							variant="link"
							size="sm"
							aria-label="Докупить запросы"
							className="h-auto shrink-0 p-0 text-xs"
							onClick={() => setTopUpOpen(true)}
						>
							Докупить
							<ArrowRight
								aria-hidden="true"
								className="size-3 transition-transform duration-150 ease-out group-hover/button:translate-x-0.5"
							/>
						</Button>
					}
				/>
				<LimitMetric
					testId="metric-employees"
					label="Сотрудники"
					used={data.employees_used}
					limit={data.employees_limit}
				/>
				<LimitMetric testId="metric-emails" label="Письма" used={data.emails_sent} limit={data.emails_limit} />
			</div>

			<TopUpRequestsDialog
				open={topUpOpen}
				onOpenChange={setTopUpOpen}
				tariffId={data.tariff_id}
				tariffName={data.tariff_name}
			/>
		</SectionCard>
	);
}

function LimitsSection() {
	const { data, isError } = useSubscription();

	if (isError) {
		return (
			<SectionCard data-testid="limits-section" className="mt-5">
				<p className="text-sm text-muted-foreground">Не удалось загрузить лимиты</p>
			</SectionCard>
		);
	}

	if (!data) {
		return (
			<SectionCard data-testid="limits-skeleton" className="mt-5">
				<div className="space-y-5">
					<Skeleton className="h-4 w-20" />
					<div className="grid grid-cols-3 gap-x-8 gap-y-6">
						<Skeleton className="h-14 rounded" />
						<Skeleton className="h-14 rounded" />
						<Skeleton className="h-14 rounded" />
					</div>
				</div>
			</SectionCard>
		);
	}

	return <LimitsView data={data} />;
}

export function ProfileSettingsPage() {
	const { data, isError, refetch } = useMe();

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
