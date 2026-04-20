import { Building2, ChevronRight, CreditCard, Mail, Settings, User, Users } from "lucide-react";
import { Link, Navigate } from "react-router";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface Section {
	title: string;
	items: { path: string; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }[];
}

const SECTIONS: Section[] = [
	{ title: "Пользователь", items: [{ path: "/settings/profile", label: "Профиль", icon: User }] },
	{
		title: "Рабочее пространство",
		items: [
			{ path: "/settings/workspace", label: "Общие настройки", icon: Settings },
			{ path: "/settings/companies", label: "Компании", icon: Building2 },
			{ path: "/settings/employees", label: "Сотрудники", icon: Users },
			{ path: "/settings/emails", label: "Почты", icon: Mail },
		],
	},
	{ title: "Аккаунт", items: [{ path: "/settings/tariffs", label: "Тарифы", icon: CreditCard }] },
];

export function SettingsIndexPage() {
	const isMobile = useIsMobile();

	if (!isMobile) {
		return <Navigate to="/settings/profile" replace />;
	}

	return (
		<main
			className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/50 p-4"
			aria-label="Настройки"
			data-testid="settings-index"
		>
			<div className="flex flex-col gap-6">
				{SECTIONS.map((section) => (
					<section key={section.title} className="flex flex-col gap-2">
						<h2 className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{section.title}</h2>
						<div className="overflow-hidden rounded-lg border border-border bg-background">
							{section.items.map((item, idx) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.path}
										to={item.path}
										className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted ${
											idx > 0 ? "border-t border-border" : ""
										}`}
									>
										<Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
										<span className="flex-1">{item.label}</span>
										<ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
									</Link>
								);
							})}
						</div>
					</section>
				))}
			</div>
		</main>
	);
}
