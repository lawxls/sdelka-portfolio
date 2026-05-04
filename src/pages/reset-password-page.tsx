import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { extractFormErrors } from "@/data/auth-errors";
import { validatePasswordWithConfirm } from "@/data/password-validation";
import { useResetPassword } from "@/data/use-session";

export function ResetPasswordPage() {
	const [searchParams] = useSearchParams();
	const uid = searchParams.get("uid");
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [success, setSuccess] = useState(false);

	const resetPassword = useResetPassword();

	if (!uid || !token) {
		return (
			<>
				<h1 className="text-2xl font-semibold">Ссылка недействительна</h1>
				<p className="mt-2 text-sm text-muted-foreground">Запросите новую ссылку для восстановления пароля</p>
				<p className="mt-4 text-sm">
					<Link to="/forgot-password" className="text-foreground hover:underline">
						Запросить ссылку
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
			// validatePasswordWithConfirm emits keys `password` / `password_confirm`;
			// remap to the API field names so backend ValidationError responses
			// (which key by `new_password` / `new_password_confirm`) blend without
			// a remap layer in the JSX.
			const remapped: Record<string, string> = {};
			if (validationErrors.password) remapped.new_password = validationErrors.password;
			if (validationErrors.password_confirm) remapped.new_password_confirm = validationErrors.password_confirm;
			setFieldErrors(remapped);
			return;
		}

		try {
			await resetPassword.mutateAsync({
				uid: uid as string,
				token: token as string,
				new_password: password,
				new_password_confirm: confirmPassword,
			});
			setSuccess(true);
		} catch (err: unknown) {
			const result = extractFormErrors(err);
			setError(result.error);
			setFieldErrors(result.fieldErrors);
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
						<p className="mt-2">
							<Link to="/forgot-password" className="font-medium text-foreground hover:underline">
								Запросить новую ссылку
							</Link>
						</p>
					</div>
				)}

				<FloatingInput
					label="Пароль"
					name="new_password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={fieldErrors.new_password}
					autoComplete="new-password"
					required
				/>

				<FloatingInput
					label="Подтвердите пароль"
					name="new_password_confirm"
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					error={fieldErrors.new_password_confirm}
					autoComplete="new-password"
					required
				/>

				<Button type="submit" size="xl" className="w-full" disabled={resetPassword.isPending}>
					Сохранить
				</Button>
			</form>
		</>
	);
}
