import { Outlet } from "react-router";
import { LogoWordmark } from "@/components/logo-wordmark";

export function AuthLayout() {
	return (
		<div data-theme="light" className="flex min-h-svh flex-col bg-white px-6 py-8 text-foreground">
			<LogoWordmark className="h-5 w-auto self-start text-[oklch(0.145_0_0)]" />
			<div className="flex flex-1 items-center justify-center">
				<div className="w-full max-w-96">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
