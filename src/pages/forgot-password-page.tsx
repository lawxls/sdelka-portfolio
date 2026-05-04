import { useState } from "react";
import { Link } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { useForgotPassword } from "@/data/use-session";

export function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const forgotPassword = useForgotPassword();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		try {
			await forgotPassword.mutateAsync({ email });
		} catch {
			// Anti-enumeration: render the same success copy regardless of whether
			// the backend matched the email. Defense-in-depth — the HTTP backend
			// returns 200 either way, but a network blip / in-memory adapter quirk
			// shouldn't tell the user the email is unknown.
		}
		setSubmitted(true);
	}

	if (submitted) {
		return (
			<>
				<h1 className="text-2xl font-semibold">Проверьте почту</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Если аккаунт существует, мы отправили ссылку для восстановления пароля
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
					required
				/>

				<Button type="submit" size="xl" className="w-full" disabled={forgotPassword.isPending}>
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
