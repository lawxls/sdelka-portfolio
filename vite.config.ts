import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": `${import.meta.dirname}/src`,
		},
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:8001",
				changeOrigin: true,
			},
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./src/test-setup.ts",
	},
});
