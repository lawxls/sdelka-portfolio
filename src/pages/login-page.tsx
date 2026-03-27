import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { setTokens } from "@/data/auth";
import { login, parseApiError } from "@/data/auth-api";

export function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/procurement";

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setFieldErrors({});
		setSubmitting(true);

		try {
			const result = await login(email, password);
			setTokens(result.access, result.refresh);
			navigate(from, { replace: true });
		} catch (err: unknown) {
			const apiErr = err as { body?: unknown };
			const parsed = parseApiError(apiErr.body);
			if (parsed.detail) {
				setError(parsed.detail);
			}
			if (Object.keys(parsed.fieldErrors).length > 0) {
				setFieldErrors(parsed.fieldErrors);
			}
			if (!parsed.detail && Object.keys(parsed.fieldErrors).length === 0) {
				setError("Произошла ошибка. Попробуйте ещё раз.");
			}
		} finally {
			setSubmitting(false);
		}
	}

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
				/>

				<FloatingInput
					label="Пароль"
					name="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={fieldErrors.password}
					autoComplete="current-password"
				/>

				<div className="flex justify-end">
					<Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
						Забыли пароль?
					</Link>
				</div>

				<Button type="submit" className="w-full" disabled={submitting}>
					Войти
				</Button>
			</form>
		</>
	);
}
