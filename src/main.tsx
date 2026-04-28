import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { buildDataClients } from "@/data/clients-config";
import { DataClientsProvider } from "@/data/clients-context";
import { queryClient } from "@/data/query-client";
import "./index.css";
import App from "./App.tsx";

const clients = buildDataClients();

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
