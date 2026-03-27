import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { AUTH_CLEARED_EVENT, isAuthenticated } from "@/data/auth";
import { useMountEffect } from "@/hooks/use-mount-effect";

export function ProtectedRoute() {
	const location = useLocation();
	const [authed, setAuthed] = useState(() => isAuthenticated());

	useMountEffect(() => {
		function handleCleared() {
			setAuthed(false);
		}
		window.addEventListener(AUTH_CLEARED_EVENT, handleCleared);
		return () => window.removeEventListener(AUTH_CLEARED_EVENT, handleCleared);
	});

	if (!authed) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <Outlet />;
}
