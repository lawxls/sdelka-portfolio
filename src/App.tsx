import { Navigate, Route, Routes, useLocation } from "react-router";
import { AppLayout } from "@/components/app-layout";
import { AuthLayout } from "@/components/auth-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { NAV_ITEMS } from "@/lib/nav-items";
import { AnalyticsPage } from "@/pages/analytics-page";
import { CompaniesPage } from "@/pages/companies-page";
import { CompaniesSettingsPage } from "@/pages/companies-settings-page";
import { ConfirmEmailPage } from "@/pages/confirm-email-page";
import { EmployeesSettingsPage } from "@/pages/employees-settings-page";
import { ForgotPasswordPage } from "@/pages/forgot-password-page";
import { LoginPage } from "@/pages/login-page";
import { PlaceholderPage } from "@/pages/placeholder-page";
import { ProcurementPage } from "@/pages/procurement-page";
import { ProfileSettingsPage } from "@/pages/profile-settings-page";
import { RegisterPage } from "@/pages/register-page";
import { ResetPasswordPage } from "@/pages/reset-password-page";
import { SettingsLayout } from "@/pages/settings-layout";
import { TasksPage } from "@/pages/tasks-page";

const PLACEHOLDER_ROUTES = NAV_ITEMS.filter(
	(item) =>
		item.path !== "/procurement" && item.path !== "/tasks" && item.path !== "/companies" && item.path !== "/analytics",
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
				<Route element={<AppLayout />}>
					<Route path="/analytics" element={<AnalyticsPage />} />
					<Route path="/procurement" element={<ProcurementPage />} />
					<Route path="/tasks" element={<TasksPage />} />
					<Route path="/companies" element={<CompaniesPage />} />
					{/* /profile redirects to /settings/profile */}
					<Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
					{/* Settings section */}
					<Route path="/settings" element={<SettingsLayout />}>
						<Route index element={<Navigate to="profile" replace />} />
						<Route path="profile" element={<ProfileSettingsPage />} />
						<Route path="companies" element={<CompaniesSettingsPage />} />
						<Route path="employees" element={<EmployeesSettingsPage />} />
					</Route>
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
