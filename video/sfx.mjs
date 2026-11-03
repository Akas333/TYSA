// Synthesizes sound effects for the hook shots (hook.js) and writes them to out/sfx/<id>.wav.
// Every sound is generated here, so there are no third-party samples to license.
// Cue times match the animation timings in hook.js.
//
//   node video/sfx.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SR = 48000;
const TAU = Math.PI * 2;

function rng(seed) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A mono track; add(t0, len, fn) mixes fn(localSeconds) into it. */
function track(dur) {
	const buf = new Float32Array(Math.round(dur * SR));
	const add = (t0, len, fn) => {
		const a = Math.round(t0 * SR);
		const n = Math.round(len * SR);
		for (let i = 0; i < n && a + i < buf.length; i++) if (a + i >= 0) buf[a + i] += fn(i / SR);
	};
	return { buf, add };
}

/** State-variable filter; returns a per-sample function (x, cutoffHz) → { low, band, high }. */
function svf(q = 0.6) {
	let low = 0;
	let band = 0;
	return (x, fc) => {
		const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
		low += f * band;
		const high = x - low - q * band;
		band += f * high;
		return { low, band, high };
	};
}

/* --- the sound palette --------------------------------------------------------------------- */

function whoosh(T, t0, len, f0, f1, gain, seed = 1) {
	const r = rng(seed);
	const flt = svf(0.5);
	T.add(t0, len, (t) => {
		const u = t / len;
		const env = Math.sin(Math.PI * Math.min(1, u ** 0.7)) ** 2;
		return flt(r() * 2 - 1, f0 * (f1 / f0) ** u).band * env * gain;
	});
}
function impact(T, t0, gain, seed = 2) {
	const r = rng(seed);
	const flt = svf(0.7);
	let ph = 0;
	T.add(t0, 1.1, (t) => {
		ph += (TAU * (38 + 70 * Math.exp(-t * 9))) / SR;
		const sub = Math.sin(ph) * Math.exp(-t * 4.5);
		const crack = flt(r() * 2 - 1, 2600 * Math.exp(-t * 6) + 200).low * Math.exp(-t * 22);
		return (sub * 0.9 + crack * 1.4) * gain;
	});
}
function click(T, t0, gain, pitch = 3200, seed = 3) {
	const r = rng(seed);
	T.add(t0, 0.03, (t) => ((r() * 2 - 1) * 0.6 + Math.sin(TAU * pitch * t)) * Math.exp(-t * 700) * gain);
}
function clank(T, t0, gain) {
	const parts = [
		[523, 10],
		[1187, 14],
		[1733, 18],
		[2611, 24],
		[3510, 30],
	];
	T.add(t0, 0.7, (t) => parts.reduce((s, [f, d]) => s + Math.sin(TAU * f * t) * Math.exp(-t * d), 0) * 0.3 * gain * Math.min(1, t * 2000));
}
function pop(T, t0, gain, pitch = 420) {
	let ph = 0;
	T.add(t0, 0.12, (t) => {
		ph += (TAU * pitch * (1 + 1.6 * Math.min(1, t / 0.05))) / SR;
		return Math.sin(ph) * Math.exp(-t * 38) * gain * Math.min(1, t * 3000);
	});
}
function glide(T, t0, len, f0, f1, gain, shape = "sine") {
	let ph = 0;
	T.add(t0, len, (t) => {
		const u = t / len;
		ph += (TAU * f0 * (f1 / f0) ** u) / SR;
		const s = shape === "square" ? Math.sign(Math.sin(ph)) * 0.5 : Math.sin(ph);
		return s * Math.min(1, t * 200, (len - t) * 60) * gain;
	});
}
function boing(T, t0, gain) {
	let ph = 0;
	T.add(t0, 0.55, (t) => {
		ph += (TAU * 190 * (1 + 0.55 * Math.exp(-t * 5) * Math.sin(TAU * 11 * t))) / SR;
		return Math.sin(ph) * Math.exp(-t * 4) * Math.min(1, t * 1500) * gain;
	});
}
function crackle(T, t0, len, gain, seed = 9) {
	const r = rng(seed);
	const flt = svf(0.7);
	let pulse = 0;
	T.add(t0, len, (t) => {
		if (r() < 0.004) pulse = 0.6 + r() * 0.8;
		pulse *= 0.992;
		const roar = flt((r() * 2 - 1) * 0.35 + (r() * 2 - 1) * pulse, 1400).low;
		return roar * Math.min(1, t * 4, (len - t) * 8) * gain;
	});
}

