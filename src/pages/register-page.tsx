import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { clearInvitationCode, getInvitationCode, setInvitationCode } from "@/data/auth";
import { checkEmail, extractFormErrors, register, verifyInvitationCode } from "@/data/auth-api";
import { validatePasswordWithConfirm } from "@/data/password-validation";
import { useMountEffect } from "@/hooks/use-mount-effect";

type Stage = "email" | "details" | "confirmation";

export function RegisterPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [stage, setStage] = useState<Stage>("email");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	// Form state
	const [email, setEmail] = useState("");
	const [firstName, setFirstName] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	// Error state
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	// Validate invitation code on mount
	useMountEffect(() => {
		let cancelled = false;

		async function validate() {
			const urlCode = searchParams.get("code");
			if (urlCode) setInvitationCode(urlCode);

			const code = urlCode ?? getInvitationCode();
			if (!code) {
				navigate("/login", { replace: true });
				return;
			}

			try {
				const result = await verifyInvitationCode(code);
				if (cancelled) return;
				if (!result.valid) {
					navigate("/login", { replace: true });
					return;
				}
				setLoading(false);
			} catch {
				if (!cancelled) navigate("/login", { replace: true });
			}
		}

		validate();
		return () => {
			cancelled = true;
		};
	});

	async function handleEmailSubmit(e: React.FormEvent) {
		e.preventDefault();
		setFieldErrors({});
		setSubmitting(true);

		try {
			const result = await checkEmail(email);
			if (result.exists) {
				setFieldErrors({ email: "Этот email уже зарегистрирован" });
			} else {
				setStage("details");
			}
		} catch {
			setError("Произошла ошибка. Попробуйте ещё раз.");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDetailsSubmit(e: React.FormEvent) {
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
			const invitationCode = getInvitationCode();
			await register({
				email,
				password,
				first_name: firstName,
				phone: `+7${phone}`,
				invitation_code: invitationCode ?? "",
			});
			clearInvitationCode();
			setStage("confirmation");
		} catch (err: unknown) {
			const result = extractFormErrors(err);
			setError(result.error);
			setFieldErrors(result.fieldErrors);
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) return null;

	if (stage === "confirmation") {
		return (
			<>
				<h1 className="text-2xl font-semibold">Проверьте почту</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Мы отправили письмо с подтверждением на <span className="font-medium text-foreground">{email}</span>
				</p>
				<p className="mt-4 text-sm text-muted-foreground">
					<Link to="/login" className="text-foreground hover:underline">
						Войти
					</Link>
				</p>
			</>
		);
	}

	return (
		<>
			<h1 className="text-2xl font-semibold">Регистрация</h1>
			<p className="mt-1 text-sm text-muted-foreground">Создайте аккаунт</p>

			{stage === "email" && (
				<form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
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

					<Button type="submit" size="xl" className="w-full" disabled={submitting}>
						Продолжить
					</Button>
				</form>
			)}

			{stage === "details" && (
				<form onSubmit={handleDetailsSubmit} className="mt-8 space-y-4">
					{error && (
						<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{error}
						</div>
					)}

					<FloatingInput
						label="Имя"
						name="firstName"
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
						error={fieldErrors.first_name}
						autoComplete="given-name"
						required
					/>

					<FloatingInput
						label="Телефон"
						name="phone"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						error={fieldErrors.phone}
						autoComplete="tel"
						prefix="+7"
						inputMode="tel"
						required
					/>

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
						Зарегистрироваться
					</Button>
				</form>
			)}

			<p className="mt-6 text-center text-sm text-muted-foreground">
				Уже есть аккаунт?{" "}
				<Link to="/login" className="text-foreground hover:underline">
					Войти
				</Link>
			</p>
		</>
	);
}
