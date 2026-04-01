import { Building2, User } from "lucide-react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { AppLayout } from "@/components/app-layout";
import { AuthLayout } from "@/components/auth-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { SettingsLayout } from "@/components/settings-layout";
import { NAV_ITEMS } from "@/lib/nav-items";
import { CompaniesPage } from "@/pages/companies-page";
import { ConfirmEmailPage } from "@/pages/confirm-email-page";
import { EmployeesSettingsPage } from "@/pages/employees-settings-page";
import { ForgotPasswordPage } from "@/pages/forgot-password-page";
import { LoginPage } from "@/pages/login-page";
import { PlaceholderPage } from "@/pages/placeholder-page";
import { ProcurementPage } from "@/pages/procurement-page";
import { RegisterPage } from "@/pages/register-page";
import { ResetPasswordPage } from "@/pages/reset-password-page";
import { TasksPage } from "@/pages/tasks-page";

const PLACEHOLDER_ROUTES = NAV_ITEMS.filter(
	(item) => item.path !== "/procurement" && item.path !== "/tasks" && item.path !== "/companies",
);

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
				<Route path="/register" element={<RegisterPage />} />
				<Route path="/confirm-email" element={<ConfirmEmailPage />} />
				<Route path="/forgot-password" element={<ForgotPasswordPage />} />
				<Route path="/reset-password" element={<ResetPasswordPage />} />
			</Route>

			{/* App routes (protected) */}
			<Route element={<ProtectedRoute />}>
				<Route path="/" element={<RootRedirect />} />
				<Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
				<Route element={<AppLayout />}>
					<Route path="/procurement" element={<ProcurementPage />} />
					<Route path="/tasks" element={<TasksPage />} />
					<Route path="/companies" element={<CompaniesPage />} />
					{PLACEHOLDER_ROUTES.map(({ path, label, icon }) => (
						<Route
							key={path}
							path={path}
							element={<PlaceholderPage icon={icon} title={label} subtitle="В разработке" />}
						/>
					))}
					{/* Settings */}
					<Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
					<Route element={<SettingsLayout />}>
						<Route
							path="/settings/profile"
							element={<PlaceholderPage icon={User} title="Профиль" subtitle="В разработке" />}
						/>
						<Route
							path="/settings/companies"
							element={<PlaceholderPage icon={Building2} title="Компании" subtitle="В разработке" />}
						/>
						<Route path="/settings/employees" element={<EmployeesSettingsPage />} />
					</Route>
				</Route>
			</Route>
		</Routes>
	);
}

export default App;
