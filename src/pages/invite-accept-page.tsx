import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { FormErrorBanner } from "@/components/form-error-banner";
import { Button } from "@/components/ui/button";
import { extractFormErrors } from "@/data/auth-errors";
import { validatePasswordWithConfirm } from "@/data/password-validation";
import { useInviteAccept } from "@/data/use-session";

export function InviteAcceptPage() {
	const [searchParams] = useSearchParams();
	const uid = searchParams.get("uid");
	const token = searchParams.get("token");
	const navigate = useNavigate();

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const inviteAccept = useInviteAccept();

	if (!uid || !token) {
		return (
			<>
				<h1 className="text-2xl font-semibold">Ссылка недействительна</h1>
				<p className="mt-2 text-sm text-muted-foreground">Запросите у администратора новое приглашение</p>
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

		try {
			await inviteAccept.mutateAsync({
				uid: uid as string,
				token: token as string,
				password,
				password_confirm: confirmPassword,
			});
			navigate("/", { replace: true });
		} catch (err: unknown) {
			const result = extractFormErrors(err);
			setError(result.error);
			setFieldErrors(result.fieldErrors);
		}
	}

	return (
		<>
			<h1 className="text-2xl font-semibold">Принять приглашение</h1>
			<p className="mt-1 text-sm text-muted-foreground">Придумайте пароль, чтобы завершить регистрацию</p>

			<form onSubmit={handleSubmit} className="mt-8 space-y-4">
				{error && (
					<FormErrorBanner>
						{error}
						<p className="mt-2">
							<Link to="/login" className="font-medium text-foreground hover:underline">
								Перейти к входу
							</Link>
						</p>
					</FormErrorBanner>
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
					name="password_confirm"
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					error={fieldErrors.password_confirm}
					autoComplete="new-password"
					required
				/>

				<Button type="submit" size="xl" className="w-full" disabled={inviteAccept.isPending}>
					Принять приглашение
				</Button>
			</form>
		</>
	);
}
