import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { AppLayout } from "@/components/app-layout";
import { AuthLayout } from "@/components/auth-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { RequireModule } from "@/components/require-module";
import { SettingsLayout } from "@/components/settings-layout";
import { firstAccessiblePath } from "@/data/permissions";
import { useMe } from "@/data/use-me";
import { INQUIRIES_PATH } from "@/lib/nav-items";
import { CompaniesSettingsPage } from "@/pages/companies-settings-page";
import { ConfirmEmailPage } from "@/pages/confirm-email-page";
import { EmailsSettingsPage } from "@/pages/emails-settings-page";
import { EmployeesSettingsPage } from "@/pages/employees-settings-page";
import { ForgotPasswordPage } from "@/pages/forgot-password-page";
import { ImpersonatePage } from "@/pages/impersonate-page";
import { LoginPage } from "@/pages/login-page";
import { ProcurementInquiriesPage } from "@/pages/procurement-inquiries-page";
import { ProcurementInquiryDetailPage } from "@/pages/procurement-inquiry-detail-page";
import { ProcurementPage } from "@/pages/procurement-page";
import { ProfileSettingsPage } from "@/pages/profile-settings-page";
import { RegisterPage } from "@/pages/register-page";
import { ResendConfirmationPage } from "@/pages/resend-confirmation-page";
import { ResetPasswordPage } from "@/pages/reset-password-page";
import { SettingsIndexPage } from "@/pages/settings-index-page";
import { TariffsSettingsPage } from "@/pages/tariffs-settings-page";
import { TasksPage } from "@/pages/tasks-page";
import { WorkspaceSettingsPage } from "@/pages/workspace-settings-page";

function ProcurementInquiriesOutletHost() {
	return (
		<>
			<ProcurementInquiriesPage />
			<Outlet />
		</>
	);
}

function FirstAccessibleRedirect() {
	const { data: me, isPending } = useMe();
	const { search, hash } = useLocation();
	if (isPending) return null;
	return <Navigate to={`${firstAccessiblePath(me)}${search}${hash}`} replace />;
}

function App() {
	return (
		<Routes>
			{/* Auth routes (public) */}
			<Route element={<AuthLayout />}>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route path="/confirm-email" element={<ConfirmEmailPage />} />
				<Route path="/resend-confirmation" element={<ResendConfirmationPage />} />
				<Route path="/forgot-password" element={<ForgotPasswordPage />} />
				<Route path="/reset-password" element={<ResetPasswordPage />} />
				<Route path="/impersonate" element={<ImpersonatePage />} />
			</Route>

			{/* App routes (protected) */}
			<Route element={<ProtectedRoute />}>
				<Route path="/" element={<FirstAccessibleRedirect />} />
				<Route path="/procurement" element={<FirstAccessibleRedirect />} />
				<Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
				<Route element={<AppLayout />}>
					<Route element={<RequireModule module="procurementInquiries" />}>
						<Route path={INQUIRIES_PATH} element={<ProcurementInquiriesOutletHost />}>
							<Route path=":slug" element={<ProcurementInquiryDetailPage />} />
						</Route>
					</Route>
					<Route element={<RequireModule module="positions" />}>
						<Route path="/positions" element={<ProcurementPage />} />
					</Route>
					<Route element={<RequireModule module="tasks" />}>
						<Route path="/tasks" element={<TasksPage />} />
					</Route>
					{/* Settings */}
					<Route element={<SettingsLayout />}>
						<Route path="/settings" element={<SettingsIndexPage />} />
						<Route path="/settings/profile" element={<ProfileSettingsPage />} />
						<Route element={<RequireModule module="workspaceSettings" />}>
							<Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
						</Route>
						<Route element={<RequireModule module="companies" />}>
							<Route path="/settings/companies" element={<CompaniesSettingsPage />} />
						</Route>
						<Route element={<RequireModule module="employees" />}>
							<Route path="/settings/employees" element={<EmployeesSettingsPage />} />
						</Route>
						<Route element={<RequireModule module="emails" />}>
							<Route path="/settings/emails" element={<EmailsSettingsPage />} />
						</Route>
						<Route path="/settings/tariffs" element={<TariffsSettingsPage />} />
					</Route>
				</Route>
			</Route>
		</Routes>
	);
}

export default App;
