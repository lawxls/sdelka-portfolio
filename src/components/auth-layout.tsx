import { Outlet } from "react-router";
import { LogoWordmark } from "@/components/logo-wordmark";

const CELL = 2;
const COLS = 14;
const ROWS = 16;

function seededRandom(seed: number) {
	let s = seed;
	return () => {
		s = (s * 16807) % 2147483647;
		return s / 2147483647;
	};
}

function buildGridLines() {
	const rand = seededRandom(42);
	const d: string[] = [];
	for (let row = 0; row <= ROWS; row++) {
		for (let col = 0; col < COLS; col++) {
			if (rand() < 0.65) {
				const y = row * CELL;
				d.push(`M${col * CELL},${y}h${CELL}`);
			}
		}
	}
	for (let col = 0; col <= COLS; col++) {
		for (let row = 0; row < ROWS; row++) {
			if (rand() < 0.65) {
				const x = col * CELL;
				d.push(`M${x},${row * CELL}v${CELL}`);
			}
		}
	}
	return d.join("");
}

const GRID_PATH = buildGridLines();

export function AuthLayout() {
	return (
		<div className="flex h-svh">
			<div className="flex w-full flex-col overflow-y-auto px-6 py-8 lg:w-1/2 lg:px-16">
				<LogoWordmark className="h-5 w-auto self-start text-foreground" />
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-96">
						<Outlet />
					</div>
				</div>
			</div>
			<div
				data-testid="auth-gradient-panel"
				className="relative hidden lg:block lg:w-1/2"
				style={{
					background: "linear-gradient(135deg, #d1fe16 0%, #000000 100%)",
				}}
			>
				<svg
					className="absolute inset-0 size-full"
					aria-hidden="true"
					preserveAspectRatio="xMinYMin slice"
					viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
				>
					<path d={GRID_PATH} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
				</svg>
			</div>
		</div>
	);
}
