import { ThemeToggle } from "@/components/theme-toggle";

function App() {
	return (
		<div className="flex min-h-svh flex-col bg-background text-foreground">
			{/* Header */}
			<header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<h1 className="text-lg font-semibold tracking-tight">Портфель закупок</h1>
				<ThemeToggle />
			</header>

			{/* Main content area — toolbar + table will go here */}
			<main className="flex-1 overflow-x-auto p-4">
				<p className="text-muted-foreground">Таблица закупок будет здесь</p>
			</main>

			{/* Sticky bottom summary bar */}
			<footer className="sticky bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<p className="text-sm text-muted-foreground">Панель итогов будет здесь</p>
			</footer>
		</div>
	);
}

export default App;
