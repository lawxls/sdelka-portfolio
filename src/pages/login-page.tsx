import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { extractFormErrors } from "@/data/auth-errors";
import { AuthError, TooManyRequestsError } from "@/data/errors";
import { useLogin } from "@/data/use-session";
import { useCountdown } from "@/hooks/use-countdown";

export function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const from =
		(location.state as { from?: { pathname: string; search?: string; hash?: string } })?.from ?? "/inquiries";

	const login = useLogin();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [throttleStartSeconds, setThrottleStartSeconds] = useState(0);
	const throttleSecondsLeft = useCountdown(throttleStartSeconds);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (throttleSecondsLeft > 0 || login.isPending) return;
		setError(null);
		setFieldErrors({});

		try {
			await login.mutateAsync({ email, password });
			navigate(from, { replace: true });
		} catch (err: unknown) {
			if (
				err instanceof AuthError &&
				err.status === 403 &&
				typeof err.body === "object" &&
				err.body !== null &&
				(err.body as { code?: unknown }).code === "email_not_verified"
			) {
				navigate(`/resend-confirmation?email=${encodeURIComponent(email)}`);
				return;
			}
			const result = extractFormErrors(err);
			setError(result.error);
			setFieldErrors(result.fieldErrors);
			if (err instanceof TooManyRequestsError && err.retryAfter && err.retryAfter > 0) {
				setThrottleStartSeconds(err.retryAfter);
			}
		}
	}

	const submitDisabled = login.isPending || throttleSecondsLeft > 0;
	const submitLabel = throttleSecondsLeft > 0 ? `Подождите ${throttleSecondsLeft} с` : "Войти";

	return (
		<>
			<h1 className="text-2xl font-semibold">Вход</h1>
			<p className="mt-1 text-sm text-muted-foreground">Войдите в свой аккаунт</p>

			<form onSubmit={handleSubmit} className="mt-8 space-y-4">
				{error && (
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{error}
					</div>
				)}

				<FloatingInput
					label="Email"
					name="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					error={fieldErrors.email}
					autoComplete="email"
					required
				/>

				<FloatingInput
					label="Пароль"
					name="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={fieldErrors.password}
					autoComplete="current-password"
					required
				/>

				<div className="flex justify-end">
					<Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
						Забыли пароль?
					</Link>
				</div>

				<Button type="submit" size="xl" className="w-full" disabled={submitDisabled}>
					{submitLabel}
				</Button>
			</form>
		</>
	);
}
