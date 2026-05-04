import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { useResendConfirmation } from "@/data/use-session";

export function ResendConfirmationPage() {
	const [searchParams] = useSearchParams();
	const [email, setEmail] = useState(searchParams.get("email") ?? "");
	const [submitted, setSubmitted] = useState(false);
	const resend = useResendConfirmation();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (resend.isPending || submitted) return;
		// Anti-enumeration: surface the same success state regardless of whether
		// the backend accepted or rejected (network blip, throttle, missing user).
		// The user is told to check the inbox; if there's no account, no email
		// arrives — we never tell them which case occurred.
		try {
			await resend.mutateAsync(email);
		} catch {
			// swallow — the success view doesn't reveal outcome.
		}
		setSubmitted(true);
	}

	if (submitted) {
		return (
			<>
				<h1 className="text-2xl font-semibold">Проверьте почту</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Если аккаунт существует, мы отправили письмо для подтверждения почты.
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
			<h1 className="text-2xl font-semibold">Подтверждение почты</h1>
			<p className="mt-1 text-sm text-muted-foreground">Отправим ссылку для подтверждения на указанный email.</p>

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

				<Button type="submit" size="xl" className="w-full" disabled={resend.isPending}>
					Отправить ссылку
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
