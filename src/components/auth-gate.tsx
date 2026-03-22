import { useState } from "react";
import { AccessCodeInput } from "@/components/access-code-input";
import { isAuthenticated, setAuthenticated, validateCode } from "@/data/auth";
import { cn } from "@/lib/utils";

interface AuthGateProps {
	children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
	const [authed, setAuthed] = useState(isAuthenticated);
	const [error, setError] = useState(false);
	const [shake, setShake] = useState(false);
	const [inputKey, setInputKey] = useState(0);

	if (authed) {
		return <>{children}</>;
	}

	function handleComplete(code: string) {
		if (validateCode(code)) {
			setAuthenticated();
			setAuthed(true);
		} else {
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
