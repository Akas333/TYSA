"use strict";
/*
 * TYSA hackathon video scenes, drawn as engineering figures: an instrument frame, mono readouts,
 * block diagrams and plotted models. Every scene is a pure function of time: build(root) sets up
 * the DOM and returns draw(t), so render.mjs can step frame by frame with no dropped frames.
 * Colors and the sphere come from apps/web (globals.css, sphere-backdrop.tsx, confidence-rail.tsx).
 */

const W = 1920;
const H = 1080;

/** The app's tokens (globals.css). */
const C = {
	bg: "#111112",
	panel: "#141416",
	fg: "#f2f4f6",
	muted: "#9fa4ab",
	dim: "#5c6067",
	border: "#2e3034",
	input: "#3a3c41",
	primary: "#0064e0",
	soft: "#4ca3ff",
	red: "#d9776f",
};
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const LINE = "rgba(242,244,246,0.22)";
const HAIR = "rgba(242,244,246,0.12)";
/** The confidence rail's ramp (confidence-rail.tsx): 0 red → 100 teal. */
const RAMP = ["#d9776f", "#d9905e", "#cfb05a", "#a3bf6a", "#6fbf8a", "#5fb39a"];
const RAMP_AT = [0, 0.3, 0.5, 0.7, 0.9, 1];

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
	lin: (t) => t,
	out3: (t) => 1 - (1 - t) ** 3,
	out4: (t) => 1 - (1 - t) ** 4,
	inOut3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};
/** Eased progress of a segment that starts at `start` and lasts `dur` seconds. */
const seg = (t, start, dur, ease = E.out3) => ease(clamp01((t - start) / dur));

function hexRgb(h) {
	return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mixHex(a, b, p) {
	const A = hexRgb(a);
	const B = hexRgb(b);
	return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], p))).join(",")})`;
}
/** A colour on the confidence ramp for v in 0..1. */
function rampColor(v) {
	for (let i = 1; i < RAMP_AT.length; i++) {
		if (v <= RAMP_AT[i]) return mixHex(RAMP[i - 1], RAMP[i], (v - RAMP_AT[i - 1]) / (RAMP_AT[i] - RAMP_AT[i - 1]));
	}
	return RAMP[RAMP.length - 1];
}
const fmt = (n, d = 2) => n.toFixed(d);
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------------------------------------------------------------------------------------------
 * DOM and SVG helpers
 * ------------------------------------------------------------------------------------------- */

function el(tag, style = {}, parent, html) {
	const n = document.createElement(tag);
	Object.assign(n.style, style);
	if (html != null) n.innerHTML = html;
	if (parent) parent.appendChild(n);
	return n;
}
const SVGNS = "http://www.w3.org/2000/svg";
function sv(tag, attrs = {}, parent) {
	const n = document.createElementNS(SVGNS, tag);
	for (const k in attrs) n.setAttribute(k, attrs[k]);
	if (parent) parent.appendChild(n);
	return n;
}
function svgLayer(root) {
	const s = sv("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
	Object.assign(s.style, { position: "absolute", left: "0", top: "0", overflow: "visible" });
	return s;
}
function svText(parent, x, y, str, { size = 15, fill = C.muted, weight = 400, anchor = "start", spacing = "0.08em", family = MONO } = {}) {
	const n = sv(
		"text",
		{ x, y, fill, "font-family": family, "font-size": size, "font-weight": weight, "text-anchor": anchor, "letter-spacing": spacing },
		parent,
	);
	n.textContent = str;
	return n;
}
const pathOf = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"} ${fmt(x, 1)} ${fmt(y, 1)}`).join(" ");
function arrowHead(parent, x, y, dir, color = LINE) {
	const a = { r: 0, l: 180, d: 90, u: -90 }[dir];
	return sv("path", { d: "M 0 0 L -11 -5.5 L -11 5.5 Z", fill: color, transform: `translate(${x} ${y}) rotate(${a})` }, parent);
}
function makeCanvas(parent) {
	const c = el("canvas", { position: "absolute", left: "0", top: "0", width: `${W}px`, height: `${H}px` }, parent);
	const dpr = window.devicePixelRatio || 1;
	c.width = W * dpr;
	c.height = H * dpr;
	const ctx = c.getContext("2d");
	return {
		c,
		ctx,
		clear() {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, c.width, c.height);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		},
	};
}

/* ---------------------------------------------------------------------------------------------
 * The instrument frame every figure sits in: a measurement grid, registration corners, ruler
 * ticks, a mono header with figure number and a running timecode, and an optional equation.
 * ------------------------------------------------------------------------------------------- */

const FRAME = { x: 64, y: 64, w: W - 128, h: H - 128 };

function hud(root, { fig, title, eq }) {
	const { x, y, w, h } = FRAME;
	const grid = el(
		"div",
		{
			position: "absolute",
			left: `${x}px`,
			top: `${y}px`,
			width: `${w}px`,
			height: `${h}px`,
			boxSizing: "border-box",
			border: `1px solid ${HAIR}`,
			backgroundImage: [
				"linear-gradient(rgba(242,244,246,0.035) 1px, transparent 1px)",
				"linear-gradient(90deg, rgba(242,244,246,0.035) 1px, transparent 1px)",
				"linear-gradient(rgba(242,244,246,0.016) 1px, transparent 1px)",
				"linear-gradient(90deg, rgba(242,244,246,0.016) 1px, transparent 1px)",
			].join(","),
			backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px",
			backgroundPosition: "-1px -1px",
			opacity: "0",
		},
		root,
	);
	const s = svgLayer(root);
	const marks = sv("g", { opacity: "0" }, s);
	const L = 26;
	for (const [cx, cy, dx, dy] of [
		[x, y, 1, 1],
		[x + w, y, -1, 1],
		[x, y + h, 1, -1],
		[x + w, y + h, -1, -1],
	]) {
		sv("path", { d: `M ${cx} ${cy + dy * L} L ${cx} ${cy} L ${cx + dx * L} ${cy}`, stroke: "rgba(242,244,246,0.65)", "stroke-width": 2, fill: "none" }, marks);
	}
	const ticks = sv("g", { stroke: "rgba(242,244,246,0.2)", "stroke-width": 1 }, marks);
	for (let tx = x + 24; tx < x + w; tx += 24) {
		const len = (tx - x) % 120 === 0 ? 9 : 4;
		sv("line", { x1: tx, y1: y + h, x2: tx, y2: y + h - len }, ticks);
	}
	for (let ty = y + 24; ty < y + h; ty += 24) {
		const len = (ty - y) % 120 === 0 ? 9 : 4;
		sv("line", { x1: x + w, y1: ty, x2: x + w - len, y2: ty }, ticks);
	}
	const head = {
		position: "absolute",
		top: `${y + 20}px`,
		fontFamily: MONO,
		fontSize: "15px",
		letterSpacing: "0.16em",
		textTransform: "uppercase",
		color: C.muted,
		whiteSpace: "pre",
		opacity: "0",
	};
	const left = el("div", { ...head, left: `${x + 30}px` }, root, `TYSA  ·  FIG. ${fig}  ·  ${title}`);
	const right = el("div", { ...head, right: `${W - x - w + 30}px` }, root);
	el("span", { color: C.dim }, right, "MODEL · ILLUSTRATIVE    ");
	const clock = el("span", { color: C.fg }, right, "T+00:00.00");
	const foot = eq
		? el("div", { ...head, top: `${y + h - 44}px`, left: `${x + 30}px`, fontSize: "17px", letterSpacing: "0.06em", textTransform: "none" }, root, eq)
		: null;

	return (t) => {
		const a = seg(t, 0, 0.35).toFixed(3);
		grid.style.opacity = marks.style.opacity = left.style.opacity = right.style.opacity = a;
		if (foot) foot.style.opacity = seg(t, 0.4, 0.4).toFixed(3);
		clock.textContent = `T+00:${t.toFixed(2).padStart(5, "0")}`;
	};
}

