import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { isAuthenticated } from "@/data/auth";
import { useMountEffect } from "@/hooks/use-mount-effect";

export function ProtectedRoute() {
	const location = useLocation();
	const [authed, setAuthed] = useState(() => isAuthenticated());

	useMountEffect(() => {
		function handleCleared() {
			setAuthed(false);
		}
		window.addEventListener("auth:cleared", handleCleared);
		return () => window.removeEventListener("auth:cleared", handleCleared);
	});

	if (!authed) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <Outlet />;
}