/** Peak-normalise with a soft clip, and write 16-bit stereo WAV. */
function writeWav(file, buf, peak = 0.89) {
	let max = 0;
	for (const v of buf) max = Math.max(max, Math.abs(Math.tanh(v)));
	const k = max ? peak / max : 1;
	const data = Buffer.alloc(buf.length * 4);
	buf.forEach((v, i) => {
		const s = Math.round(Math.tanh(v) * k * 32767);
		data.writeInt16LE(s, i * 4);
		data.writeInt16LE(s, i * 4 + 2);
	});
	const h = Buffer.alloc(44);
	h.write("RIFF", 0);
	h.writeUInt32LE(36 + data.length, 4);
	h.write("WAVEfmt ", 8);
	h.writeUInt32LE(16, 16);
	h.writeUInt16LE(1, 20);
	h.writeUInt16LE(2, 22);
	h.writeUInt32LE(SR, 24);
	h.writeUInt32LE(SR * 4, 28);
	h.writeUInt16LE(4, 32);
	h.writeUInt16LE(16, 34);
	h.write("data", 36);
	h.writeUInt32LE(data.length, 40);
	fs.writeFileSync(file, Buffer.concat([h, data]));
}

/* --- the cue sheets ------------------------------------------------------------------------ */

const SHOTS = {
	// 1950s lab: projector rattle, frantic switches, bubbling, then 2023 slams in.
	"hook-1-experiment": [
		3.0,
		(T) => {
			const r = rng(11);
			const flt = svf(0.8);
			T.add(0, 3.0, (t) => {
				const ph = (t * 24) % 1;
				const rattle = flt((r() * 2 - 1) * Math.exp(-ph * 30), 900).band * 0.5;
				return (rattle + Math.sin(TAU * 60 * t) * 0.03 + (r() * 2 - 1) * 0.015) * Math.min(1, t * 20);
			});
			whoosh(T, 0, 0.32, 300, 3000, 1.1, 12);
			for (let i = 0; i < 26; i++) click(T, 0.08 + i * 0.11 + r() * 0.04, 0.35 + r() * 0.15, 1800 + r() * 2200, 100 + i);
			for (let i = 0; i < 18; i++) pop(T, 0.1 + r() * 2.8, 0.07 + r() * 0.05, 260 + r() * 300);
			whoosh(T, 0.36, 0.24, 6000, 500, 1.0, 13);
			impact(T, 0.59, 1.4, 14);
		},
	],
	// Desktop: click, drag swoosh, lid clank, fall, thud, window pop, typing.
	"hook-2-outsource": [
		3.0,
		(T) => {
			const r = rng(21);
			whoosh(T, 0, 0.2, 2500, 600, 0.5, 22);
			click(T, 0.5, 0.9, 2600, 23);
			whoosh(T, 0.62, 0.82, 400, 1800, 0.9, 24);
			clank(T, 1.15, 0.5);
			glide(T, 1.48, 0.3, 1400, 500, 0.18);
			impact(T, 1.78, 0.7, 25);
			clank(T, 1.8, 0.8);
			pop(T, 1.92, 0.7, 520);
			for (let i = 0; i < 52; i++) click(T, 2.02 + i / 62 + (r() - 0.5) * 0.004, 0.45 + r() * 0.2, 1500 + r() * 1800, 200 + i);
		},
	],
	// Orbit zoom, landing, sticker pops, fire, alarm.
	"hook-3-gpu-cluster": [
		3.0,
		(T) => {
			whoosh(T, 0, 1.2, 150, 4500, 1.3, 31);
			impact(T, 1.12, 0.6, 32);
			[1.25, 1.37, 1.49].forEach((t, i) => pop(T, t, 0.7, 380 + i * 60));
			pop(T, 1.62, 0.9, 300);
			whoosh(T, 1.62, 0.3, 5000, 900, 0.5, 33);
			crackle(T, 1.4, 1.6, 0.6);
			pop(T, 1.85, 0.6, 600);
			glide(T, 1.98, 0.3, 300, 1500, 0.25, "square");
			for (let i = 0; i < 4; i++) glide(T, 2.24 + i * 0.18, 0.14, i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.22, "square");
		},
	],
	// Chart: drawing blip, falling whistle, crash; then the brainlet boing.
	"hook-4-results": [
		2.5,
		(T) => {
			whoosh(T, 0, 0.2, 2500, 600, 0.5, 41);
			glide(T, 0.12, 0.62, 520, 380, 0.12);
			glide(T, 0.74, 0.2, 1800, 160, 0.4);
			impact(T, 0.92, 1.3, 42);
			whoosh(T, 1.96, 0.12, 4000, 1200, 0.5, 43);
			boing(T, 2.0, 0.8);
			pop(T, 2.05, 0.35, 300);
		},
	],
};

const outDir = path.join(here, "out", "sfx");
fs.mkdirSync(outDir, { recursive: true });
for (const [id, [dur, cue]] of Object.entries(SHOTS)) {
	const T = track(dur);
	cue(T);
	writeWav(path.join(outDir, `${id}.wav`), T.buf);
	console.log(`wrote ${path.relative(process.cwd(), path.join(outDir, `${id}.wav`))}`);
}
