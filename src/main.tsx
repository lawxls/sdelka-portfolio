import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clearTokens, setTokens } from "@/data/auth";
import { buildDataClients } from "@/data/clients-config";
import { DataClientsProvider } from "@/data/clients-context";
import { installAuthHandlers } from "@/data/http-client";
import { queryClient } from "@/data/query-client";
import "./index.css";
import App from "./App.tsx";

const clients = buildDataClients();

if (clients.session) {
	const session = clients.session;
	installAuthHandlers({
		refresh: async () => {
			const result = await session.refresh();
			setTokens(result.access);
		},
		onAuthCleared: () => clearTokens(),
	});
}

// biome-ignore lint/style/noNonNullAssertion: root element guaranteed in index.html
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<DataClientsProvider clients={clients}>
				<BrowserRouter>
					<TooltipProvider>
						<App />
					</TooltipProvider>
				</BrowserRouter>
				<Toaster />
			</DataClientsProvider>
		</QueryClientProvider>
	</StrictMode>,
);
