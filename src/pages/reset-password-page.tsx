import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { extractFormErrors, resetPassword } from "@/data/auth-api";
import { validatePasswordWithConfirm } from "@/data/password-validation";

export function ResetPasswordPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);

	if (!token) {
		return (
			<>
				<h1 className="text-2xl font-semibold">Ошибка</h1>
				<p className="mt-2 text-sm text-muted-foreground">Ссылка недействительна</p>
				<p className="mt-4 text-sm">
					<Link to="/login" className="text-foreground hover:underline">
						Перейти к входу
					</Link>
				</p>
			</>
		);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setFieldErrors({});

		const validationErrors = validatePasswordWithConfirm(password, confirmPassword);
		if (validationErrors) {
			setFieldErrors(validationErrors);
			return;
		}

		setSubmitting(true);

		try {
			await resetPassword(token as string, password);
			setSuccess(true);
		} catch (err: unknown) {
			const result = extractFormErrors(err);
			setError(result.error);
			setFieldErrors(result.fieldErrors);
		} finally {
			setSubmitting(false);
		}
	}

	if (success) {
		return (
			<>
				<h1 className="text-2xl font-semibold">Пароль изменён</h1>
				<p className="mt-2 text-sm text-muted-foreground">Вы можете войти с новым паролем</p>
				<p className="mt-4 text-sm">
					<Link to="/login" className="text-foreground hover:underline">
						Перейти к входу
					</Link>
				</p>
			</>
		);
	}

	return (
		<>
			<h1 className="text-2xl font-semibold">Новый пароль</h1>
			<p className="mt-1 text-sm text-muted-foreground">Введите новый пароль</p>

			<form onSubmit={handleSubmit} className="mt-8 space-y-4">
				{error && (
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{error}
					</div>
				)}

				<FloatingInput
					label="Пароль"
					name="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={fieldErrors.password}
					autoComplete="new-password"
					required
				/>

				<FloatingInput
					label="Подтвердите пароль"
					name="confirmPassword"
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					error={fieldErrors.confirmPassword}
					autoComplete="new-password"
					required
				/>

				<Button type="submit" size="xl" className="w-full" disabled={submitting}>
					Сохранить
				</Button>
			</form>
		</>
	);
}
