import { AlertTriangle, RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/data/use-settings";

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
				{activeTab === "account" && <div data-testid="account-tab-content" />}
				{activeTab === "settings" && <div data-testid="settings-tab-content" />}
			</div>
		</div>
	);
}
