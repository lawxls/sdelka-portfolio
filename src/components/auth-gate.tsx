import { useState } from "react";
import { AccessCodeInput } from "@/components/access-code-input";
import { validateCode as apiValidateCode, fetchCompanyInfo } from "@/data/api-client";
import { clearToken, hasToken, setToken } from "@/data/auth";
import { getTenant } from "@/data/tenant";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

interface AuthGateProps {
	children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
	const tenant = getTenant();
	const [authed, setAuthed] = useState(false);
	const [validating, setValidating] = useState(() => hasToken());
	const [error, setError] = useState(false);
	const [shake, setShake] = useState(false);
	const [inputKey, setInputKey] = useState(0);

	useMountEffect(() => {
		if (!tenant) return;

		if (hasToken()) {
			fetchCompanyInfo()
				.then(() => setAuthed(true))
				.catch(() => {
					clearToken();
					setAuthed(false);
				})
				.finally(() => setValidating(false));
		}

		function revalidate() {
			if (document.visibilityState === "visible" && !hasToken()) {
				setAuthed(false);
			}
		}
		document.addEventListener("visibilitychange", revalidate);
		return () => document.removeEventListener("visibilitychange", revalidate);
	});

	if (!tenant) {
		return (
			<div className="flex h-svh items-center justify-center bg-background text-foreground">
				<div className="text-center">
					<h1 className="text-xl font-semibold">Компания не найдена</h1>
					<p className="mt-2 text-sm text-muted-foreground">Проверьте правильность адреса</p>
				</div>
			</div>
		);
	}

	if (validating) {
		return null;
	}

	if (authed) {
		return <>{children}</>;
	}

	async function handleComplete(code: string) {
		try {
			const { token } = await apiValidateCode(code);
			setToken(token);
			setError(false);
			setAuthed(true);
		} catch {
			setError(true);
			setShake(true);
			setInputKey((k) => k + 1);
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
			role="dialog"
			aria-modal="true"
			aria-label="Вход по коду доступа"
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					e.preventDefault();
					e.stopPropagation();
				}
			}}
		>
			<div
				className={cn(
					"w-full max-w-xs rounded-xl bg-background p-6 shadow-lg ring-1 ring-foreground/10",
					shake && "motion-safe:animate-shake",
				)}
				onAnimationEnd={() => setShake(false)}
			>
				<h2 className="text-center text-lg font-medium">Код доступа</h2>
				<p className="mt-1 text-center text-sm text-muted-foreground">Введите код для доступа к сервису</p>
				<div className="mt-6 flex justify-center">
					<AccessCodeInput key={inputKey} onComplete={handleComplete} error={error} />
				</div>
				{error && <p className="mt-3 text-center text-sm text-destructive">Неверный код доступа</p>}
			</div>
		</div>
	);
}