/** A mono label and Figtree lines that type out with a caret, like the app's composer. */
function caption(root, label, lines, { top = 128, size = 56 } = {}) {
	const lab = el(
		"div",
		{ position: "absolute", left: "120px", top: `${top}px`, fontFamily: MONO, fontSize: "16px", letterSpacing: "0.16em", textTransform: "uppercase", color: C.soft, opacity: "0" },
		root,
		`// ${label}`,
	);
	const els = lines.map((_, i) =>
		el(
			"div",
			{ position: "absolute", left: "120px", top: `${top + 34 + i * size * 1.22}px`, fontSize: `${size}px`, fontWeight: "500", letterSpacing: "-0.015em", whiteSpace: "pre", color: C.fg },
			root,
			"",
		),
	);
	/** windows: [start, end] per line, in seconds. */
	return (t, windows) => {
		lab.style.opacity = seg(t, windows[0][0] - 0.15, 0.2).toFixed(3);
		let caretLine = 0;
		windows.forEach(([a, b], i) => {
			if (t >= a) caretLine = i;
		});
		els.forEach((node, i) => {
			const [a, b] = windows[i];
			const p = clamp01((t - a) / (b - a));
			const text = lines[i];
			const n = Math.floor(text.length * p + 1e-6);
			const typing = t >= a && p < 1;
			const blinkOn = typing || Math.floor(t * 2.4) % 2 === 0;
			const caret =
				i === caretLine && t >= a
					? `<span style="display:inline-block;width:0.4em;height:0.86em;margin-left:0.1em;vertical-align:-0.06em;background:${C.soft};opacity:${blinkOn ? 1 : 0}"></span>`
					: "";
			node.innerHTML = escapeHtml(text.slice(0, n)) + caret;
		});
	};
}

/** An LED-style segmented meter with a mono label and readout. */
function segMeter(root, x, y, w, label, { n = 24, color = null } = {}) {
	const box = el("div", { position: "absolute", left: `${x}px`, top: `${y}px`, width: `${w}px`, opacity: "0" }, root);
	const row = el(
		"div",
		{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: "15px", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "12px" },
		box,
	);
	el("span", { color: C.muted }, row, label);
	const val = el("span", { color: C.fg, fontVariantNumeric: "tabular-nums" }, row, "");
	const segRow = el("div", { display: "flex", gap: "4px" }, box);
	const segs = Array.from({ length: n }, () => el("div", { flex: "1", height: "18px", boxSizing: "border-box" }, segRow));
	return {
		box,
		set(v) {
			const lit = Math.round(clamp01(v) * n);
			segs.forEach((s, i) => {
				const on = i < lit;
				s.style.background = on ? (color ?? rampColor(i / (n - 1))) : "#18181a";
				s.style.border = on ? "none" : "1px solid #2a2c30";
			});
			val.textContent = `${String(Math.round(v * 100)).padStart(3, " ")}%`;
		},
	};
}

/** A diagram block: a panel with a mono header strip. */
function block(parent, x, y, w, h, label) {
	const g = sv("g", { opacity: "0" }, parent);
	sv("rect", { x, y, width: w, height: h, fill: C.panel, stroke: LINE, "stroke-width": 1.2 }, g);
	sv("line", { x1: x, y1: y + 40, x2: x + w, y2: y + 40, stroke: HAIR }, g);
	svText(g, x + 16, y + 26, label, { size: 14, spacing: "0.14em" });
	for (const [cx, cy] of [
		[x, y],
		[x + w, y],
		[x, y + h],
		[x + w, y + h],
	])
		sv("rect", { x: cx - 3, y: cy - 3, width: 6, height: 6, fill: C.bg, stroke: "rgba(242,244,246,0.5)", "stroke-width": 1 }, g);
	return g;
}

/** A scope graticule: dashed divisions inside a rectangle. */
function graticule(parent, x, y, w, h, cols = 10, rows = 4) {
	const g = sv("g", { stroke: "rgba(242,244,246,0.08)", "stroke-width": 1, "stroke-dasharray": "2 4" }, parent);
	for (let i = 1; i < cols; i++) sv("line", { x1: x + (w * i) / cols, y1: y, x2: x + (w * i) / cols, y2: y + h }, g);
	for (let j = 1; j < rows; j++) sv("line", { x1: x, y1: y + (h * j) / rows, x2: x + w, y2: y + (h * j) / rows }, g);
	sv("line", { x1: x, y1: y + h / 2, x2: x + w, y2: y + h / 2, stroke: "rgba(242,244,246,0.14)", "stroke-dasharray": "none" }, g);
	return g;
}

/* ---------------------------------------------------------------------------------------------
 * The knowledge-graph sphere (sphere-backdrop.tsx), made deterministic.
 * ------------------------------------------------------------------------------------------- */

const GLYPHS = "·:;+=*~^<>/\\|[]{}#%&@01".split("");

/** Seeded PRNG (mulberry32), so every render of a scene is identical. */
function rng(seed) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function buildSphere(rings, seed) {
	const r = rng(seed);
	const out = [];
	for (let i = 1; i < rings; i++) {
		const lat = Math.PI * (i / rings) - Math.PI / 2;
		const cr = Math.cos(lat);
		const count = Math.max(6, Math.round(rings * 2.1 * cr));
		const offset = (i % 2) * (Math.PI / count);
		for (let j = 0; j < count; j++) {
			const lon = (j / count) * Math.PI * 2 + offset;
			out.push({
				x: cr * Math.cos(lon),
				y: Math.sin(lat),
				z: cr * Math.sin(lon),
				nx: r(),
				ny: r(),
				delay: r(),
				glyphy: r() < 0.1,
				g0: Math.floor(r() * GLYPHS.length),
				flipEvery: 1.2 + r() * 5,
				flipAt: r() * 4,
			});
		}
	}
	return out;
}

