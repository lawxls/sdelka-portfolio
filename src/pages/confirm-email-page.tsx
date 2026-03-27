import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { confirmEmail, extractFormErrors } from "@/data/auth-api";
import { useMountEffect } from "@/hooks/use-mount-effect";

type Status = "loading" | "success" | "already-confirmed" | "error";

export function ConfirmEmailPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const [status, setStatus] = useState<Status>(token ? "loading" : "error");
	const [errorMessage, setErrorMessage] = useState<string | null>(token ? null : "Ссылка недействительна");

	useMountEffect(() => {
		if (!token) return;
		let cancelled = false;

		async function confirm() {
			try {
				const result = await confirmEmail(token as string);
				if (cancelled) return;
				setStatus(result.message === "Email already confirmed" ? "already-confirmed" : "success");
			} catch (err: unknown) {
				if (cancelled) return;
				const { error } = extractFormErrors(err);
				setErrorMessage(error ?? "Произошла ошибка. Попробуйте ещё раз.");
				setStatus("error");
			}
		}

		confirm();
		return () => {
			cancelled = true;
		};
	});

	if (status === "loading") {
		return (
			<>
				<h1 className="text-2xl font-semibold">Подтверждение email</h1>
				<p className="mt-2 text-sm text-muted-foreground">Подтверждаем ваш email…</p>
			</>
		);
	}

	const content = {
		success: { title: "Email подтверждён", message: "Ваш email успешно подтверждён" },
		"already-confirmed": { title: "Email уже подтверждён", message: "Этот email уже был подтверждён ранее" },
		error: { title: "Ошибка", message: errorMessage },
	};

	const { title, message } = content[status];

	return (
		<>
			<h1 className="text-2xl font-semibold">{title}</h1>
			<p className="mt-2 text-sm text-muted-foreground">{message}</p>
			<p className="mt-4 text-sm">
				<Link to="/login" className="text-foreground hover:underline">
					Перейти к входу
				</Link>
			</p>
		</>
	);
}
