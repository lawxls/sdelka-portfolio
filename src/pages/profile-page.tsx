import { AlertTriangle, CheckIcon, Loader2, RotateCcw } from "lucide-react";
import { Checkbox } from "radix-ui";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/data/api-error";
import { parseApiError } from "@/data/auth-api";
import type { UserSettings } from "@/data/settings-api";
import { useSettings, useUpdateSettings } from "@/data/use-settings";

type ProfileTab = "account" | "settings";

const TABS: { key: ProfileTab; label: string }[] = [
	{ key: "account", label: "Аккаунт" },
	{ key: "settings", label: "Настройки" },
];

const AVATAR_COLORS: Record<string, string> = {
	red: "bg-folder-red",
	orange: "bg-folder-orange",
	yellow: "bg-folder-yellow",
	green: "bg-folder-green",
	blue: "bg-folder-blue",
	purple: "bg-folder-purple",
	pink: "bg-folder-pink",
	teal: "bg-folder-teal",
};

function parseTab(value: string | null): ProfileTab {
	return value === "settings" ? "settings" : "account";
}

function formatDateJoined(dateStr: string): string {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(dateStr));
}

function getInitials(firstName: string, lastName: string): string {
	return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function stripPhonePrefix(phone: string): string {
	return phone.startsWith("+7") ? phone.slice(2) : phone;
}

function AccountForm({ data }: { data: UserSettings }) {
	const updateSettings = useUpdateSettings();

	const [firstName, setFirstName] = useState(data.first_name);
	const [lastName, setLastName] = useState(data.last_name);
	const [phone, setPhone] = useState(stripPhonePrefix(data.phone));
	const [mailingAllowed, setMailingAllowed] = useState(data.mailing_allowed);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const isDirty =
		firstName !== data.first_name ||
		lastName !== data.last_name ||
		phone !== stripPhonePrefix(data.phone) ||
		mailingAllowed !== data.mailing_allowed;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setFieldErrors({});

		const patch: Record<string, unknown> = {};
		if (firstName !== data.first_name) patch.first_name = firstName;
		if (lastName !== data.last_name) patch.last_name = lastName;
		if (phone !== stripPhonePrefix(data.phone)) patch.phone = `+7${phone}`;
		if (mailingAllowed !== data.mailing_allowed) patch.mailing_allowed = mailingAllowed;

		updateSettings.mutate(patch, {
			onSuccess: () => {
				toast.success("Изменения сохранены");
			},
			onError: (err) => {
				if (err instanceof ApiError) {
					const parsed = parseApiError(err.body);
					if (Object.keys(parsed.fieldErrors).length > 0) {
						setFieldErrors(parsed.fieldErrors);
						return;
					}
					if (parsed.detail) {
						toast.error(parsed.detail);
						return;
					}
				}
				toast.error("Произошла ошибка. Попробуйте ещё раз.");
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
			<div className="flex items-center gap-2">
				<Checkbox.Root
					id="mailingAllowed"
					checked={mailingAllowed}
					onCheckedChange={(checked) => setMailingAllowed(checked === true)}
					className="peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground"
				>
					<Checkbox.Indicator className="grid place-content-center text-current [&>svg]:size-3.5">
						<CheckIcon />
					</Checkbox.Indicator>
				</Checkbox.Root>
				<label htmlFor="mailingAllowed" className="cursor-pointer text-sm">
					Получать сервисные уведомления на почту
				</label>
			</div>
			<Button type="submit" disabled={!isDirty || updateSettings.isPending}>
				{updateSettings.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
				Сохранить
			</Button>
		</form>
	);
}

function ProfileSkeleton() {
	return (
		<div data-testid="profile-skeleton" className="flex flex-col items-center gap-4 py-8">
			<Skeleton className="size-20 rounded-full" />
			<Skeleton className="h-6 w-40" />
			<Skeleton className="h-4 w-32" />
			<div className="mt-4 flex w-full max-w-lg gap-4">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-24" />
			</div>
		</div>
	);
}

export function ProfilePage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = parseTab(searchParams.get("tab"));
	const { data, isLoading, error, refetch } = useSettings();

	function handleTabChange(tab: ProfileTab) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (tab === "account") {
				next.delete("tab");
			} else {
				next.set("tab", tab);
			}
			return next;
		});
	}

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
	const avatarColor = AVATAR_COLORS[data.avatar_icon] ?? "bg-folder-blue";

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-8">
			{/* Avatar header */}
			<div className="flex flex-col items-center gap-2">
				<div
					data-testid="profile-avatar"
					className={`flex size-20 items-center justify-center rounded-full text-2xl font-semibold text-white ${avatarColor}`}
				>
					{initials}
				</div>
				<h1 className="text-xl font-semibold">
					{data.first_name} {data.last_name}
				</h1>
				<p data-testid="profile-date-joined" className="text-sm text-muted-foreground">
					Зарегистрирован {formatDateJoined(data.date_joined)}
				</p>
			</div>

			{/* Tabs */}
			<div className="mt-6 flex gap-0 border-b border-border" role="tablist">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.key}
						className={`px-4 py-2 text-sm font-medium transition-colors ${
							activeTab === tab.key
								? "border-b-2 border-primary text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
						onClick={() => handleTabChange(tab.key)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Tab content */}
			<div className="mt-6">
				{activeTab === "account" && <AccountForm key={data.date_joined} data={data} />}
				{activeTab === "settings" && <div data-testid="settings-tab-content" />}
			</div>
		</div>
	);
}
