import { Outlet } from "react-router";
import { LogoWordmark } from "@/components/logo-wordmark";
import { ParticleText } from "@/components/particle-text";

export function AuthLayout() {
	return (
		<div className="flex h-svh">
			<div
				data-theme="light"
				className="flex w-full flex-col overflow-y-auto bg-white px-6 py-8 text-foreground lg:w-1/2 lg:px-16"
			>
				<LogoWordmark className="h-5 w-auto self-start text-[oklch(0.145_0_0)]" />
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-96">
						<Outlet />
					</div>
				</div>
			</div>
			<div
				className="hidden lg:block lg:w-1/2"
				style={{
					background: [
						"radial-gradient(ellipse 60% 45% at 50% 50%, rgba(209,254,22,0.10) 0%, transparent 70%)",
						"radial-gradient(ellipse 130% 90% at 25% 75%, rgba(100,200,0,0.05) 0%, transparent 50%)",
						"radial-gradient(ellipse 110% 80% at 75% 25%, rgba(180,255,50,0.04) 0%, transparent 50%)",
						"radial-gradient(ellipse 90% 100% at 80% 80%, rgba(80,180,0,0.03) 0%, transparent 45%)",
						"radial-gradient(ellipse 70% 50% at 15% 30%, rgba(160,240,30,0.03) 0%, transparent 45%)",
						"#000",
					].join(", "),
				}}
			>
				<ParticleText text="Sdelka.ai" />
			</div>
		</div>
	);
}
