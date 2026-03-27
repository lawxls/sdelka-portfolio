import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { confirmEmail, parseApiError } from "@/data/auth-api";
import { useMountEffect } from "@/hooks/use-mount-effect";

type Status = "loading" | "success" | "already-confirmed" | "error";

export function ConfirmEmailPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const [status, setStatus] = useState<Status>("loading");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useMountEffect(() => {
		if (!token) return;
		let cancelled = false;

		async function confirm() {
			try {
				const result = await confirmEmail(token as string);
				if (cancelled) return;
				if (result.message === "Email already confirmed") {
					setStatus("already-confirmed");
				} else {
					setStatus("success");
				}
			} catch (err: unknown) {
				if (cancelled) return;
				const apiErr = err as { body?: unknown };
				const parsed = parseApiError(apiErr.body);
				setErrorMessage(parsed.detail ?? "Произошла ошибка. Попробуйте ещё раз.");
				setStatus("error");
			}
		}

		confirm();
		return () => {
			cancelled = true;
		};
	});

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

	if (status === "loading") {
		return (
			<>
				<h1 className="text-2xl font-semibold">Подтверждение email</h1>
				<p className="mt-2 text-sm text-muted-foreground">Подтверждаем ваш email…</p>
			</>
		);
	}

	if (status === "success") {
		return (
			<>
				<h1 className="text-2xl font-semibold">Email подтверждён</h1>
				<p className="mt-2 text-sm text-muted-foreground">Ваш email успешно подтверждён</p>
				<p className="mt-4 text-sm">
					<Link to="/login" className="text-foreground hover:underline">
						Перейти к входу
					</Link>
				</p>
			</>
		);
	}

	if (status === "already-confirmed") {
		return (
			<>
				<h1 className="text-2xl font-semibold">Email уже подтверждён</h1>
				<p className="mt-2 text-sm text-muted-foreground">Этот email уже был подтверждён ранее</p>
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
			<h1 className="text-2xl font-semibold">Ошибка</h1>
			<p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
			<p className="mt-4 text-sm">
				<Link to="/login" className="text-foreground hover:underline">
					Перейти к входу
				</Link>
			</p>
		</>
	);
}
