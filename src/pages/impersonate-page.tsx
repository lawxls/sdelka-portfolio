import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { extractFormErrors } from "@/data/auth-errors";
import { useImpersonate } from "@/data/use-session";
import { useMountEffect } from "@/hooks/use-mount-effect";

type Status = "loading" | "error";

export function ImpersonatePage() {
	const [searchParams] = useSearchParams();
	const handoff = searchParams.get("handoff");
	const navigate = useNavigate();
	const impersonate = useImpersonate();

	const [status, setStatus] = useState<Status>(handoff ? "loading" : "error");
	const [errorMessage, setErrorMessage] = useState<string>(handoff ? "" : "Ссылка недействительна");

	useMountEffect(() => {
		if (!handoff) return undefined;
		impersonate.mutate(
			{ handoff },
			{
				onSuccess: () => {
					navigate("/", { replace: true });
				},
				onError: (err) => {
					const { error } = extractFormErrors(err);
					setErrorMessage(error ?? "Ссылка недействительна или истекла");
					setStatus("error");
				},
			},
		);
		return undefined;
	});

	if (status === "loading") {
		return (
			<>
				<h1 className="text-2xl font-semibold">Входим как пользователь</h1>
				<p className="mt-2 text-sm text-muted-foreground">Открываем сессию…</p>
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
