export async function enableMocking() {
	if (import.meta.env.PROD) return;

	const { worker } = await import("./browser");
	await worker.start({ onUnhandledRequest: "bypass" });

	// Seed a fake auth token so ProtectedRoute allows access
	if (!localStorage.getItem("auth-access-token")) {
		localStorage.setItem("auth-access-token", "mock-token");
		localStorage.setItem("auth-refresh-token", "mock-refresh");
	}
}
