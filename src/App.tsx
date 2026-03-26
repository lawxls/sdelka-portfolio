import { Building2, LayoutDashboard, ListTodo } from "lucide-react";
import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/components/app-layout";
import { PlaceholderPage } from "@/pages/placeholder-page";
import { ProcurementPage } from "@/pages/procurement-page";

function App() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/procurement" replace />} />
			<Route element={<AppLayout />}>
				<Route path="/procurement" element={<ProcurementPage />} />
				<Route
					path="/analytics"
					element={<PlaceholderPage icon={LayoutDashboard} title="Аналитика" subtitle="В разработке" />}
				/>
				<Route
					path="/companies"
					element={<PlaceholderPage icon={Building2} title="Компании" subtitle="В разработке" />}
				/>
				<Route path="/tasks" element={<PlaceholderPage icon={ListTodo} title="Задачи" subtitle="В разработке" />} />
			</Route>
		</Routes>
	);
}

export default App;
