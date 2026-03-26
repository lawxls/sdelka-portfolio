import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/components/app-layout";
import { ProcurementPage } from "@/pages/procurement-page";

function StubPage({ title }: { title: string }) {
	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="text-center">
				<h1 className="text-2xl font-semibold">{title}</h1>
				<p className="mt-2 text-muted-foreground">В разработке</p>
			</div>
		</div>
	);
}

function App() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/procurement" replace />} />
			<Route element={<AppLayout />}>
				<Route path="/procurement" element={<ProcurementPage />} />
				<Route path="/analytics" element={<StubPage title="Аналитика" />} />
				<Route path="/companies" element={<StubPage title="Компании" />} />
				<Route path="/tasks" element={<StubPage title="Задачи" />} />
			</Route>
		</Routes>
	);
}

export default App;
