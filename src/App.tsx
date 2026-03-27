import { Navigate, Route, Routes, useLocation } from "react-router";
import { AppLayout } from "@/components/app-layout";
import { AuthLayout } from "@/components/auth-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { NAV_ITEMS } from "@/lib/nav-items";
import { LoginPage } from "@/pages/login-page";
import { PlaceholderPage } from "@/pages/placeholder-page";
import { ProcurementPage } from "@/pages/procurement-page";

const PLACEHOLDER_ROUTES = NAV_ITEMS.filter((item) => item.path !== "/procurement");

function RootRedirect() {
	const { search } = useLocation();
	return <Navigate to={`/procurement${search}`} replace />;
}

function App() {
	return (
		<Routes>
			{/* Auth routes (public) */}
			<Route element={<AuthLayout />}>
				<Route path="/login" element={<LoginPage />} />
			</Route>

			{/* App routes (protected) */}
			<Route element={<ProtectedRoute />}>
				<Route path="/" element={<RootRedirect />} />
				<Route element={<AppLayout />}>
					<Route path="/procurement" element={<ProcurementPage />} />
					{PLACEHOLDER_ROUTES.map(({ path, label, icon }) => (
						<Route
							key={path}
							path={path}
							element={<PlaceholderPage icon={icon} title={label} subtitle="В разработке" />}
						/>
					))}
				</Route>
			</Route>
		</Routes>
	);
}

export default App;
