import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/data/query-client";
import { enableMocking } from "@/mocks/enable-mocking";
import "./index.css";
import App from "./App.tsx";

enableMocking().then(() => {
	// biome-ignore lint/style/noNonNullAssertion: root element guaranteed in index.html
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<BrowserRouter>
					<TooltipProvider>
						<App />
					</TooltipProvider>
				</BrowserRouter>
				<Toaster />
			</QueryClientProvider>
		</StrictMode>,
	);
});