/** Rotate (yaw, then pitch) and project with the app's gentle perspective. */
function project(p, cx, cy, R, yaw, pitch) {
	const cosY = Math.cos(yaw);
	const sinY = Math.sin(yaw);
	const cosX = Math.cos(pitch);
	const sinX = Math.sin(pitch);
	const x1 = p.x * cosY - p.z * sinY;
	const z1 = p.x * sinY + p.z * cosY;
	const y2 = p.y * cosX - z1 * sinX;
	const z2 = p.y * sinX + z1 * cosX;
	const persp = 1 / (1 - z2 * 0.28);
	return { sx: cx + x1 * R * persp, sy: cy + y2 * R * persp, depth: (z2 + 1) / 2 };
}

const glyphOf = (p, t) => GLYPHS[(p.g0 + Math.floor((t + p.flipAt) / p.flipEvery) * 7) % GLYPHS.length];

function dot(ctx, sx, sy, alpha, size, glyph, color = "242,244,246") {
	if (alpha <= 0.003) return;
	ctx.fillStyle = `rgba(${color},${Math.min(1, alpha).toFixed(3)})`;
	if (glyph) ctx.fillText(glyph, sx, sy);
	else ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
}

/** The app's braille spinner (braille-spinner.tsx): ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ at 80ms a frame. */
const BRAILLE = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
const brailleAt = (t) => BRAILLE[Math.floor(t / 0.08) % BRAILLE.length];

/* ---------------------------------------------------------------------------------------------
 * The capacity model shared by figures 3 and 4:  dC/dt = α·L(t) − λ·C
 * Capacity grows while under load and decays without it. Integrated with small Euler steps.
 * ------------------------------------------------------------------------------------------- */

function simulate({ c0, alpha, lambda, load, t1, dt = 0.005 }) {
	const out = [];
	let c = c0;
	for (let t = 0; t <= t1 + 1e-9; t += dt) {
		out.push([t, c]);
		c += (alpha * load(t) - lambda * c) * dt;
	}
	return { dt, pts: out, at: (t) => out[Math.min(out.length - 1, Math.max(0, Math.round(t / dt)))][1] };
}

/* ---------------------------------------------------------------------------------------------
 * FIG. 01: "Does AI make people smarter or dumber?"
 * The home screen's sphere assembles inside a gimbal ring with live readouts; the question
 * types out underneath and the app's spinner starts evaluating.
 * ------------------------------------------------------------------------------------------- */

