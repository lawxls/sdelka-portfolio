import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { extractFormErrors } from "@/data/auth-errors";
import { useConfirmEmail } from "@/data/use-session";
import { useMountEffect } from "@/hooks/use-mount-effect";

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
	// Guard against StrictMode dev double-mount firing the mutation twice — the
	// token self-invalidates after the first activate (its hash bakes in
	// is_active), so the second POST would race or 400.
	const submitted = useRef(false);

	useMountEffect(() => {
		if (!uid || !token || submitted.current) return undefined;
		submitted.current = true;
		confirmEmail.mutate(
			{ uid, token },
			{
				onSuccess: () => {
					navigate("/", { replace: true });
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
