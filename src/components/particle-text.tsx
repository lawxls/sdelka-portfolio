import { useRef } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";

const TARGET_PARTICLE_COUNT = 5000;
const REPEL_RADIUS = 120;
const REPEL_STRENGTH = 6;
const RETURN_SPEED = 0.06;
const FRICTION = 0.88;
const FONT_WEIGHT = "900";
const TEXT_FILL_RATIO = 0.8;

// Bright lime RGB — high base alpha so it reads as lime on black, not dark green
const BASE_R = 209;
const BASE_G = 254;
const BASE_B = 22;
const BASE_ALPHA = 0.88;

// Entrance animation
const ENTRANCE_SWEEP = 1200; // ms — total stagger window (left→right)
const ENTRANCE_FLY = 600; // ms — per-particle fly-in duration

interface Particle {
	originX: number;
	originY: number;
	spawnX: number;
	spawnY: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	w: number; // half-width (randomized per particle)
	h: number; // half-height (randomized per particle)
	delay: number; // entrance delay (ms) based on originX
	arrived: boolean;
}

function easeOutCubic(t: number) {
	const t1 = 1 - t;
	return 1 - t1 * t1 * t1;
}

function sampleTextParticles(text: string, width: number, height: number, count: number): Particle[] {
	const offscreen = document.createElement("canvas");
	offscreen.width = width;
	offscreen.height = height;
	const ctx = offscreen.getContext("2d", { willReadFrequently: true });
	if (!ctx) return [];

	const targetWidth = width * TEXT_FILL_RATIO;
	let fontSize = 10;
	ctx.font = `${FONT_WEIGHT} ${fontSize}px sans-serif`;
	const measured = ctx.measureText(text);
	fontSize = Math.floor((targetWidth / measured.width) * fontSize);

	ctx.font = `${FONT_WEIGHT} ${fontSize}px sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#fff";
	ctx.fillText(text, width / 2, height / 2);

	const imageData = ctx.getImageData(0, 0, width, height);
	const filled: [number, number][] = [];
	const step = Math.max(1, Math.floor(Math.sqrt((width * height) / (count * 4))));

	for (let y = 0; y < height; y += step) {
		for (let x = 0; x < width; x += step) {
			const alpha = imageData.data[(y * width + x) * 4 + 3];
			if (alpha > 128) {
				filled.push([x, y]);
			}
		}
	}

	// Find text bounding box for normalizing entrance delay
	let minX = width;
	let maxX = 0;
	for (const [fx] of filled) {
		if (fx < minX) minX = fx;
		if (fx > maxX) maxX = fx;
	}
	const textSpan = maxX - minX || 1;

	const particles: Particle[] = [];
	const stride = Math.max(1, Math.floor(filled.length / count));
	const dpr = devicePixelRatio;
	const baseSize = 1.5 * dpr;

	for (let i = 0; i < filled.length && particles.length < count; i += stride) {
		const [x, y] = filled[i];

		// Randomized rectangular particle (varying width/height independently)
		const w = baseSize * (0.4 + Math.random() * 1.4);
		const h = baseSize * (0.4 + Math.random() * 1.4);

		// Entrance: spawn off-screen left, stagger delay by horizontal position
		const normalizedX = (x - minX) / textSpan;
		const delay = normalizedX * ENTRANCE_SWEEP;
		const spawnX = -150 * dpr + Math.random() * 80 * dpr;
		const spawnY = y + (Math.random() - 0.5) * 60 * dpr;

		particles.push({
			originX: x,
			originY: y,
			spawnX,
			spawnY,
			x: spawnX,
			y: spawnY,
			vx: 0,
			vy: 0,
			w,
			h,
			delay,
			arrived: false,
		});
	}

	return particles;
}

export function ParticleText({ text }: { text: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useMountEffect(() => {
		if (!canvasRef.current) return;
		const canvas: HTMLCanvasElement = canvasRef.current;
		const maybeCtx = canvas.getContext("2d");
		if (!maybeCtx) return;
		const ctx: CanvasRenderingContext2D = maybeCtx;

		let particles: Particle[] = [];
		const mouse = { x: -9999, y: -9999 };
		let rafId = 0;
		let startTime = 0;

		function initParticles() {
			const { width, height } = canvas.getBoundingClientRect();
			canvas.width = width * devicePixelRatio;
			canvas.height = height * devicePixelRatio;
			particles = sampleTextParticles(text, canvas.width, canvas.height, TARGET_PARTICLE_COUNT);
			startTime = performance.now();
		}

		initParticles();

		const ro = new ResizeObserver(() => initParticles());
		ro.observe(canvas);

		function handleMouseMove(e: MouseEvent) {
			const rect = canvas.getBoundingClientRect();
			mouse.x = (e.clientX - rect.left) * devicePixelRatio;
			mouse.y = (e.clientY - rect.top) * devicePixelRatio;
		}

		function handleMouseLeave() {
			mouse.x = -9999;
			mouse.y = -9999;
		}

		canvas.addEventListener("mousemove", handleMouseMove);
		canvas.addEventListener("mouseleave", handleMouseLeave);

		const scaledRepelRadius = REPEL_RADIUS * devicePixelRatio;
		const maxDisplacement = scaledRepelRadius * 1.5;
		const entranceEnd = ENTRANCE_SWEEP + ENTRANCE_FLY;

		// 8 displacement buckets for batched color
		const BUCKET_COUNT = 8;
		const bucketStyles: string[] = [];
		for (let b = 0; b < BUCKET_COUNT; b++) {
			const t = b / (BUCKET_COUNT - 1);
			const alpha = BASE_ALPHA + t * (1 - BASE_ALPHA);
			bucketStyles.push(`rgba(${BASE_R},${BASE_G},${BASE_B},${alpha})`);
		}
		const buckets: number[][] = Array.from({ length: BUCKET_COUNT }, () => []);

		function animate(now: number) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const elapsed = now - startTime;
			const { x: mx, y: my } = mouse;
			const allArrived = elapsed > entranceEnd;

			for (let b = 0; b < BUCKET_COUNT; b++) buckets[b].length = 0;

			for (let i = 0; i < particles.length; i++) {
				const p = particles[i];

				if (!p.arrived) {
					const t = (elapsed - p.delay) / ENTRANCE_FLY;
					if (t < 0) {
						// Not started yet — stay at spawn
						buckets[0].push(i);
						continue;
					}
					if (t < 1) {
						// Fly-in via eased lerp
						const e = easeOutCubic(t);
						p.x = p.spawnX + (p.originX - p.spawnX) * e;
						p.y = p.spawnY + (p.originY - p.spawnY) * e;
						buckets[0].push(i);
						continue;
					}
					// Arrived — snap and switch to physics
					p.x = p.originX;
					p.y = p.originY;
					p.vx = 0;
					p.vy = 0;
					p.arrived = true;
				}

				// Physics: repel + spring
				if (allArrived || p.arrived) {
					const dx = p.x - mx;
					const dy = p.y - my;
					const distSq = dx * dx + dy * dy;
					const rSq = scaledRepelRadius * scaledRepelRadius;

					if (distSq < rSq && distSq > 0) {
						const dist = Math.sqrt(distSq);
						const f = 1 - dist / scaledRepelRadius;
						const force = f * f * f * REPEL_STRENGTH;
						p.vx += (dx / dist) * force;
						p.vy += (dy / dist) * force;
					}

					p.vx += (p.originX - p.x) * RETURN_SPEED;
					p.vy += (p.originY - p.y) * RETURN_SPEED;
					p.vx *= FRICTION;
					p.vy *= FRICTION;
					p.x += p.vx;
					p.y += p.vy;
				}

				// Bucket by displacement
				const dispX = p.x - p.originX;
				const dispY = p.y - p.originY;
				const displacement = Math.sqrt(dispX * dispX + dispY * dispY);
				const b = Math.min(Math.floor((displacement / maxDisplacement) * BUCKET_COUNT), BUCKET_COUNT - 1);
				buckets[b].push(i);
			}

			// Draw — batch by color bucket, individual fillRect per particle (varying sizes)
			for (let b = 0; b < BUCKET_COUNT; b++) {
				const indices = buckets[b];
				if (indices.length === 0) continue;
				ctx.fillStyle = bucketStyles[b];
				for (let j = 0; j < indices.length; j++) {
					const p = particles[indices[j]];
					ctx.fillRect(p.x - p.w, p.y - p.h, p.w * 2, p.h * 2);
				}
			}

			rafId = requestAnimationFrame(animate);
		}

		rafId = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(rafId);
			ro.disconnect();
			canvas.removeEventListener("mousemove", handleMouseMove);
			canvas.removeEventListener("mouseleave", handleMouseLeave);
		};
	});

	return <canvas ref={canvasRef} className="size-full" tabIndex={-1} aria-hidden="true" />;
}
