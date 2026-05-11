import { useState } from "react";
import { Link } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { FormErrorBanner } from "@/components/form-error-banner";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { extractFormErrors } from "@/data/auth-errors";
import { validatePasswordWithConfirm } from "@/data/password-validation";
import { useCheckEmail, useRegister } from "@/data/use-session";
import { digitsOnly } from "@/lib/format";

type Stage = "email" | "details" | "confirmation";

export function RegisterPage() {
	const [stage, setStage] = useState<Stage>("email");

	const [email, setEmail] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [patronymic, setPatronymic] = useState("");
	const [phone, setPhone] = useState("");
	const [inn, setInn] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");

	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const checkEmail = useCheckEmail();
	const register = useRegister();
	const submitting = checkEmail.isPending || register.isPending;

	async function handleEmailSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setFieldErrors({});

		try {
			const result = await checkEmail.mutateAsync(email);
			if (result.exists) {
				setFieldErrors({ email: "Этот email уже зарегистрирован" });
			} else {
				setStage("details");
			}
		} catch {
			setError("Произошла ошибка. Попробуйте ещё раз.");
		}
	}

	async function handleDetailsSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setFieldErrors({});

		const localErrors = validatePasswordWithConfirm(password, passwordConfirm);
		if (localErrors) {
			setFieldErrors(localErrors);
			return;
		}

		try {
			await register.mutateAsync({
				email,
				password,
				password_confirm: passwordConfirm,
				first_name: firstName,
				last_name: lastName,
				patronymic: patronymic || undefined,
				phone,
				inn,
			});
			setStage("confirmation");
		} catch (err: unknown) {
			const result = extractFormErrors(err);
			setError(result.error);
			setFieldErrors(result.fieldErrors);
		}
	}

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
					{error && <FormErrorBanner>{error}</FormErrorBanner>}

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
					{error && <FormErrorBanner>{error}</FormErrorBanner>}

					<div className="grid grid-cols-2 gap-3">
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
							label="Фамилия"
							name="lastName"
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							error={fieldErrors.last_name}
							autoComplete="family-name"
						/>
					</div>

					<FloatingInput
						label="Отчество"
						name="patronymic"
						value={patronymic}
						onChange={(e) => setPatronymic(e.target.value)}
						error={fieldErrors.patronymic}
						autoComplete="additional-name"
					/>

					<div className="space-y-1.5">
						<div className="flex items-baseline gap-0.5">
							<label htmlFor="phone" className="text-sm font-medium text-foreground">
								Телефон
							</label>
							<span aria-hidden="true" className="text-sm font-medium text-destructive">
								*
							</span>
						</div>
						<PhoneInput
							id="phone"
							value={phone}
							onChange={setPhone}
							aria-label="Телефон"
							aria-invalid={Boolean(fieldErrors.phone)}
						/>
						{fieldErrors.phone && <p className="mt-1 text-xs text-destructive">{fieldErrors.phone}</p>}
					</div>

					<FloatingInput
						label="ИНН компании"
						name="inn"
						value={inn}
						onChange={(e) => setInn(digitsOnly(e.target.value))}
						error={fieldErrors.inn}
						inputMode="numeric"
						maxLength={12}
						autoComplete="off"
						required
					/>

					<div className="grid grid-cols-2 gap-3">
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
							name="passwordConfirm"
							type="password"
							value={passwordConfirm}
							onChange={(e) => setPasswordConfirm(e.target.value)}
							error={fieldErrors.password_confirm}
							autoComplete="new-password"
							required
						/>
					</div>

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
