import { Outlet } from "react-router";
import { LogoIcon } from "@/components/logo-icon";

export function AuthLayout() {
	return (
		<div className="flex h-svh">
			{/* Left: form area */}
			<div className="flex w-full flex-col overflow-y-auto px-6 py-8 lg:w-1/2 lg:px-16">
				<div className="flex items-center gap-2 text-foreground">
					<LogoIcon className="size-6" />
					<span className="text-lg font-semibold tracking-tight">Sdelka.ai</span>
				</div>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-sm">
						<Outlet />
					</div>
				</div>
			</div>
			{/* Right: gradient panel (hidden on mobile) */}
			<div
				data-testid="auth-gradient-panel"
				className="relative hidden lg:block lg:w-1/2"
				style={{
					background: "linear-gradient(135deg, #d1fe16 0%, #000000 100%)",
				}}
			>
				{/* Dot pattern overlay */}
				<div
					className="absolute inset-0"
					style={{
						backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
						backgroundSize: "20px 20px",
					}}
				/>
			</div>
		</div>
	);
}
