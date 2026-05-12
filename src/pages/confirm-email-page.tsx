import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { extractFormErrors } from "@/data/auth-errors";
import { useConfirmEmail } from "@/data/use-session";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { INQUIRIES_PATH } from "@/lib/nav-items";

type Status = "loading" | "error";

export function ConfirmEmailPage() {
	const [searchParams] = useSearchParams();
	const uid = searchParams.get("uid");
	const token = searchParams.get("token");
	const navigate = useNavigate();
	const confirmEmail = useConfirmEmail();

	const hasParams = Boolean(uid && token);
	const [status, setStatus] = useState<Status>(hasParams ? "loading" : "error");
	const [errorMessage, setErrorMessage] = useState<string>(hasParams ? "" : "Ссылка недействительна");

	useMountEffect(() => {
		if (!uid || !token) return undefined;
		confirmEmail.mutate(
			{ uid, token },
			{
				onSuccess: () => {
					navigate(INQUIRIES_PATH, { replace: true });
				},
				onError: (err) => {
					const { error } = extractFormErrors(err);
					setErrorMessage(error ?? "Произошла ошибка. Попробуйте ещё раз.");
					setStatus("error");
				},
			},
		);
		return undefined;
	});

	if (status === "loading") {
		return (
			<>
				<h1 className="text-2xl font-semibold">Подтверждение email</h1>
				<p className="mt-2 text-sm text-muted-foreground">Подтверждаем ваш email…</p>
			</>
		);
	}

	return (
		<>
			<h1 className="text-2xl font-semibold">Ошибка</h1>
			<p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
			<p className="mt-4 text-sm">
				<Link to="/resend-confirmation" className="text-foreground hover:underline">
					Отправить ссылку ещё раз
				</Link>
			</p>
			<p className="mt-2 text-sm">
				<Link to="/login" className="text-muted-foreground hover:text-foreground">
					Перейти к входу
				</Link>
			</p>
		</>
	);
}