const fig01 = {
	id: "01-smarter-or-dumber",
	dur: 4,
	build(root) {
		const frame = hud(root, { fig: "01", title: "Open question" });
		const { ctx, clear } = makeCanvas(root);
		const s = svgLayer(root);
		const CX = 1340;
		const CY = 560;
		const R = 320;
		const RING = R + 56;

		const ring = sv("g", { opacity: "0" }, s);
		sv("circle", { cx: CX, cy: CY, r: RING, fill: "none", stroke: LINE, "stroke-width": 1 }, ring);
		for (let d = 0; d < 360; d += 5) {
			const a = (d * Math.PI) / 180;
			const major = d % 30 === 0;
			const r2 = RING + (major ? 14 : 6);
			sv(
				"line",
				{ x1: CX + RING * Math.cos(a), y1: CY + RING * Math.sin(a), x2: CX + r2 * Math.cos(a), y2: CY + r2 * Math.sin(a), stroke: major ? "rgba(242,244,246,0.5)" : LINE },
				ring,
			);
			if (major) svText(ring, CX + (RING + 34) * Math.cos(a), CY + (RING + 34) * Math.sin(a) + 5, `${String(d).padStart(3, "0")}°`, { size: 12, anchor: "middle", spacing: "0.04em" });
		}
		const marker = sv("path", { d: "M 0 -9 L 7 5 L -7 5 Z", fill: C.soft, opacity: "0" }, s);
		const cross = sv("g", { stroke: "rgba(242,244,246,0.5)", "stroke-width": 1, opacity: "0" }, s);
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		])
			sv("line", { x1: CX + dx * 8, y1: CY + dy * 8, x2: CX + dx * 22, y2: CY + dy * 22 }, cross);
		sv("circle", { cx: CX, cy: CY, r: 3, fill: "none" }, cross);

		const ro = el("div", { position: "absolute", left: "120px", top: "176px", fontFamily: MONO, fontSize: "17px", letterSpacing: "0.08em", lineHeight: "36px", opacity: "0" }, root);
		const rows = ["NODES", "STATE", "ROTATION", "YAW"].map((k) => {
			const r = el("div", { display: "flex" }, ro);
			el("span", { color: C.dim, width: "170px" }, r, k);
			return el("span", { color: C.fg, whiteSpace: "pre" }, r, "");
		});

		const query = caption(root, "Query 01", ["Does AI make people", "smarter or dumber?"], { top: 596, size: 74 });
		const evalRow = el(
			"div",
			{ position: "absolute", left: "120px", top: "846px", fontFamily: MONO, fontSize: "20px", letterSpacing: "0.04em", color: C.muted, whiteSpace: "pre", opacity: "0" },
			root,
		);

		const parts = buildSphere(44, 11);
		const NOISE = 0.35;
		const GRID = 0.25;
		const GATHER = 1.1;
		const S = 1.3;
		const gridStep = 26;

		return (t) => {
			frame(t);
			clear();
			ctx.font = `${Math.round(10 * S)}px ${MONO}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			const yaw = 0.6 + 0.12 * t;
			const inNoise = t < NOISE;
			const g = clamp01((t - NOISE - GRID) / GATHER);
			for (const p of parts) {
				let { sx, sy, depth } = project(p, CX, CY, R, yaw, -0.32);
				let alpha = 0.12 + depth * depth * 0.88;
				let size = (0.8 + depth * 1.3) * S;
				if (g < 1) {
					// Scattered static around the globe, snapped to a grid, then folded in from the centre out.
					const fx = CX + (p.nx - 0.5) * 1020;
					const fy = CY + (p.ny - 0.5) * 860;
					const gx = CX + Math.round((fx - CX) / gridStep) * gridStep;
					const gy = CY + Math.round((fy - CY) / gridStep) * gridStep;
					const snap = inNoise ? 0 : E.inOut3(clamp01((t - NOISE) / 0.2));
					const bx = lerp(fx, gx, snap);
					const by = lerp(fy, gy, snap);
					const dc = Math.hypot(bx - CX, by - CY) / 660;
					const k = E.inOut3(clamp01((g - dc * 0.35) / 0.65));
					sx = lerp(bx, sx, k);
					sy = lerp(by, sy, k);
					const appear = clamp01((t - p.delay * NOISE * 0.8) / 0.15);
					const twinkle = inNoise ? 0.35 + 0.65 * Math.abs(Math.sin(t * 20 + p.delay * 40)) : 1;
					alpha = lerp(0.55 * appear * twinkle, alpha, k);
					size = lerp(1.1 * S, size, k);
				}
				dot(ctx, sx, sy, alpha, size, g >= 1 && p.glyphy && depth > 0.3 ? glyphOf(p, t) : null);
			}

			const formed = seg(t, NOISE + GRID + GATHER * 0.7, 0.4);
			ring.setAttribute("opacity", formed.toFixed(3));
			cross.setAttribute("opacity", formed.toFixed(3));
			const ma = yaw - Math.PI / 2;
			marker.setAttribute("transform", `translate(${fmt(CX + (RING - 14) * Math.cos(ma))} ${fmt(CY + (RING - 14) * Math.sin(ma))}) rotate(${fmt((ma * 180) / Math.PI - 90)})`);
			marker.setAttribute("opacity", formed.toFixed(3));

			ro.style.opacity = seg(t, 0.15, 0.3).toFixed(3);
			rows[0].textContent = Math.round(parts.length * seg(t, 0, NOISE, E.lin)).toLocaleString("en-US");
			rows[1].textContent = t < NOISE ? "SCATTER" : t < NOISE + GRID ? "GRID" : g < 1 ? "FOLD → SPHERE" : "STABLE";
			rows[1].style.color = g < 1 ? C.fg : C.soft;
			rows[2].textContent = "ω  0.120 rad/s";
			rows[3].textContent = `ψ  ${fmt((((yaw * 180) / Math.PI) % 360), 1).padStart(5, "0")}°`;

			query(t, [
				[0.9, 1.7],
				[1.7, 2.4],
			]);
			evalRow.style.opacity = seg(t, 2.55, 0.2).toFixed(3);
			evalRow.textContent = `> evaluating ${brailleAt(t)}`;
		};
	},
};

/* ---------------------------------------------------------------------------------------------
 * FIG. 02: "If someone outsources all of their thinking to AI… it starts to decay."
 * HUMAN and AI blocks on a data bus. Tasks stream across; the human's activity trace flattens,
 * local capacity drains, and dependence on AI climbs.
 * ------------------------------------------------------------------------------------------- */

const fig02 = {
	id: "02-cognitive-offload",
	dur: 4,
	build(root) {
		const frame = hud(root, { fig: "02", title: "Cognitive offload", eq: "C(t) = C₀ · e^(−λt)      L(t) = 0" });
		const cap = caption(root, "Case A · outsource everything", ["Hand all of your thinking to AI…", "…and local capacity decays."]);
		const s = svgLayer(root);

		const HB = { x: 160, y: 420, w: 500, h: 290 };
		const AB = { x: 1260, y: 420, w: 500, h: 290 };
		const human = block(s, HB.x, HB.y, HB.w, HB.h, "HUMAN · LOCAL REASONING");
		const ai = block(s, AB.x, AB.y, AB.w, AB.h, "AI · REMOTE REASONING");
		const scope = (b) => ({ x: b.x + 20, y: b.y + 56, w: b.w - 40, h: b.h - 76 });
		const hs = scope(HB);
		const as = scope(AB);
		graticule(human, hs.x, hs.y, hs.w, hs.h);
		graticule(ai, as.x, as.y, as.w, as.h);
		const led = sv("rect", { x: HB.x + HB.w - 30, y: HB.y + 14, width: 12, height: 12 }, human);
		sv("rect", { x: AB.x + AB.w - 30, y: AB.y + 14, width: 12, height: 12, fill: C.soft }, ai);
		const hTrace = sv("path", { fill: "none", stroke: C.fg, "stroke-width": 2, "stroke-linejoin": "round" }, human);
		const aTrace = sv("path", { fill: "none", stroke: C.soft, "stroke-width": 2, "stroke-linejoin": "round" }, ai);

		// The bus between them.
		const BY = 565;
		const bus = sv("g", { opacity: "0" }, s);
		sv("line", { x1: HB.x + HB.w, y1: BY - 12, x2: AB.x - 4, y2: BY - 12, stroke: LINE }, bus);
		sv("line", { x1: HB.x + HB.w, y1: BY + 12, x2: AB.x - 4, y2: BY + 12, stroke: LINE }, bus);
		arrowHead(bus, AB.x - 2, BY, "r", "rgba(242,244,246,0.5)");
		svText(bus, 960, BY + 50, "reasoning requests →", { size: 14, anchor: "middle" });
		const packets = Array.from({ length: 64 }, () => sv("rect", { width: 10, height: 10, fill: C.soft, opacity: "0" }, s));
		const launches = packets.map((_, i) => 0.5 + 2.95 * (i / 63) ** 0.7);
		const TRAVEL = 0.7;

		const counter = el("div", { position: "absolute", left: "660px", width: "600px", top: `${BY - 106}px`, textAlign: "center", opacity: "0" }, root);
		el("div", { fontFamily: MONO, fontSize: "14px", letterSpacing: "0.16em", color: C.muted }, counter, "TASKS OFFLOADED");
		const count = el("div", { fontFamily: MONO, fontSize: "40px", fontWeight: "500", color: C.fg, letterSpacing: "0.04em", marginTop: "2px" }, counter, "0");

		const local = segMeter(root, HB.x, HB.y + HB.h + 44, HB.w, "Local capacity");
		const depend = segMeter(root, AB.x, AB.y + AB.h + 44, AB.w, "Dependence on AI", { color: C.soft });

		const wave = (x, t) => 0.55 * Math.sin(x * 0.045 + t * 6) + 0.3 * Math.sin(x * 0.11 + t * 9.3) + 0.35 * Math.sin(x * 0.021 - t * 3.1);
		const trace = (sc, amp, t) => {
			const pts = [];
			for (let x = 0; x <= sc.w; x += 4) pts.push([sc.x + x, sc.y + sc.h / 2 - (sc.h / 2.6) * amp * wave(x, t)]);
			return pathOf(pts);
		};

		return (t) => {
			frame(t);
			cap(t, [
				[0.15, 1.1],
				[1.9, 2.75],
			]);
			human.setAttribute("opacity", seg(t, 0.1, 0.3).toFixed(3));
			ai.setAttribute("opacity", seg(t, 0.2, 0.3).toFixed(3));
			bus.setAttribute("opacity", seg(t, 0.35, 0.3).toFixed(3));
			counter.style.opacity = seg(t, 0.45, 0.3).toFixed(3);
			local.box.style.opacity = depend.box.style.opacity = seg(t, 0.4, 0.3).toFixed(3);

			const drain = seg(t, 0.8, 2.7, E.inOut3);
			hTrace.setAttribute("d", trace(hs, lerp(1, 0.08, drain), t));
			hTrace.setAttribute("opacity", lerp(1, 0.45, drain).toFixed(3));
			aTrace.setAttribute("d", trace(as, lerp(0.15, 1, drain), t * 1.4));
			const capNow = lerp(1, 0.18, drain);
			led.setAttribute("fill", rampColor(capNow));
			local.set(capNow);
			depend.set(lerp(0.04, 0.96, drain));

			let arrived = 0;
			packets.forEach((p, i) => {
				const k = (t - launches[i]) / TRAVEL;
				if (k >= 1) arrived++;
				if (k < 0 || k >= 1) {
					p.setAttribute("opacity", "0");
					return;
				}
				p.setAttribute("x", fmt(lerp(HB.x + HB.w + 6, AB.x - 18, k) - 5));
				p.setAttribute("y", BY - 5);
				p.setAttribute("opacity", fmt(Math.min(1, k * 6, (1 - k) * 6), 3));
			});
			count.textContent = (arrived * 21).toLocaleString("en-US");
		};
	},
};

/* ---------------------------------------------------------------------------------------------
 * FIG. 03: "Doing a hard thing produces and maintains the capacity for doing the hard thing."
 * The model plotted: with regular load, capacity climbs in a sawtooth; with no load it decays.
 * A sweep cursor reads both values as it draws.
 * ------------------------------------------------------------------------------------------- */

const fig03 = {
	id: "03-load-builds-capacity",
	dur: 4,
	build(root) {
		const frame = hud(root, { fig: "03", title: "Load → capacity", eq: "PARAMS   α = 1.6   λ = 0.2   duty(L_A) = 0.35   L_B = 0   C(0) = C₀" });
		const cap = caption(root, "Model · training response", ["Doing the hard thing builds the capacity for it."]);
		const s = svgLayer(root);

		const X0 = 210;
		const X1 = 1330;
		const YT = 330;
		const YB = 800;
		const CMAX = 3;
		const T1 = 10;
		const X = (t) => X0 + (t / T1) * (X1 - X0);
		const Y = (c) => YB - (c / CMAX) * (YB - YT);
		const session = (t) => (t % 1 < 0.35 ? 1 : 0);
		const A = simulate({ c0: 1, alpha: 1.6, lambda: 0.2, load: session, t1: T1 });
		const B = simulate({ c0: 1, alpha: 1.6, lambda: 0.2, load: () => 0, t1: T1 });

		const axes = sv("g", { opacity: "0" }, s);
		const gridG = sv("g", { stroke: "rgba(242,244,246,0.07)", "stroke-dasharray": "2 5" }, axes);
		for (let c = 1; c <= CMAX; c++) sv("line", { x1: X0, y1: Y(c), x2: X1, y2: Y(c) }, gridG);
		for (let t = 1; t <= T1; t++) sv("line", { x1: X(t), y1: YT, x2: X(t), y2: YB }, gridG);
		sv("line", { x1: X0, y1: Y(1), x2: X1, y2: Y(1), stroke: "rgba(242,244,246,0.28)", "stroke-dasharray": "8 6" }, axes);
		svText(axes, X0 + 10, Y(1) - 10, "C₀  start", { size: 13, fill: C.dim });
		sv("path", { d: `M ${X0} ${YT - 16} L ${X0} ${YB} L ${X1 + 24} ${YB}`, fill: "none", stroke: "rgba(242,244,246,0.5)", "stroke-width": 1.5 }, axes);
		for (let c = 0; c <= CMAX; c++) {
			sv("line", { x1: X0 - 8, y1: Y(c), x2: X0, y2: Y(c), stroke: "rgba(242,244,246,0.5)" }, axes);
			svText(axes, X0 - 16, Y(c) + 5, c ? `${c}.0×` : "0", { size: 13, anchor: "end" });
		}
		for (let t = 0; t <= T1; t++) {
			sv("line", { x1: X(t), y1: YB, x2: X(t), y2: YB + 8, stroke: "rgba(242,244,246,0.5)" }, axes);
			svText(axes, X(t), YB + 26, String(t), { size: 13, anchor: "middle" });
		}
		svText(axes, X0, YT - 30, "C(t)  capacity", { size: 14, fill: C.fg });
		svText(axes, X1 + 24, YB + 26, "t", { size: 14, fill: C.fg, anchor: "end" });

		// The load inputs, drawn under the plot as two signal rows.
		const LA = 878;
		const LB = 920;
		svText(axes, X0 - 16, LA + 4, "L_A", { size: 13, anchor: "end", fill: C.soft });
		svText(axes, X0 - 16, LB + 4, "L_B", { size: 13, anchor: "end", fill: C.red });
		const loadA = sv("path", { fill: "none", stroke: C.soft, "stroke-width": 1.5 }, s);
		const loadB = sv("path", { fill: "none", stroke: C.red, "stroke-width": 1.5 }, s);

		const traceA = sv("path", { fill: "none", stroke: C.soft, "stroke-width": 3, "stroke-linejoin": "round" }, s);
		const traceB = sv("path", { fill: "none", stroke: C.red, "stroke-width": 3, "stroke-linejoin": "round" }, s);
		const cursor = sv("g", { opacity: "0" }, s);
		sv("line", { x1: 0, y1: YT - 8, x2: 0, y2: YB, stroke: "rgba(242,244,246,0.45)", "stroke-dasharray": "3 4" }, cursor);
		const dotA = sv("circle", { r: 6, fill: C.soft }, s);
		const dotB = sv("circle", { r: 6, fill: C.red }, s);
		const readout = el(
			"div",
			{ position: "absolute", top: `${YT - 4}px`, fontFamily: MONO, fontSize: "15px", lineHeight: "24px", letterSpacing: "0.04em", padding: "8px 12px", background: C.panel, border: `1px solid ${LINE}`, whiteSpace: "pre", opacity: "0" },
			root,
		);

		const label = (top, tag, color, text) => {
			const n = el("div", { position: "absolute", left: "1384px", top: `${top}px`, opacity: "0" }, root);
			el("div", { fontFamily: MONO, fontSize: "15px", letterSpacing: "0.12em", color }, n, tag);
			el("div", { fontSize: "30px", fontWeight: "500", color: C.fg, marginTop: "2px" }, n, text);
			return n;
		};
		const labA = label(Y(A.at(T1)) - 34, "A  ·  L(t) > 0", C.soft, "Do the hard thing");
		const labB = label(Y(B.at(T1)) - 34, "B  ·  L(t) = 0", C.red, "Outsource it");
		const leaders = sv("g", { opacity: "0", stroke: "rgba(242,244,246,0.35)", "stroke-dasharray": "3 4" }, s);
		sv("line", { x1: X1 + 10, y1: Y(A.at(T1)), x2: 1372, y2: Y(A.at(T1)) }, leaders);
		sv("line", { x1: X1 + 10, y1: Y(B.at(T1)), x2: 1372, y2: Y(B.at(T1)) }, leaders);

		const legend = el(
			"div",
			{ position: "absolute", left: "1384px", top: "520px", width: "400px", padding: "18px 20px", background: C.panel, border: `1px solid ${LINE}`, fontFamily: MONO, opacity: "0" },
			root,
		);
		el("div", { fontSize: "21px", color: C.fg, marginBottom: "12px" }, legend, "dC/dt = α·L(t) − λ·C");
		for (const [k, v] of [
			["C", "capacity"],
			["L", "cognitive load"],
			["α", "adaptation gain"],
			["λ", "decay rate"],
		]) {
			const r = el("div", { display: "flex", fontSize: "15px", lineHeight: "26px" }, legend);
			el("span", { color: C.soft, width: "40px" }, r, k);
			el("span", { color: C.muted }, r, v);
		}

		const curve = (sim, tMax) => pathOf(sim.pts.filter(([t], i) => t <= tMax && i % 4 === 0).map(([t, c]) => [X(t), Y(c)]).concat([[X(tMax), Y(sim.at(tMax))]]));

		return (t) => {
			frame(t);
			cap(t, [[0.1, 1.2]]);
			axes.setAttribute("opacity", seg(t, 0.15, 0.4).toFixed(3));
			legend.style.opacity = seg(t, 0.5, 0.4).toFixed(3);

			const p = seg(t, 0.6, 2.4, E.inOut3);
			const tm = p * T1;
			if (p > 0) {
				traceA.setAttribute("d", curve(A, tm));
				traceB.setAttribute("d", curve(B, tm));
				// The input signals: session pulses for A, a flat zero for B.
				const pa = [[X0, LA]];
				for (let k = 0; k < T1 && k <= tm; k++) {
					const on = X(k);
					const off = X(Math.min(k + 0.35, tm));
					pa.push([on, LA], [on, LA - 16], [off, LA - 16], [off, LA]);
				}
				pa.push([X(tm), LA]);
				loadA.setAttribute("d", pathOf(pa));
				loadB.setAttribute("d", pathOf([
					[X0, LB],
					[X(tm), LB],
				]));
			}
			const cx = X(tm);
			cursor.setAttribute("transform", `translate(${fmt(cx)} 0)`);
			const live = p > 0 && p < 1 ? 1 : p >= 1 ? 1 - seg(t, 3.1, 0.3) : 0;
			cursor.setAttribute("opacity", live.toFixed(3));
			for (const [d, sim] of [
				[dotA, A],
				[dotB, B],
			]) {
				d.setAttribute("cx", fmt(cx));
				d.setAttribute("cy", fmt(Y(sim.at(tm))));
				d.setAttribute("opacity", p > 0 ? "1" : "0");
			}
			readout.style.left = `${fmt(Math.min(cx + 16, X1 - 250))}px`;
			readout.style.opacity = live.toFixed(3);
			readout.innerHTML = `<span style="color:${C.muted}">t   </span>${fmt(tm, 2).padStart(5, " ")}\n<span style="color:${C.soft}">C_A </span>${fmt(A.at(tm))}×\n<span style="color:${C.red}">C_B </span>${fmt(B.at(tm))}×`;

			const ends = seg(t, 2.9, 0.4);
			labA.style.opacity = labB.style.opacity = ends.toFixed(3);
			leaders.setAttribute("opacity", ends.toFixed(3));
		};
	},
};

/* ---------------------------------------------------------------------------------------------
 * FIG. 04: "We can use AI to load ourselves with a very heavy cognitive load."
 * The same model as a control loop with the AI as the load source: it emits challenges as L(t)
 * into Σ → α∫dt → C(t), with −λ feedback, and the output scope climbs back up.
 * ------------------------------------------------------------------------------------------- */

const fig04 = {
	id: "04-ai-generates-load",
	dur: 4,
	build(root) {
		const frame = hud(root, { fig: "04", title: "AI as load generator", eq: "dC/dt = α·L(t) − λ·C      L(t) ← AI" });
		const cap = caption(root, "Case B · point it the other way", ["Why not use AI to generate the load?"]);
		const s = svgLayer(root);

		const AIB = { x: 120, y: 420, w: 430, h: 270 };
		const HB = { x: 820, y: 480, w: 290, h: 160 };
		const SB = { x: 1290, y: 400, w: 510, h: 310 };
		const SX = 700;
		const SY = 560;
		const NODE = 1200;
		const FB = 790;

		const aiBlock = block(s, AIB.x, AIB.y, AIB.w, AIB.h, "AI · CHALLENGE GENERATOR");
		sv("rect", { x: AIB.x + AIB.w - 30, y: AIB.y + 14, width: 12, height: 12, fill: C.soft }, aiBlock);
		const hBlock = block(s, HB.x, HB.y, HB.w, HB.h, "HUMAN");
		svText(hBlock, HB.x + HB.w / 2, HB.y + 112, "α ∫ dt", { size: 34, fill: C.fg, anchor: "middle", spacing: "0.02em" });
		const sBlock = block(s, SB.x, SB.y, SB.w, SB.h, "OUTPUT · C(t)");
		const sc = { x: SB.x + 20, y: SB.y + 56, w: SB.w - 40, h: SB.h - 76 };
		graticule(sBlock, sc.x, sc.y, sc.w, sc.h, 8, 4);

		// Wires, with marching dashes for signal flow.
		const wires = sv("g", { opacity: "0", fill: "none", stroke: "rgba(242,244,246,0.5)", "stroke-width": 1.5 }, s);
		const flow = [];
		const wire = (d) => {
			sv("path", { d, stroke: "rgba(242,244,246,0.18)" }, wires);
			flow.push(sv("path", { d, "stroke-dasharray": "6 10" }, wires));
		};
		wire(`M ${AIB.x + AIB.w} ${SY} L ${SX - 30} ${SY}`);
		wire(`M ${SX + 30} ${SY} L ${HB.x} ${SY}`);
		wire(`M ${HB.x + HB.w} ${SY} L ${SB.x} ${SY}`);
		wire(`M ${NODE} ${SY} L ${NODE} ${FB} L ${SX} ${FB} L ${SX} ${SY + 30}`);
		arrowHead(wires, SX - 30, SY, "r", "rgba(242,244,246,0.6)");
		arrowHead(wires, HB.x, SY, "r", "rgba(242,244,246,0.6)");
		arrowHead(wires, SB.x, SY, "r", "rgba(242,244,246,0.6)");
		arrowHead(wires, SX, SY + 30, "u", "rgba(242,244,246,0.6)");
		sv("circle", { cx: NODE, cy: SY, r: 5, fill: "rgba(242,244,246,0.8)", stroke: "none" }, wires);
		sv("circle", { cx: SX, cy: SY, r: 30, fill: C.panel, stroke: "rgba(242,244,246,0.6)" }, wires);
		svText(wires, SX, SY + 9, "Σ", { size: 26, fill: C.fg, anchor: "middle", spacing: "0" });
		svText(wires, SX - 46, SY - 12, "+", { size: 18, fill: C.fg, anchor: "middle" });
		svText(wires, SX + 18, SY + 56, "−", { size: 20, fill: C.fg, anchor: "middle" });
		sv("path", { d: `M ${(SX + NODE) / 2 + 22} ${FB - 20} L ${(SX + NODE) / 2 - 22} ${FB} L ${(SX + NODE) / 2 + 22} ${FB + 20} Z`, fill: C.panel, stroke: "rgba(242,244,246,0.6)" }, wires);
		svText(wires, (SX + NODE) / 2 + 4, FB + 50, "λ  decay", { size: 15, anchor: "middle" });
		svText(wires, (AIB.x + AIB.w + SX) / 2 - 10, SY - 18, "L(t)", { size: 17, fill: C.soft, anchor: "middle" });
		svText(wires, (HB.x + HB.w + SB.x) / 2, SY - 18, "C(t)", { size: 17, fill: C.fg, anchor: "middle" });

		// Each challenge is one load pulse on the L(t) wire.
		const CHALLENGES = [
			"predict the next step",
			"explain why it works",
			"spot the flaw",
			"combine two ideas",
			"apply it somewhere new",
			"prove it",
			"teach it back",
			"predict, then check",
			"find the edge case",
		];
		const EMIT0 = 0.55;
		const EVERY = 0.34;
		const emits = CHALLENGES.map((_, i) => EMIT0 + i * EVERY);
		const pulses = emits.map(() => sv("rect", { width: 16, height: 12, fill: C.soft, opacity: "0" }, s));
		const log = el(
			"div",
			{ position: "absolute", left: `${AIB.x + 20}px`, top: `${AIB.y + 54}px`, width: `${AIB.w - 40}px`, height: `${AIB.h - 70}px`, overflow: "hidden", fontFamily: MONO, fontSize: "18px", lineHeight: "36px", whiteSpace: "pre" },
			root,
		);

		// The output: the model with these pulses as its load, starting where FIG. 02 left off.
		const load = (t) => (emits.some((e) => t >= e && t < e + 0.12) ? 1 : 0);
		const sim = simulate({ c0: 0.18, alpha: 1.2, lambda: 0.3, load, t1: 4 });
		const out = sv("path", { fill: "none", stroke: C.soft, "stroke-width": 2.5, "stroke-linejoin": "round" }, sBlock);
		const head = sv("circle", { r: 5, fill: C.soft }, sBlock);
		const SY0 = (c) => sc.y + sc.h - c * sc.h * 0.92;
		const SX0 = (t) => sc.x + (t / 4) * sc.w;
		const meter = segMeter(root, SB.x, SB.y + SB.h + 32, SB.w, "Capacity");

		return (t) => {
			frame(t);
			cap(t, [[0.1, 1.1]]);
			aiBlock.setAttribute("opacity", seg(t, 0.1, 0.3).toFixed(3));
			hBlock.setAttribute("opacity", seg(t, 0.2, 0.3).toFixed(3));
			sBlock.setAttribute("opacity", seg(t, 0.3, 0.3).toFixed(3));
			wires.setAttribute("opacity", seg(t, 0.25, 0.35).toFixed(3));
			meter.box.style.opacity = seg(t, 0.35, 0.3).toFixed(3);
			for (const f of flow) f.setAttribute("stroke-dashoffset", fmt(-t * 60));

			const shown = emits.filter((e) => t >= e).length;
			const lines = CHALLENGES.slice(Math.max(0, shown - 5), shown);
			log.innerHTML = lines
				.map((c, i) => {
					const newest = i === lines.length - 1;
					return `<div style="color:${newest ? C.fg : C.dim}"><span style="color:${newest ? C.soft : C.dim}">&gt; </span>${c}</div>`;
				})
				.join("");

			pulses.forEach((p, i) => {
				const k = (t - emits[i]) / 0.3;
				if (k < 0 || k >= 1) {
					p.setAttribute("opacity", "0");
					return;
				}
				p.setAttribute("x", fmt(lerp(AIB.x + AIB.w + 4, SX - 48, k)));
				p.setAttribute("y", SY - 6);
				p.setAttribute("opacity", fmt(Math.min(1, (1 - k) * 5), 3));
			});

			const pts = sim.pts.filter(([st], i) => st <= t && i % 3 === 0).map(([st, c]) => [SX0(st), SY0(c)]);
			pts.push([SX0(t), SY0(sim.at(t))]);
			out.setAttribute("d", pathOf(pts));
			head.setAttribute("cx", fmt(SX0(t)));
			head.setAttribute("cy", fmt(SY0(sim.at(t))));
			meter.set(sim.at(t));
		};
	},
};

/* ---------------------------------------------------------------------------------------------
 * FIG. 05: "…and train our thinking and reasoning in ways that weren't possible in the past."
 * Open loop (a fixed curriculum: too easy, then too hard) beside closed loop (probe → plan →
 * teach keeps difficulty at the learner's edge, so ability keeps climbing).
 * ------------------------------------------------------------------------------------------- */

const fig05 = {
	id: "05-closed-loop-training",
	dur: 4,
	build(root) {
		const frame = hud(root, { fig: "05", title: "Closed-loop training", eq: "d(t) = â(t) + ε      â ← probe(t)" });
		const cap = caption(root, "Never possible before", ["Train your reasoning in a closed loop."]);
		const s = svgLayer(root);

		const panels = [
			{
				x: 120,
				title: "OPEN LOOP · FIXED CURRICULUM",
				a: (t) => 0.1 + 0.36 * (1 - Math.exp(-t / 3.4)),
				d: (t) => 0.08 + 0.088 * Math.floor(t),
				probes: false,
			},
			{
				x: 1000,
				title: "CLOSED LOOP · TUNED TO YOU",
				a: (t) => 0.1 + 0.74 * (1 - Math.exp(-t / 4.4)),
				d: (t) => 0.1 + 0.74 * (1 - Math.exp(-t / 4.4)) + 0.075 + 0.014 * Math.sin(t * 3.1),
				probes: true,
			},
		];
		const PW = 800;
		const PY = 330;
		const PH = 560;
		const T1 = 10;

		for (const P of panels) {
			P.g = block(s, P.x, PY, PW, PH, P.title);
			P.x0 = P.x + 70;
			P.x1 = P.x + PW - 30;
			P.y0 = PY + 90;
			P.y1 = PY + PH - 56;
			P.X = (t) => P.x0 + (t / T1) * (P.x1 - P.x0);
			P.Y = (v) => P.y1 - v * (P.y1 - P.y0);
			const ax = sv("g", {}, P.g);
			const gr = sv("g", { stroke: "rgba(242,244,246,0.07)", "stroke-dasharray": "2 5" }, ax);
			for (let v = 0.25; v <= 1; v += 0.25) sv("line", { x1: P.x0, y1: P.Y(v), x2: P.x1, y2: P.Y(v) }, gr);
			sv("path", { d: `M ${P.x0} ${P.y0 - 10} L ${P.x0} ${P.y1} L ${P.x1 + 10} ${P.y1}`, fill: "none", stroke: "rgba(242,244,246,0.5)", "stroke-width": 1.3 }, ax);
			svText(ax, P.x0 - 12, P.y0 + 4, "level", { size: 12, anchor: "end" });
			svText(ax, P.x1 + 10, P.y1 + 24, "t", { size: 13, anchor: "end", fill: C.fg });
			svText(ax, P.x0 + 14, P.y0 - 18, "— ability", { size: 13, fill: C.fg });
			svText(ax, P.x0 + 140, P.y0 - 18, "— difficulty", { size: 13, fill: C.soft });
			P.hatch = sv("g", {}, P.g);
			P.aLine = sv("path", { fill: "none", stroke: C.fg, "stroke-width": 2.5 }, P.g);
			P.dLine = sv("path", { fill: "none", stroke: C.soft, "stroke-width": 2.5, "stroke-linejoin": "round" }, P.g);
			P.marks = sv("g", {}, P.g);
		}
		// Open loop's failure zones, and closed loop's band, named once the trace has passed them.
		const zone = (x, y, color, text) =>
			el("div", { position: "absolute", left: `${x}px`, top: `${y}px`, fontFamily: MONO, fontSize: "15px", letterSpacing: "0.12em", color, opacity: "0", whiteSpace: "pre" }, root, text);
		const [OP, CL] = panels;
		const zEasy = zone(OP.X(0.9), OP.Y(0.5), C.muted, "TOO EASY\nno growth");
		const zHard = zone(OP.X(6.4), OP.Y(0.95), C.red, "TOO HARD\nstuck");
		const zEdge = zone(CL.X(4.6), CL.Y(0.94), C.soft, "AT YOUR EDGE\nkeeps climbing");
		const loopTag = el("div", { position: "absolute", left: `${CL.x + 16}px`, top: `${PY + PH + 18}px`, fontFamily: MONO, fontSize: "16px", letterSpacing: "0.12em", whiteSpace: "pre", opacity: "0" }, root);
		const openTag = el(
			"div",
			{ position: "absolute", left: `${OP.x + 16}px`, top: `${PY + PH + 18}px`, fontFamily: MONO, fontSize: "16px", letterSpacing: "0.12em", color: C.dim, whiteSpace: "pre", opacity: "0" },
			root,
			"SYLLABUS → LESSON → LESSON → …   no feedback",
		);

		const STEP = 7;
		return (t) => {
			frame(t);
			cap(t, [[0.1, 1.15]]);
			const p = seg(t, 0.55, 2.4, E.inOut3);
			const tm = p * T1;
			panels.forEach((P, pi) => {
				P.g.setAttribute("opacity", seg(t, 0.12 + pi * 0.1, 0.3).toFixed(3));
				const aPts = [];
				const dPts = [];
				for (let tt = 0; tt <= tm + 1e-9; tt += 0.02) {
					aPts.push([P.X(tt), P.Y(P.a(tt))]);
					dPts.push([P.X(tt), P.Y(Math.min(1.02, P.d(tt)))]);
				}
				P.aLine.setAttribute("d", aPts.length > 1 ? pathOf(aPts) : "");
				P.dLine.setAttribute("d", dPts.length > 1 ? pathOf(dPts) : "");
				// Hatching between the two curves, colored by whether the load is useful.
				let h = "";
				const colors = { easy: [], hard: [], edge: [] };
				for (let x = P.x0 + 3; x <= P.X(tm); x += STEP) {
					const tt = ((x - P.x0) / (P.x1 - P.x0)) * T1;
					const a = P.a(tt);
					const d = Math.min(1.02, P.d(tt));
					const kind = d < a - 0.015 ? "easy" : d > a + 0.15 ? "hard" : "edge";
					colors[kind].push(`M ${fmt(x, 1)} ${fmt(P.Y(a), 1)} L ${fmt(x, 1)} ${fmt(P.Y(d), 1)}`);
				}
				P.hatch.innerHTML = "";
				for (const [kind, col] of [
					["easy", "rgba(159,164,171,0.35)"],
					["hard", "rgba(217,119,111,0.5)"],
					["edge", "rgba(76,163,255,0.45)"],
				]) {
					if (colors[kind].length) sv("path", { d: colors[kind].join(" "), stroke: col, "stroke-width": 1.5 }, P.hatch);
				}
				if (P.probes) {
					// Probe samples on the ability curve: the feedback that closes the loop.
					P.marks.innerHTML = "";
					for (let tt = 0.4; tt <= tm; tt += 0.8) {
						const x = P.X(tt);
						const y = P.Y(P.a(tt));
						sv("path", { d: `M ${fmt(x)} ${fmt(y - 6)} L ${fmt(x + 6)} ${fmt(y)} L ${fmt(x)} ${fmt(y + 6)} L ${fmt(x - 6)} ${fmt(y)} Z`, fill: C.bg, stroke: C.fg, "stroke-width": 1.5 }, P.marks);
					}
				}
			});
			zEasy.style.opacity = seg(t, 0.55 + 2.4 * 0.22, 0.3).toFixed(3);
			zHard.style.opacity = seg(t, 0.55 + 2.4 * 0.75, 0.3).toFixed(3);
			zEdge.style.opacity = seg(t, 0.55 + 2.4 * 0.6, 0.3).toFixed(3);
			openTag.style.opacity = loopTag.style.opacity = seg(t, 0.8, 0.3).toFixed(3);
			const active = Math.floor(t / 0.4) % 3;
			loopTag.innerHTML = ["PROBE", "PLAN", "TEACH"]
				.map((w, i) => `<span style="color:${i === active ? C.soft : C.dim}">${w}</span>`)
				.join(`<span style="color:${C.dim}"> → </span>`) + `<span style="color:${C.dim}"> → ↺   measured every step</span>`;
		};
	},
};

const SCENES = [fig01, fig02, fig03, fig04, fig05];
