import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { setTokens } from "@/data/auth";
import { extractFormErrors, login } from "@/data/auth-api";

export function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const from =
		(location.state as { from?: { pathname: string; search?: string; hash?: string } })?.from ?? "/procurement";

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
			const result = extractFormErrors(err);
			const msg = result.error?.toLowerCase();
			const translated = msg?.includes("invalid email or password")
				? "Неверный пароль или почта"
				: msg?.includes("you don't have access to this workspace")
					? "У вас нет доступа к этому рабочему пространству"
					: result.error;
			setError(translated);
			setFieldErrors(result.fieldErrors);
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

				<Button type="submit" size="xl" className="w-full" disabled={submitting}>
					Войти
				</Button>
			</form>
		</>
	);
}
