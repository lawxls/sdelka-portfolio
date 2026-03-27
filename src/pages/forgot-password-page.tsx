import { useState } from "react";
import { Link } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { forgotPassword } from "@/data/auth-api";

export function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);

		try {
			await forgotPassword(email);
			setSubmitted(true);
		} finally {
			setSubmitting(false);
		}
	}

	if (submitted) {
		return (
			<>
				<h1 className="text-2xl font-semibold">Проверьте почту</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Мы отправили инструкции по восстановлению пароля на {email}
				</p>
				<p className="mt-6 text-sm">
					<Link to="/login" className="text-foreground hover:underline">
						Назад к входу
					</Link>
				</p>
			</>
		);
	}

	return (
		<>
			<h1 className="text-2xl font-semibold">Восстановление пароля</h1>
			<p className="mt-1 text-sm text-muted-foreground">Введите email для восстановления доступа</p>

			<form onSubmit={handleSubmit} className="mt-8 space-y-4">
				<FloatingInput
					label="Email"
					name="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					autoComplete="email"
				/>

				<Button type="submit" className="w-full" disabled={submitting}>
					Отправить
				</Button>
			</form>

			<p className="mt-6 text-center text-sm">
				<Link to="/login" className="text-muted-foreground hover:text-foreground">
					Назад к входу
				</Link>
			</p>
		</>
	);
}
