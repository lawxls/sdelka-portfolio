import { LoaderCircle } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useSessionBootstrap } from "@/data/use-session";

// Splash keeps the user from seeing a /login flash while the cold-load
// /auth/refresh/ is in flight.
function BootstrapSplash() {
	return (
		<div
			className="flex min-h-screen items-center justify-center bg-background"
			role="status"
			data-testid="session-bootstrap-splash"
		>
			<LoaderCircle className="size-8 animate-spin text-muted-foreground" aria-label="Загрузка" />
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
