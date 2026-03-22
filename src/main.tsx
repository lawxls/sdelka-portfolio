import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthGate } from "@/components/auth-gate";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./index.css";
import App from "./App.tsx";

// biome-ignore lint/style/noNonNullAssertion: root element guaranteed in index.html
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<AuthGate>
			<BrowserRouter>
				<TooltipProvider>
					<Routes>
						<Route path="/" element={<App />} />
					</Routes>
				</TooltipProvider>
			</BrowserRouter>
		</AuthGate>
	</StrictMode>,
);
