import { Building2, ChevronRight, CreditCard, LifeBuoy, LogOut, Mail, Settings, User, Users } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router";
import { SupportDialog } from "@/components/support-dialog";
import { clearTokens } from "@/data/auth";
import { useIsMobile } from "@/hooks/use-is-mobile";

type IconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type Item =
	| { kind: "link"; path: string; label: string; icon: IconComponent }
	| { kind: "button"; onClick: () => void; label: string; icon: IconComponent; destructive?: boolean };

interface Section {
	title: string;
	items: Item[];
}

export function SettingsIndexPage() {
	const isMobile = useIsMobile();
	const [supportOpen, setSupportOpen] = useState(false);

	if (!isMobile) {
		return <Navigate to="/settings/profile" replace />;
	}

	const sections: Section[] = [
		{ title: "Пользователь", items: [{ kind: "link", path: "/settings/profile", label: "Профиль", icon: User }] },
		{
			title: "Рабочее пространство",
			items: [
				{ kind: "link", path: "/settings/workspace", label: "Общие настройки", icon: Settings },
				{ kind: "link", path: "/settings/companies", label: "Компании", icon: Building2 },
				{ kind: "link", path: "/settings/employees", label: "Сотрудники", icon: Users },
				{ kind: "link", path: "/settings/emails", label: "Почты", icon: Mail },
			],
		},
		{
			title: "Аккаунт",
			items: [
				{ kind: "link", path: "/settings/tariffs", label: "Тарифы", icon: CreditCard },
				{ kind: "button", onClick: () => setSupportOpen(true), label: "Помощь", icon: LifeBuoy },
				{ kind: "button", onClick: clearTokens, label: "Выйти", icon: LogOut, destructive: true },
			],
		},
	];

	return (
		<main
			className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/50 p-4"
			aria-label="Настройки"
			data-testid="settings-index"
		>
			<div className="flex flex-col gap-6">
				{sections.map((section) => (
					<section key={section.title} className="flex flex-col gap-2">
						<h2 className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{section.title}</h2>
						<div className="overflow-hidden rounded-lg border border-border bg-background">
							{section.items.map((item, idx) => {
								const Icon = item.icon;
								const rowClass = `flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted ${
									idx > 0 ? "border-t border-border" : ""
								}`;
								if (item.kind === "link") {
									return (
										<Link key={item.path} to={item.path} className={rowClass}>
											<Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
											<span className="flex-1 text-left">{item.label}</span>
											<ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
										</Link>
									);
								}
								return (
									<button
										key={item.label}
										type="button"
										onClick={item.onClick}
										className={`${rowClass} ${item.destructive ? "text-destructive" : ""}`}
									>
										<Icon
											className={`size-4 shrink-0 ${item.destructive ? "" : "text-muted-foreground"}`}
											aria-hidden
										/>
										<span className="flex-1 text-left">{item.label}</span>
									</button>
								);
							})}
						</div>
					</section>
				))}
			</div>

			<SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
		</main>
	);
}
