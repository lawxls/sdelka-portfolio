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
			"/api": "http://localhost:8000",
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./src/test-setup.ts",
	},
});
