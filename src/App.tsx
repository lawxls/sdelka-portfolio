import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/components/app-layout";
import { NAV_ITEMS } from "@/lib/nav-items";
import { PlaceholderPage } from "@/pages/placeholder-page";
import { ProcurementPage } from "@/pages/procurement-page";

const PLACEHOLDER_ROUTES = NAV_ITEMS.filter((item) => item.path !== "/procurement");

function App() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/procurement" replace />} />
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
		</Routes>
	);
}

export default App;
