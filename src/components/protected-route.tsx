import { Navigate, Outlet, useLocation } from "react-router";
import { useSessionBootstrap } from "@/data/use-session";

/**
 * Splash shown while the cold-load `/auth/refresh/` is in flight. Keeps the
 * user from seeing a `/login` flash before the refresh cookie has been
 * exchanged for an access token.
 */
function BootstrapSplash() {
	return (
		<div
			className="flex min-h-screen items-center justify-center bg-background"
			role="status"
			aria-label="Загрузка"
			data-testid="session-bootstrap-splash"
		>
			<div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
		</div>
	);
}

export function ProtectedRoute() {
	const location = useLocation();
	const status = useSessionBootstrap();

	if (status === "pending") return <BootstrapSplash />;
	if (status === "anon") return <Navigate to="/login" state={{ from: location }} replace />;
	return <Outlet />;
}
