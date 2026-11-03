"use strict";
/*
 * The opening hook (0:00–0:11), shot for shot from the user's storyboard. Builds on scenes.js and
 * samples.js. Real logos, products, people and memes from the storyboard are swapped for drawn
 * stand-ins: a generic AI sparkle, unbranded GPUs, a GPU in a leather jacket, the brain mascot.
 */

const lerpPt = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const pick = (r, a) => a[Math.floor(r() * a.length)];

/* ---------------------------------------------------------------------------------------------
 * 1 · "Since 2023, humanity has been running a massive experiment": 1950s lab footage, a badly
 * tracked AI logo on the beaker, and 2023 slamming in.
 * ------------------------------------------------------------------------------------------- */

const FILM = { x: 240, w: 1440 }; // a 4:3 film window inside the 16:9 frame
const LAB_FOCUS = [1060, 560];
const FLASK = [1420, 720];

function labCam(t) {
	return {
		z: 1 + 0.26 * E.out3(clamp01(t / 0.3)) + 0.025 * t,
		x: 7 * Math.sin(t * 1.7) + 3 * Math.sin(t * 4.3),
		y: 5 * Math.sin(t * 1.3 + 1) + 2 * Math.sin(t * 5.1),
	};
}
const labPoint = (c, [x, y]) => [LAB_FOCUS[0] + c.x + (x - LAB_FOCUS[0]) * c.z, LAB_FOCUS[1] + c.y + (y - LAB_FOCUS[1]) * c.z];

function dial(cx, cy, r, a) {
	let m = `<circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="#1d1e21"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#ece6d6"/>`;
	for (let i = 0; i <= 8; i++) {
		const t = ((-210 + i * 30) * Math.PI) / 180;
		m += `<line x1="${f1(cx + Math.cos(t) * r * 0.76)}" y1="${f1(cy + Math.sin(t) * r * 0.76)}" x2="${f1(cx + Math.cos(t) * r * 0.92)}" y2="${f1(cy + Math.sin(t) * r * 0.92)}" stroke="#2a2a2a" stroke-width="${f1(r * 0.05)}"/>`;
	}
	const n = (a * Math.PI) / 180;
	return (
		m +
		`<line x1="${cx}" y1="${cy}" x2="${f1(cx + Math.cos(n) * r * 0.8)}" y2="${f1(cy + Math.sin(n) * r * 0.8)}" stroke="#111" stroke-width="${f1(r * 0.07)}" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${f1(r * 0.1)}" fill="#111"/>`
	);
}
const toggle = (x, y, up) =>
	`<rect x="${x - 17}" y="${y - 24}" width="34" height="48" rx="6" fill="#8d9097"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y + (up ? -36 : 36)}" stroke="#dcdcdc" stroke-width="9" stroke-linecap="round"/><circle cx="${x}" cy="${y + (up ? -38 : 38)}" r="9" fill="#f4f4f4"/>`;
const bulb = (x, y, on) =>
	(on ? `<circle cx="${x}" cy="${y}" r="34" fill="#fff8d8" opacity="0.35"/>` : "") + `<circle cx="${x}" cy="${y}" r="19" fill="${on ? "#fffbe6" : "#55575c"}" stroke="#1c1d20" stroke-width="5"/>`;
function reel(cx, cy, a) {
	let m = `<circle cx="${cx}" cy="${cy}" r="78" fill="#d6d5cf" stroke="#1c1d20" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="46" fill="#4a4c50"/>`;
	for (let k = 0; k < 3; k++) {
		const t = ((a + k * 120) * Math.PI) / 180;
		m += `<circle cx="${f1(cx + Math.cos(t) * 54)}" cy="${f1(cy + Math.sin(t) * 54)}" r="14" fill="#2b2d31"/>`;
	}
	return m + `<circle cx="${cx}" cy="${cy}" r="12" fill="#e8e8e2"/>`;
}

const toggleUp = (lt, i, rate, ph) => Math.floor(lt * rate + i * 0.37 + ph) % 2 === 0;

/** Hands hop between targets several times a second, pressing at each. */
function frantic(targets, t, rate, ph) {
	const q = t * rate + ph;
	const k = Math.floor(q);
	const f = E.inOut3(clamp01((q - k) * 1.7));
	const a = targets[k % targets.length];
	const b = targets[(k + 1) % targets.length];
	return lerpPt(a, b, f);
}

const KNIFE = [1480, 548];
const knifeAngle = (lt) => -90 + 78 * Math.sin(lt * 8.5);
const knifeEnd = (lt) => {
	const a = (knifeAngle(lt) * Math.PI) / 180;
	return [KNIFE[0] + Math.cos(a) * 120, KNIFE[1] + Math.sin(a) * 120];
};

function labPanel(lt) {
	let m = `<rect x="0" y="0" width="${W}" height="900" fill="#aaa69c"/>`;
	for (let x = 250; x < 1700; x += 180) m += `<rect x="${x}" y="0" width="6" height="900" fill="#96928a"/>`;
	m += `<rect x="290" y="96" width="1340" height="570" rx="14" fill="#2b2d31"/><rect x="304" y="110" width="1312" height="542" rx="10" fill="#4a4d54"/>`;
	for (const x of [316, 1604]) for (const y of [122, 640]) m += `<circle cx="${x}" cy="${y}" r="6" fill="#8d9097"/>`;
	m += `<rect x="760" y="120" width="8" height="520" fill="#3a3c41"/><rect x="1196" y="120" width="8" height="520" fill="#3a3c41"/>`;

	// Left bay: oscilloscope, three dials, a row of toggles.
	m += `<rect x="336" y="140" width="250" height="160" rx="16" fill="#1a1c1f"/><rect x="350" y="154" width="222" height="132" rx="10" fill="#26332c"/>`;
	let wave = "";
	for (let x = 0; x <= 222; x += 6) wave += `${x ? "L" : "M"}${350 + x} ${f1(220 + Math.sin(x / 14 + lt * 22) * (26 + 14 * Math.sin(lt * 3)) * Math.sin(x / 70 + lt))}`;
	m += `<path d="${wave}" stroke="#effff4" stroke-width="4" fill="none"/>`;
	[380, 500, 640].forEach((x, i) => (m += dial(x, 400, 48, -200 + 220 * (0.5 + 0.5 * Math.sin(lt * (5 + i * 2.3) + i)))));
	m += `<rect x="612" y="140" width="130" height="160" rx="12" fill="#3a3c41"/>`;
	for (let i = 0; i < 4; i++) m += bulb(645 + (i % 2) * 64, 185 + Math.floor(i / 2) * 70, (Math.floor(lt * 7) + i) % 3 === 0);
	[370, 438, 506, 574, 642, 710].forEach((x, i) => (m += toggle(x, 560, toggleUp(lt, i, 5, 0.2))));

	// Middle bay: a bank of bulbs, the big dial, more toggles.
	for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) m += bulb(830 + i * 62, 160 + j * 64, (i * 7 + j * 3 + Math.floor(lt * 9)) % 4 < 2);
	m += dial(980, 440, 96, -200 + 220 * clamp01(0.5 + 0.55 * Math.sin(lt * 11)));
	[830, 894, 958, 1022, 1086, 1150].forEach((x, i) => (m += toggle(x, 600, toggleUp(lt, i, 6, 0.6))));

	// Right bay: tape reels and the knife switch.
	m += reel(1300, 230, lt * 400) + reel(1500, 230, -lt * 520);
	m += `<path d="M1222 300L1300 308L1400 330L1500 308L1578 300" stroke="#26272b" stroke-width="5" fill="none"/><rect x="1376" y="322" width="48" height="26" rx="5" fill="#8d9097"/>`;
	m += `<rect x="1416" y="400" width="128" height="176" rx="10" fill="#2f3135"/><rect x="1440" y="410" width="12" height="40" fill="#c7c7c7"/><rect x="1508" y="410" width="12" height="40" fill="#c7c7c7"/>`;
	const [kx, ky] = knifeEnd(lt);
	m += `<line x1="${KNIFE[0]}" y1="${KNIFE[1]}" x2="${f1(kx)}" y2="${f1(ky)}" stroke="#d9d9d9" stroke-width="16" stroke-linecap="round"/><circle cx="${KNIFE[0]}" cy="${KNIFE[1]}" r="14" fill="#8d9097"/>`;
	m += `<rect x="${f1(kx - 30)}" y="${f1(ky - 11)}" width="60" height="22" rx="10" fill="#1b1b1e"/>`;

	// Checkerboard floor.
	m += `<rect x="0" y="892" width="${W}" height="12" fill="#2a2a2d"/>`;
	for (let i = 0; i < 17; i++) for (let j = 0; j < 2; j++) m += `<rect x="${i * 120}" y="${904 + j * 90}" width="120" height="90" fill="${(i + j) % 2 ? "#3c3c40" : "#dedbd2"}"/>`;
	return m;
}

/** A mad scientist seen from behind, facing the panel. */
function scientist({ x, feet, hands, bob = 0, hair = 0 }) {
	const sh = feet - 330 - bob;
	const skin = "#dcae94";
	let m = `<rect x="${x - 56}" y="${feet - 96}" width="44" height="90" fill="#34353b"/><rect x="${x + 12}" y="${feet - 96}" width="44" height="90" fill="#34353b"/>`;
	m += `<ellipse cx="${x - 36}" cy="${feet - 6}" rx="36" ry="13" fill="#151518"/><ellipse cx="${x + 36}" cy="${feet - 6}" rx="36" ry="13" fill="#151518"/>`;
	m += `<path d="M${x - 84} ${sh}Q${x - 100} ${sh + 160} ${x - 120} ${feet - 84}L${x + 120} ${feet - 84}Q${x + 100} ${sh + 160} ${x + 84} ${sh}Q${x} ${sh - 26} ${x - 84} ${sh}Z" fill="#f3f2ed"/>`;
	m += `<path d="M${x} ${feet - 210}L${x} ${feet - 84}" stroke="#c9c7bf" stroke-width="5"/><rect x="${x - 70}" y="${feet - 236}" width="140" height="18" rx="6" fill="#d8d6ce"/>`;
	m += `<path d="M${x + 62} ${sh + 20}Q${x + 104} ${sh + 160} ${x + 112} ${feet - 90}" stroke="#d6d4cc" stroke-width="12" fill="none"/>`;
	hands.forEach(([hx, hy], i) => {
		const sg = i ? 1 : -1;
		const s0 = [x + sg * 72, sh + 22];
		const elb = [(s0[0] + hx) / 2 + sg * 60, (s0[1] + hy) / 2 + 50];
		m += `<path d="M${s0[0]} ${s0[1]}Q${f1(elb[0])} ${f1(elb[1])} ${f1(hx)} ${f1(hy)}" stroke="#ebeae4" stroke-width="40" fill="none" stroke-linecap="round"/><circle cx="${f1(hx)}" cy="${f1(hy)}" r="21" fill="${skin}"/>`;
	});
	const hy = sh - 62;
	m += `<circle cx="${x}" cy="${hy}" r="52" fill="${skin}"/><path d="M${x - 50} ${hy - 22}Q${x} ${hy - 34} ${x + 50} ${hy - 22}" stroke="#26262a" stroke-width="7" fill="none"/>`;
	[-30, 0, 25, 50, 75, 90, 105, 130, 155, 180, 210].forEach((d, k) => {
		const a = (d * Math.PI) / 180;
		const rr = 50 + 6 * Math.sin(hair + k);
		m += `<circle cx="${f1(x + Math.cos(a) * rr)}" cy="${f1(hy + Math.sin(a) * rr * 0.9 + 4)}" r="${f1(24 + 4 * Math.sin(hair * 1.3 + k * 2))}" fill="#fbfbf8"/>`;
	});
	return m;
}

function labFlask(lt) {
	const fx = FLASK[0];
	const body = `M${fx - 22} 592L${fx - 22} 660L${fx - 100} 784Q${fx - 108} 800 ${fx - 88} 800L${fx + 88} 800Q${fx + 108} 800 ${fx + 100} 784L${fx + 22} 660L${fx + 22} 592Z`;
	const surf = 704 + 4 * Math.sin(lt * 11);
	let liq = `<path d="M${fx - 140} ${f1(surf)}Q${fx - 70} ${f1(surf - 10 * Math.sin(lt * 9))} ${fx} ${f1(surf)}T${fx + 140} ${f1(surf)}L${fx + 140} 820L${fx - 140} 820Z" fill="#c4ebbd"/>`;
	const r = rng(31);
	for (let i = 0; i < 22; i++) {
		const rel = r() * 2 - 1;
		const sp = 1.2 + r() * 1.4;
		const k = (lt * sp + r()) % 1;
		const y = 795 - k * (795 - surf);
		const hw = 22 + ((y - 660) / 124) * 74;
		liq += `<circle cx="${f1(fx + rel * hw * 0.85)}" cy="${f1(y)}" r="${f1(4 + 7 * r())}" fill="#fff" opacity="0.85"/>`;
	}
	let m = `<rect x="1150" y="800" width="580" height="28" fill="#5a4330"/><rect x="1170" y="828" width="540" height="56" fill="#46341f"/><rect x="1190" y="884" width="26" height="200" fill="#3a2a19"/><rect x="1664" y="884" width="26" height="200" fill="#3a2a19"/>`;
	for (let i = 0; i < 4; i++) m += `<rect x="${1596 + i * 30}" y="${700 + (i % 2) * 10}" width="20" height="${100 - (i % 2) * 10}" rx="10" fill="${i % 2 ? "#e9e9e9" : "#9a9a9a"}" stroke="#f4f4f4" stroke-width="3"/>`;
	m += `<rect x="1584" y="752" width="128" height="14" fill="#6b5038"/>`;
	m += `<clipPath id="labFlask"><path d="${body}"/></clipPath><path d="${body}" fill="rgba(230,238,242,0.28)"/><g clip-path="url(#labFlask)">${liq}</g>`;
	m += `<path d="${body}" fill="none" stroke="#f6f9fb" stroke-width="5"/><rect x="${fx - 30}" y="582" width="60" height="14" rx="6" fill="#f6f9fb"/><path d="M${fx - 62} 764L${fx - 16} 684" stroke="rgba(255,255,255,0.75)" stroke-width="8" stroke-linecap="round"/>`;
	for (let i = 0; i < 10; i++) {
		const k = (lt * 1.4 + i / 10) % 1;
		m += `<circle cx="${f1(fx + 30 * Math.sin(i * 2.3 + k * 5))}" cy="${f1(588 - 180 * k)}" r="${f1(8 + 32 * k)}" fill="rgba(242,242,242,${(0.75 * (1 - k)).toFixed(2)})"/>`;
	}
	return m;
}

function labScene(lt) {
	let m = labPanel(lt);
	m += scientist({
		x: 540,
		feet: 960,
		hands: [frantic([[400, 560], [470, 420], [438, 560]], lt, 6, 0), frantic([[574, 560], [642, 560], [630, 420], [710, 560]], lt, 7, 0.5)],
		bob: 8 * Math.abs(Math.sin(lt * 9)),
		hair: lt * 14,
	});
	m += scientist({
		x: 1000,
		feet: 966,
		hands: [frantic([[830, 600], [894, 600], [958, 600]], lt, 6.5, 0.3), frantic([[1086, 600], [1022, 600], [1150, 600], [1040, 470]], lt, 5.5, 0.8)],
		bob: 10 * Math.abs(Math.sin(lt * 8 + 1)),
		hair: lt * 12 + 2,
	});
	const [kx, ky] = knifeEnd(lt);
	m += scientist({ x: 1470, feet: 960, hands: [[kx - 16, ky + 4], [kx + 16, ky + 4]], bob: 6 * Math.sin(lt * 17), hair: lt * 16 + 4 });
	return m + labFlask(lt);
}

const SPARK = "M0 -100C10 -24 24 -10 100 0C24 10 10 24 0 100C-10 24 -24 10 -100 0C-24 -10 -10 -24 0 -100Z";
function aiLogo(x, y, s, rot) {
	return (
		`<defs><linearGradient id="aiG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c6e8ff"/><stop offset="0.5" stop-color="#4ca3ff"/><stop offset="1" stop-color="#0064e0"/></linearGradient><filter id="aiGlow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="22"/></filter></defs>` +
		`<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s.toFixed(3)})"><path d="${SPARK}" fill="#4ca3ff" transform="scale(1.3)" filter="url(#aiGlow)" opacity="0.9"/><path d="${SPARK}" fill="url(#aiG)"/><path d="${SPARK}" fill="url(#aiG)" transform="translate(86 -82) scale(0.38)"/></g>`
	);
}

const hook1 = {
	id: "hook-1-experiment",
	dur: 3.0,
	push: false,
	build(root) {
		root.style.background = "#000";
		const rig = el("div", { position: "absolute", inset: "0" }, root);
		const win = el("div", { position: "absolute", left: `${FILM.x}px`, top: "0", width: `${FILM.w}px`, height: `${H}px`, overflow: "hidden" }, rig);
		const film = el("div", { position: "absolute", left: `${-FILM.x}px`, top: "0", width: `${W}px`, height: `${H}px` }, win);
		const lab = svgLayer(film);
		const grain = el("canvas", { position: "absolute", left: "0", top: "0", width: `${FILM.w}px`, height: `${H}px`, mixBlendMode: "overlay", opacity: "0.4" }, win);
		grain.width = 480;
		grain.height = 360;
		const g2d = grain.getContext("2d");
		const noise = g2d.createImageData(480, 360);
		const dirt = svgLayer(win);
		el("div", { position: "absolute", inset: "0", background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.72) 100%)" }, win);
		const logo = svgLayer(rig);
		const year = el(
			"div",
			{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Figtree", fontWeight: "900", fontSize: "360px", letterSpacing: "-0.04em", color: "#fff", textShadow: "0 12px 48px rgba(0,0,0,0.7)", opacity: "0" },
			rig,
			"2023",
		);
		return (lt) => {
			// Grain, weave, flicker and dirt step at 24 fps, like film.
			const fr = Math.floor(lt * 24);
			const r = rng(7000 + fr);
			const c = labCam(lt);
			const wx = (r() - 0.5) * 4;
			const wy = (r() - 0.5) * 4;
			lab.innerHTML = `<g transform="translate(${f1(LAB_FOCUS[0] + c.x + wx)} ${f1(LAB_FOCUS[1] + c.y + wy)}) scale(${c.z.toFixed(4)}) translate(${-LAB_FOCUS[0]} ${-LAB_FOCUS[1]})">${labScene(lt)}</g>`;
			film.style.filter = `grayscale(1) contrast(1.3) brightness(${(0.95 + r() * 0.1).toFixed(3)})`;
			const d = noise.data;
			const rn = rng(9000 + fr);
			for (let i = 0; i < d.length; i += 4) {
				d[i] = d[i + 1] = d[i + 2] = rn() * 255;
				d[i + 3] = 255;
			}
			g2d.putImageData(noise, 0, 0);
			let m = "";
			const ns = Math.floor(r() * 3);
			for (let i = 0; i < ns; i++) {
				const x = r() * FILM.w;
				m += `<path d="M${f1(x)} 0Q${f1(x + (r() - 0.5) * 24)} ${H / 2} ${f1(x + (r() - 0.5) * 12)} ${H}" stroke="rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${(0.25 + r() * 0.35).toFixed(2)})" stroke-width="${f1(1 + r() * 2.5)}" fill="none"/>`;
			}
			const nd = Math.floor(r() * 5);
			for (let i = 0; i < nd; i++) m += `<ellipse cx="${f1(r() * FILM.w)}" cy="${f1(r() * H)}" rx="${f1(2 + r() * 7)}" ry="${f1(1 + r() * 4)}" fill="rgba(0,0,0,0.75)"/>`;
			dirt.innerHTML = m;

			// The logo is tracked badly: it lags the beaker, slides and ignores the zoom.
			const [bx, by] = labPoint(labCam(Math.max(0, lt - 0.07)), FLASK);
			logo.innerHTML = aiLogo(bx + 26 + 14 * Math.sin(lt * 2.3) + (r() - 0.5) * 7, by - 40 + 10 * Math.cos(lt * 3.1) + (r() - 0.5) * 7, 0.9 + 0.05 * Math.sin(lt * 7), 5 * Math.sin(lt * 1.9));

			const p = clamp01((lt - 0.45) / 0.14);
			year.style.opacity = clamp01(p * 4).toFixed(3);
			year.style.transform = `scale(${lerp(2.6, 1, p * p).toFixed(4)})`;
			const hit = lt - 0.59;
			const a = hit > 0 ? Math.exp(-hit * 9) : 0;
			rig.style.transform = `translate(${f1(Math.sin(hit * 95) * 12 * a)}px, ${f1(Math.cos(hit * 80) * 8 * a)}px)`;
		};
	},
};

/* ---------------------------------------------------------------------------------------------
 * 2 · "what happens when you outsource your critical thinking": a giant cursor drags a brain to
 * the trash, then a prompt window pops up.
 * ------------------------------------------------------------------------------------------- */

let ANATOMY = null;
/** A shaded, anatomical side-view brain centred near (0, 30); about 510 wide. */
function anatomyBrain() {
	if (ANATOMY) return ANATOMY;
	const outline = "M-255 20C-275 -80 -190 -185 -60 -198C70 -210 215 -165 252 -60C272 0 255 70 205 95C170 112 130 98 95 100C50 103 10 125 -40 128C-110 132 -170 120 -215 95C-245 78 -252 50 -255 20Z";
	let m =
		`<defs><radialGradient id="abFill" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffd0dc"/><stop offset="0.5" stop-color="#ef98af"/><stop offset="1" stop-color="#b5557a"/></radialGradient>` +
		`<radialGradient id="abCb" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#f3b0c2"/><stop offset="1" stop-color="#a94c70"/></radialGradient>` +
		`<linearGradient id="abAo" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#5a1430" stop-opacity="0"/><stop offset="1" stop-color="#5a1430" stop-opacity="0.45"/></linearGradient>` +
		`<clipPath id="abClip"><path d="${outline}"/></clipPath><clipPath id="abCbClip"><ellipse cx="160" cy="128" rx="92" ry="58"/></clipPath></defs>`;
	m += `<path d="M58 96C70 150 76 205 66 262L118 262C126 205 120 150 124 100Z" fill="#d98aa2" stroke="#9c4468" stroke-width="5"/>`;
	m += `<ellipse cx="160" cy="128" rx="92" ry="58" fill="url(#abCb)" stroke="#9c4468" stroke-width="5"/>`;
	let st = "";
	for (let i = 0; i < 8; i++) st += `<path d="M60 ${80 + i * 14}Q160 ${98 + i * 16} 260 ${80 + i * 14}" stroke="#94405f" stroke-width="4" fill="none"/>`;
	m += `<g clip-path="url(#abCbClip)">${st}</g><path d="${outline}" fill="url(#abFill)"/>`;
	const r = rng(77);
	let gy = "";
	for (let i = 0; i < 95; i++) {
		let x = -240 + r() * 480;
		let y = -195 + r() * 320;
		let a = r() * Math.PI * 2;
		const pts = [[x, y]];
		for (let k = 0; k < 7; k++) {
			a += (r() - 0.5) * 1.9;
			x += Math.cos(a) * 26;
			y += Math.sin(a) * 26;
			pts.push([x, y]);
		}
		let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
		for (let k = 1; k < pts.length - 1; k++) d += `Q${f1(pts[k][0])} ${f1(pts[k][1])} ${f1((pts[k][0] + pts[k + 1][0]) / 2)} ${f1((pts[k][1] + pts[k + 1][1]) / 2)}`;
		gy += `<path d="${d}"/>`;
	}
	m += `<g clip-path="url(#abClip)"><g stroke="#ffdbe4" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.55" transform="translate(-4 -5)">${gy}</g><g stroke="#a8486f" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.9">${gy}</g>`;
	m += `<path d="M14 -194C2 -130 40 -86 22 -16C14 22 30 46 22 78" stroke="#8e3a5d" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M-160 70C-90 44 -30 32 50 -6C96 -28 140 -18 180 -40" stroke="#8e3a5d" stroke-width="12" fill="none" stroke-linecap="round"/>`;
	m += `<path d="${outline}" fill="url(#abAo)"/><ellipse cx="-95" cy="-125" rx="95" ry="38" transform="rotate(-18 -95 -125)" fill="#fff" opacity="0.16"/></g>`;
	m += `<path d="${outline}" fill="none" stroke="#8e3a5d" stroke-width="6"/>`;
	return (ANATOMY = m);
}

const CAN = [380, 900];
const trashBack = ([x, y]) => `<ellipse cx="${x}" cy="${y - 262}" rx="114" ry="22" fill="#24272c"/>`;
function trashFront([x, y]) {
	let m = `<path d="M${x - 118} ${y - 262}L${x + 118} ${y - 262}L${x + 98} ${y - 14}Q${x + 96} ${y} ${x + 80} ${y}L${x - 80} ${y}Q${x - 96} ${y} ${x - 98} ${y - 14}Z" fill="#c4c9d1"/>`;
	for (const k of [-0.6, -0.3, 0, 0.3, 0.6]) m += `<path d="M${f1(x + k * 160)} ${y - 236}L${f1(x + k * 130)} ${y - 26}" stroke="#a3a9b3" stroke-width="10" stroke-linecap="round"/>`;
	return m + `<rect x="${x - 128}" y="${y - 274}" width="256" height="24" rx="10" fill="#e1e5ea"/>`;
}
const trashLid = ([x, y], ang) =>
	`<g transform="rotate(${f1(ang)} ${x - 132} ${y - 278})"><rect x="${x - 136}" y="${y - 304}" width="272" height="26" rx="11" fill="#e1e5ea"/><rect x="${x - 40}" y="${y - 322}" width="80" height="20" rx="8" fill="#b4bac4"/></g>`;

const CURSOR = "M0 0L0 160L40 122L68 184L96 172L68 112L120 112Z";
const cursorArrow = ([x, y], s) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(3)})"><path d="${CURSOR}" fill="#fff" stroke="#0b0b0d" stroke-width="8" stroke-linejoin="round"/></g>`;

const GRAB = [1200, 470];
const DROP = [350, 300];
const GRAB_OFFSET = [40, 50]; // brain centre relative to the cursor tip, at scale 1
function cursorTip(t) {
	if (t < 0.62) return lerpPt([1880, 1110], GRAB, E.out3(clamp01(t / 0.45)));
	if (t < 1.5) return arc(GRAB, [820, 120], DROP, E.inOut3(clamp01((t - 0.62) / 0.8)));
	return lerpPt(DROP, [760, 660], E.out3(clamp01((t - 1.5) / 0.45)));
}
const PROMPT = "plz write my entire life for me, make it sound smart";

function trashCut() {
	return {
		dur: 3.0,
		flash: true,
		build(root) {
			root.style.background = "#141518";
			const s = svgLayer(root);
			const win = el(
				"div",
				{ position: "absolute", left: "210px", top: "150px", width: "1500px", padding: "26px 34px 34px", boxSizing: "border-box", background: "#1f1f22", border: "2px solid #2e3034", borderRadius: "30px", boxShadow: "0 40px 120px rgba(0,0,0,0.7)", fontFamily: "Figtree", opacity: "0" },
				root,
			);
			el("div", { display: "flex", gap: "12px", marginBottom: "22px" }, win, ["#ff5f57", "#febc2e", "#28c840"].map((c) => `<span style="width:20px;height:20px;border-radius:50%;background:${c};display:inline-block"></span>`).join(""));
			const row = el("div", { display: "flex", alignItems: "center", gap: "24px", background: "#2a2b2f", borderRadius: "20px", padding: "22px 22px 22px 30px" }, win);
			const field = el("div", { flex: "1", fontSize: "46px", fontWeight: "500", color: "#f2f4f6", whiteSpace: "nowrap", minHeight: "60px", lineHeight: "60px" }, row);
			el(
				"div",
				{ width: "68px", height: "68px", borderRadius: "50%", background: "#0064e0", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" },
				row,
				`<svg width="34" height="34" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
			);
			const dots = `<defs><pattern id="dskDots" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="24" cy="24" r="2" fill="#2b2d32"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#dskDots)"/>`;
			return (lt) => {
				const tip = cursorTip(lt);
				let bc;
				let bs;
				let rot = 0;
				let inside = false;
				if (lt < 0.62) {
					bs = 1 + 0.04 * seg(lt, 0.5, 0.1);
					bc = [1240, 520 + 8 * Math.sin(lt * 3) - 14 * seg(lt, 0.5, 0.1)];
				} else if (lt < 1.48) {
					bs = lerp(1.04, 0.5, E.inOut3(clamp01((lt - 0.62) / 0.8)));
					bc = [tip[0] + GRAB_OFFSET[0] * bs, tip[1] + GRAB_OFFSET[1] * bs];
					const a = cursorTip(lt - 0.03);
					const b = cursorTip(lt + 0.03);
					rot = Math.max(-22, Math.min(22, (-(b[0] - a[0]) / 0.06) * 0.012));
				} else {
					const u = clamp01((lt - 1.48) / 0.3);
					inside = true;
					bs = lerp(0.5, 0.42, u);
					bc = [lerp(DROP[0] + 20, CAN[0] + 2, u), lerp(DROP[1] + 25, 800, u * u)];
					rot = 28 * u;
				}
				const brainM = u0(bc, bs, rot);
				const open = seg(lt, 1.15, 0.22);
				const close = seg(lt, 1.8, 0.14);
				let lid = -68 * open * (1 - close);
				if (lt > 1.94) lid -= 6 * Math.sin((lt - 1.94) * 30) * Math.exp(-(lt - 1.94) * 10);
				const sq = lt > 1.78 ? Math.sin((lt - 1.78) * 28) * Math.exp(-(lt - 1.78) * 9) : 0;

				let m = dots;
				if (lt < 0.8) m += shadow(1240, 830 + 0 * lt, 230 * (1 - 0.35 * seg(lt, 0.5, 0.25)) * (1 - seg(lt, 0.62, 0.18)));
				m += `<g transform="translate(${CAN[0]} ${CAN[1]}) scale(${(1 + 0.06 * sq).toFixed(3)} ${(1 - 0.07 * sq).toFixed(3)}) translate(${-CAN[0]} ${-CAN[1]})">`;
				m += shadow(CAN[0], CAN[1], 150) + trashBack(CAN) + (inside ? brainM : "") + trashFront(CAN) + trashLid(CAN, lid) + `</g>`;
				if (!inside) m += brainM;
				const dust = clamp01((lt - 1.8) / 0.45);
				if (dust > 0 && dust < 1)
					for (let i = 0; i < 8; i++) {
						const a = Math.PI + (i / 7) * Math.PI;
						m += `<circle cx="${f1(CAN[0] + Math.cos(a) * (130 + 90 * dust))}" cy="${f1(CAN[1] - 270 + Math.sin(a) * 40 * dust - 30 * dust)}" r="${f1(14 + 16 * dust)}" fill="#8c929c" opacity="${(0.7 * (1 - dust)).toFixed(2)}"/>`;
					}
				const click = clamp01((lt - 0.5) / 0.3);
				if (click > 0 && click < 1) m += `<circle cx="${GRAB[0]}" cy="${GRAB[1]}" r="${f1(20 + 70 * click)}" fill="none" stroke="#fff" stroke-width="${f1(8 * (1 - click))}" opacity="${(1 - click).toFixed(2)}"/>`;
				m += cursorArrow(tip, lt > 0.5 && lt < 1.5 ? 1.05 : 1.15);
				s.innerHTML = m;

				const p = clamp01((lt - 1.92) / 0.24);
				win.style.opacity = clamp01((lt - 1.92) / 0.06).toFixed(3);
				win.style.transform = `scale(${(0.5 + 0.5 * backOut(p)).toFixed(4)})`;
				const n = Math.max(0, Math.min(PROMPT.length, Math.floor((lt - 2.02) * 62)));
				const caret = n < PROMPT.length || Math.floor(lt * 4) % 2 === 0;
				field.innerHTML = escapeHtml(PROMPT.slice(0, n)) + `<span style="display:inline-block;width:4px;height:52px;margin-left:4px;vertical-align:-10px;background:${caret ? "#4ca3ff" : "transparent"}"></span>`;
			};
		},
	};
}
const u0 = ([x, y], s, rot) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s.toFixed(3)}) translate(0 -30)">${anatomyBrain()}</g>`;

/* ---------------------------------------------------------------------------------------------
 * 3 · "to a GPU cluster in Northern Virginia?": a satellite zoom from orbit onto a data centre
 * campus, then cut-out GPUs, a GPU in a leather jacket, fire, and the power-grid gauge.
 * ------------------------------------------------------------------------------------------- */

const GC = [-90, 80]; // globe centre; the campus sits at the world origin
const EARTH_Z = 400;
const DC_BUILDINGS = [
	[-930, -470, 800, 370],
	[130, -470, 800, 370],
	[-930, 70, 800, 330],
	[130, 70, 800, 330],
];

function earthCam(t) {
	const lz = E.inOut3(clamp01(t / 1.1)) * Math.log(EARTH_Z);
	const k = E.inOut3(clamp01(lz / Math.log(6)));
	return { z: Math.exp(lz) * (1 + 0.02 * Math.max(0, t - 1.1)), lz, cx: lerp(GC[0], 0, k), cy: lerp(GC[1], 0, k), rot: -28 * (1 - E.out3(clamp01(t / 1.15))) };
}
/** A layer drawn in units where one world unit is `k` layer units. */
const layerTransform = (c, k) => `translate(960 540) rotate(${f1(c.rot)}) scale(${(c.z / k).toFixed(5)}) translate(${f1(-c.cx * k)} ${f1(-c.cy * k)})`;

function globeMarkup() {
	const [cx, cy] = GC;
	let m =
		`<defs><radialGradient id="eOcean" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#3b82c9"/><stop offset="0.6" stop-color="#174a8a"/><stop offset="1" stop-color="#081a38"/></radialGradient>` +
		`<radialGradient id="eAtmo" cx="0.5" cy="0.5" r="0.5"><stop offset="0.85" stop-color="#6fb6ff" stop-opacity="0"/><stop offset="0.88" stop-color="#6fb6ff" stop-opacity="0.5"/><stop offset="1" stop-color="#6fb6ff" stop-opacity="0"/></radialGradient>` +
		`<radialGradient id="eShade" cx="0.35" cy="0.3" r="0.8"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></radialGradient>` +
		`<clipPath id="eClip"><circle cx="${cx}" cy="${cy}" r="420"/></clipPath></defs>`;
	m += `<circle cx="${cx}" cy="${cy}" r="490" fill="url(#eAtmo)"/><circle cx="${cx}" cy="${cy}" r="420" fill="url(#eOcean)"/><g clip-path="url(#eClip)">`;
	m += `<path d="M28 -14C58 -54 74 -104 56 -150C36 -206 -24 -246 -120 -258C-226 -268 -320 -226 -372 -160C-410 -100 -424 -26 -398 36C-372 96 -322 136 -254 166C-204 190 -156 222 -116 254C-96 244 -88 198 -104 160C-66 150 -26 138 -4 112C14 84 8 34 28 -14Z" fill="#3f7d46"/>`;
	m += `<path d="M-20 100C-10 120 -6 150 -16 170C-26 160 -32 130 -40 110Z" fill="#3f7d46"/><path d="M-110 286C-50 272 30 296 54 352C70 410 24 470 -34 506C-70 470 -96 410 -100 350C-104 320 -118 300 -110 286Z" fill="#3f7d46"/>`;
	m += `<ellipse cx="-300" cy="60" rx="70" ry="45" fill="#b49a63"/><ellipse cx="-180" cy="-120" rx="110" ry="60" fill="#5f8f4f"/><ellipse cx="60" cy="-275" rx="55" ry="40" fill="#e8eef2"/>`;
	for (const [x, y, rx, ry, a] of [
		[-250, -180, 110, 22, -15],
		[70, 190, 130, 26, 12],
		[-330, 90, 90, 18, 20],
		[150, -110, 120, 24, -30],
		[-120, 40, 70, 14, 8],
	])
		m += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${x} ${y})" fill="#fff" opacity="0.5"/>`;
	return m + `<circle cx="${cx}" cy="${cy}" r="420" fill="url(#eShade)"/></g>`;
}

function regionMarkup() {
	const r = rng(123);
	const greens = ["#7c9655", "#8fa363", "#a7a26b", "#6c8a4f", "#9b8b5c", "#5f7d47", "#b3ad7a"];
	let m = `<rect x="-3400" y="-3400" width="6800" height="6800" fill="#5b7444"/><g transform="rotate(14)">`;
	for (let i = -15; i <= 15; i++)
		for (let j = -15; j <= 15; j++) m += `<rect x="${i * 230 + 10}" y="${j * 230 + 10}" width="${f1(180 + r() * 40)}" height="${f1(180 + r() * 40)}" fill="${pick(r, greens)}"/>`;
	m += `</g>`;
	for (let i = 0; i < 50; i++) m += `<circle cx="${f1(-3200 + r() * 6400)}" cy="${f1(-3200 + r() * 6400)}" r="${f1(60 + r() * 140)}" fill="#44663a"/>`;
	m += `<path d="M-3300 -700C-2400 -300 -1800 -1100 -1000 -600S0 -900 300 -500S800 200 1150 300" stroke="#35698f" stroke-width="60" fill="none"/>`;
	m += `<path d="M1100 -3400C1000 -2000 1300 -1000 1150 0C1050 900 1350 1800 1200 3400L3400 3400L3400 -3400Z" fill="#24557f"/>`;
	m += `<path d="M-3400 380L3400 -500" stroke="#cfcabc" stroke-width="30"/><path d="M-400 -3400L300 3400" stroke="#cfcabc" stroke-width="24"/>`;
	for (const [tx, ty] of [
		[-900, 700],
		[600, -900],
		[-1600, -1200],
	])
		for (let i = 0; i < 40; i++) m += `<rect x="${f1(tx + r() * 400)}" y="${f1(ty + r() * 300)}" width="22" height="16" fill="#d7d3c8"/>`;
	for (let i = 0; i < 26; i++) {
		const a = r() * Math.PI * 2;
		const d = 110 + r() * 560;
		const w = 50 + r() * 80;
		const h = 26 + r() * 34;
		const x = Math.cos(a) * d;
		const y = Math.sin(a) * d;
		m += `<rect x="${f1(x + 5)}" y="${f1(y + 5)}" width="${f1(w)}" height="${f1(h)}" fill="rgba(0,0,0,0.3)"/><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="#c4c7cc"/><rect x="${f1(x)}" y="${f1(y + h + 4)}" width="${f1(w * 0.7)}" height="14" fill="#55585d"/>`;
	}
	m += `<rect x="-160" y="-4.4" width="320" height="5.6" fill="#4a4d52"/>`;
	for (const [x, y, w, h] of DC_BUILDINGS) m += `<rect x="${f1(x / 16 + 1)}" y="${f1(y / 16 + 1)}" width="${f1(w / 16)}" height="${f1(h / 16)}" fill="rgba(0,0,0,0.35)"/><rect x="${f1(x / 16)}" y="${f1(y / 16)}" width="${f1(w / 16)}" height="${f1(h / 16)}" fill="#cdd0d5"/>`;
	return m;
}

function campusMarkup() {
	const r = rng(321);
	let m = `<rect x="-2600" y="-2000" width="5200" height="4000" fill="#5e7b45"/>`;
	for (let i = 0; i < 140; i++) m += `<ellipse cx="${f1(-2600 + r() * 5200)}" cy="${f1(-2000 + r() * 4000)}" rx="${f1(60 + r() * 200)}" ry="${f1(40 + r() * 120)}" fill="${r() > 0.5 ? "#577240" : "#688650"}" opacity="0.7"/>`;
	m += `<rect x="-2600" y="-70" width="5200" height="90" fill="#4a4d52"/>`;
	for (let x = -2600; x < 2600; x += 90) m += `<rect x="${x}" y="-28" width="46" height="6" fill="#e8e0c4"/>`;
	m += `<rect x="-1040" y="-2000" width="70" height="4000" fill="#4a4d52"/><rect x="1000" y="-2000" width="70" height="4000" fill="#4a4d52"/>`;
	const cars = ["#e6e6e6", "#2b2d33", "#8e959f", "#b53a32", "#2f5d9e", "#d0d4da"];
	for (const [lx, ly] of [
		[-930, -660],
		[130, -660],
		[-930, 440],
		[130, 440],
	]) {
		m += `<rect x="${lx}" y="${ly}" width="800" height="150" fill="#3d4044"/>`;
		for (let i = 0; i < 26; i++) {
			m += `<rect x="${lx + 12 + i * 30}" y="${ly + 8}" width="2" height="60" fill="#d8d8d8"/><rect x="${lx + 12 + i * 30}" y="${ly + 82}" width="2" height="60" fill="#d8d8d8"/>`;
			if (r() > 0.3) m += `<rect x="${lx + 17 + i * 30}" y="${ly + 16}" width="20" height="42" rx="5" fill="${pick(r, cars)}"/>`;
			if (r() > 0.3) m += `<rect x="${lx + 17 + i * 30}" y="${ly + 90}" width="20" height="42" rx="5" fill="${pick(r, cars)}"/>`;
		}
	}
	for (const [x, y, w, h] of DC_BUILDINGS) {
		m += `<rect x="${x + 20}" y="${y + 20}" width="${w}" height="${h}" fill="rgba(0,0,0,0.38)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#cdd0d5" stroke="#b1b5bc" stroke-width="8"/>`;
		m += `<rect x="${x + 60}" y="${y + h / 2 - 14}" width="${w - 120}" height="28" fill="#dfe2e6"/>`;
		for (let xx = x + 50; xx < x + w - 60; xx += 78)
			for (const yy of [y + 36, y + h - 92])
				m += `<rect x="${xx}" y="${yy}" width="56" height="56" rx="4" fill="#8b9097" stroke="#6d7279" stroke-width="3"/><circle cx="${xx + 28}" cy="${yy + 28}" r="19" fill="#50555c"/><path d="M${xx + 14} ${yy + 28}L${xx + 42} ${yy + 28}M${xx + 28} ${yy + 14}L${xx + 28} ${yy + 42}" stroke="#7a8088" stroke-width="3"/>`;
	}
	for (let i = 0; i < 60; i++) m += `<circle cx="${f1(-2400 + i * 80 + r() * 30)}" cy="${f1(r() > 0.5 ? -110 : 60)}" r="${f1(16 + r() * 10)}" fill="#3f5c33"/>`;
	return m;
}

function gpuCard(spin) {
	let m = `<rect x="-202" y="-112" width="14" height="232" rx="3" fill="#c9ced6"/><rect x="-190" y="80" width="380" height="26" fill="#1f6b3a"/>`;
	for (let x = -150; x < 60; x += 14) m += `<rect x="${x}" y="104" width="9" height="20" fill="#e2b33d"/>`;
	m += `<rect x="-190" y="-110" width="380" height="196" rx="18" fill="#26292f"/><rect x="-190" y="-110" width="380" height="22" rx="10" fill="#c8a94a"/>`;
	for (const fx of [-92, 92]) {
		let blades = "";
		for (let k = 0; k < 7; k++) blades += `<path d="M0 0Q24 -26 8 -58Q-8 -40 0 0Z" fill="#3c4048" transform="rotate(${f1(spin + k * 51.4)})"/>`;
		m += `<circle cx="${fx}" cy="-4" r="70" fill="#141518"/><circle cx="${fx}" cy="-4" r="64" fill="#1d1f23"/><g transform="translate(${fx} -4)">${blades}<circle r="16" fill="#c8a94a"/></g>`;
	}
	return m;
}

/** A badly cut-out sticker: a jagged white edge, a drop shadow, and a scrap of the old background. */
function sticker(inner, [x0, y0, x1, y1], seed, scrap = "#a9cde9") {
	const r = rng(seed);
	const cx = (x0 + x1) / 2;
	const cy = (y0 + y1) / 2;
	const pts = [];
	const side = (ax, ay, bx, by) => {
		const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 34));
		for (let i = 0; i < n; i++) pts.push(lerpPt([ax, ay], [bx, by], i / n));
	};
	side(x0, y0, x1, y0);
	side(x1, y0, x1, y1);
	side(x1, y1, x0, y1);
	side(x0, y1, x0, y0);
	const poly = pts
		.map(([x, y]) => {
			const a = Math.atan2(y - cy, x - cx);
			const o = 10 + r() * 16;
			return `${f1(x + Math.cos(a) * o)},${f1(y + Math.sin(a) * o)}`;
		})
		.join(" ");
	const sx = x1 - 50 - r() * 40;
	return `<polygon points="${poly}" fill="rgba(0,0,0,0.4)" transform="translate(12 16)"/><polygon points="${poly}" fill="#fff"/><polygon points="${f1(sx)},${y0 - 6} ${x1 + 6},${y0 - 6} ${x1 + 6},${y0 + 46} ${f1(sx + 20)},${y0 + 20}" fill="${scrap}"/>${inner}`;
}

function jacketGpu(lt) {
	const w = Math.sin(lt * 7);
	let m = "";
	for (const sg of [-1, 1]) {
		const end = [sg * 290, -150 - 16 * w * sg];
		const d = `M${sg * 120} -30Q${sg * 236} ${f1(-20 + 10 * w)} ${end[0]} ${f1(end[1])}`;
		m += `<path d="${d}" stroke="#121214" stroke-width="64" fill="none" stroke-linecap="round"/><path d="${d}" stroke="rgba(255,255,255,0.22)" stroke-width="8" fill="none" stroke-linecap="round" transform="translate(${-sg * 10} -16)"/>`;
		m += `<circle cx="${sg * 300}" cy="${f1(end[1] - 30)}" r="32" fill="#e0b08c"/>`;
	}
	m += `<path d="M-150 -60Q-170 120 -136 214L136 214Q170 120 150 -60Q0 -98 -150 -60Z" fill="#141416"/><path d="M-46 -74L0 60L46 -74Z" fill="#3b3e45"/>`;
	m += `<path d="M-150 -60L-46 -74L-10 110L-60 40Z" fill="#202024"/><path d="M150 -60L46 -74L10 110L60 40Z" fill="#202024"/><path d="M-8 110L-8 214" stroke="#9aa0a8" stroke-width="5"/>`;
	m += `<path d="M-122 -20Q-134 80 -114 180" stroke="rgba(255,255,255,0.28)" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M106 0Q118 70 104 150" stroke="rgba(255,255,255,0.18)" stroke-width="8" fill="none" stroke-linecap="round"/>`;
	return m + `<g transform="translate(0 -188) scale(0.74)">${gpuCard(lt * 1400)}</g>`;
}

function flame(x, y, s, t, i) {
	const sy = 1 + 0.14 * Math.sin(t * 19 + i * 1.7);
	const P = "M0 -60C25 -30 40 -10 34 14C30 40 12 52 0 52C-12 52 -30 40 -34 14C-40 -10 -15 -25 0 -60Z";
	return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${(s * (1 + 0.05 * Math.sin(t * 23 + i))).toFixed(3)} ${(s * sy).toFixed(3)}) skewX(${f1(5 * Math.sin(t * 13 + i))})"><path d="${P}" fill="#ff6a13"/><path d="${P}" fill="#ffb31f" transform="translate(0 16) scale(0.66)"/><path d="${P}" fill="#fff1a6" transform="translate(0 28) scale(0.36)"/></g>`;
}

function gauge(lt, a) {
	const pt = (deg, rr) => [f1(Math.cos((deg * Math.PI) / 180) * rr), f1(30 + Math.sin((deg * Math.PI) / 180) * rr)];
	const arcSeg = (a0, a1, col) => {
		const [x0, y0] = pt(a0, 150);
		const [x1, y1] = pt(a1, 150);
		return `<path d="M${x0} ${y0}A150 150 0 0 1 ${x1} ${y1}" stroke="${col}" stroke-width="30" fill="none"/>`;
	};
	let m = `<rect x="-250" y="-190" width="500" height="320" rx="26" fill="#18181b" stroke="#ff3b30" stroke-width="6"/>`;
	m += arcSeg(180, 250, "#34c759") + arcSeg(250, 300, "#ffcc00") + arcSeg(300, 360, "#ff3b30");
	for (let d = 180; d <= 360; d += 20) {
		const [x0, y0] = pt(d, 112);
		const [x1, y1] = pt(d, 126);
		m += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#9fa4ab" stroke-width="4"/>`;
	}
	const [nx, ny] = pt(a, 130);
	m += `<line x1="0" y1="30" x2="${nx}" y2="${ny}" stroke="#f2f4f6" stroke-width="10" stroke-linecap="round"/><circle cx="0" cy="30" r="18" fill="#f2f4f6"/>`;
	m += `<circle cx="210" cy="-150" r="14" fill="${Math.floor(lt * 6) % 2 ? "#ff3b30" : "#5a1612"}"/>`;
	return m + `<text x="0" y="104" text-anchor="middle" font-family="Figtree" font-weight="900" font-size="40" fill="#f2f4f6">POWER GRID: <tspan fill="#ff3b30">COOKED</tspan></text>`;
}

function mapPin(x, y, a) {
	if (a <= 0.01) return "";
	return `<g opacity="${a.toFixed(2)}"><g transform="translate(${f1(x)} ${f1(y)})"><path d="M0 0C-8 -18 -26 -30 -26 -50A26 26 0 1 1 26 -50C26 -30 8 -18 0 0Z" fill="#ff4b3e" stroke="#9c1f14" stroke-width="3"/><circle cx="0" cy="-50" r="9" fill="#9c1f14"/></g><text x="${f1(x + 40)}" y="${f1(y - 38)}" font-family="Figtree" font-weight="700" font-size="40" fill="#fff" stroke="#000" stroke-width="7" paint-order="stroke" stroke-linejoin="round">Ashburn, Virginia</text></g>`;
}

const GPU_STICKERS = [
	[420, 300, -10, 1.25, 11],
	[1500, 270, 8, 1.37, 12],
	[400, 790, 6, 1.49, 13],
];
const FLAMES = [
	[720, 180, 1.0],
	[1180, 150, 0.9],
	[170, 560, 1.1],
	[1780, 470, 1.0],
	[760, 940, 1.0],
	[1150, 960, 0.85],
	[230, 990, 0.9],
	[1290, 360, 0.8],
	[640, 560, 0.9],
];

function earthOverlay(lt) {
	let m = "";
	FLAMES.forEach(([x, y, s], i) => {
		const p = backOut(clamp01((lt - 1.4 - i * 0.06) / 0.22));
		if (p > 0.01) m += flame(x, y, s * p * 1.3, lt, i);
	});
	GPU_STICKERS.forEach(([x, y, rot, t0, seed], i) => {
		const p = backOut(clamp01((lt - t0) / 0.25));
		if (p > 0.01) m += `<g transform="translate(${x} ${f1(y + 6 * Math.sin(lt * 3 + i))}) rotate(${rot}) scale(${(0.7 * p).toFixed(3)})">${sticker(gpuCard(lt * 900 + i * 40), [-205, -125, 200, 130], seed)}</g>`;
	});
	const hp = backOut(clamp01((lt - 1.62) / 0.28));
	if (hp > 0.01) m += `<g transform="translate(980 ${f1(600 + 8 * Math.sin(lt * 4))}) rotate(-3) scale(${(0.85 * hp).toFixed(3)})">${sticker(jacketGpu(lt), [-340, -300, 340, 230], 21, "#bfa98a")}</g>`;
	const gp = backOut(clamp01((lt - 1.85) / 0.25));
	if (gp > 0.01) {
		const swing = backOut(clamp01((lt - 1.98) / 0.3));
		const a = 185 + 167 * swing + (lt > 2.2 ? 3 * Math.sin(lt * 50) : 0);
		m += `<g transform="translate(1530 800) rotate(4) scale(${(0.9 * gp).toFixed(3)})">${gauge(lt, a)}</g>`;
	}
	return m;
}

function earthCut() {
	return {
		dur: 3.0,
		flash: true,
		build(root) {
			root.style.background = "#02040a";
			const r = rng(55);
			const sky = svgLayer(root);
			let stars = "";
			for (let i = 0; i < 220; i++) stars += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(0.6 + r() * 1.8)}" fill="#fff" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`;
			sky.innerHTML = stars;
			const zs = svgLayer(root);
			const globe = sv("g", {}, zs);
			const region = sv("g", {}, zs);
			const campus = sv("g", {}, zs);
			globe.innerHTML = globeMarkup();
			region.innerHTML = regionMarkup();
			campus.innerHTML = campusMarkup();
			const over = svgLayer(root);
			return (lt) => {
				const c = earthCam(lt);
				const fade = (z0, z1) => clamp01((c.z - z0) / (z1 - z0));
				sky.style.opacity = (1 - fade(1.5, 3.5)).toFixed(3);
				globe.setAttribute("transform", layerTransform(c, 1));
				globe.setAttribute("opacity", (1 - fade(14, 30)).toFixed(3));
				region.setAttribute("transform", layerTransform(c, 25));
				region.setAttribute("opacity", (fade(9, 15) * (1 - fade(230, 320))).toFixed(3));
				campus.setAttribute("transform", layerTransform(c, EARTH_Z));
				campus.setAttribute("opacity", fade(170, 260).toFixed(3));
				const speed = (earthCam(lt + 0.02).lz - earthCam(lt - 0.02).lz) / 0.04;
				zs.style.filter = speed > 1 ? `blur(${Math.min(3, (speed - 1) * 0.5).toFixed(2)}px)` : "none";
				const a = (c.rot * Math.PI) / 180;
				const dx = -c.cx * c.z;
				const dy = -c.cy * c.z;
				const px = 960 + dx * Math.cos(a) - dy * Math.sin(a);
				const py = 540 + dx * Math.sin(a) + dy * Math.cos(a);
				over.innerHTML = mapPin(px, py, fade(3, 6) * (1 - fade(140, 220))) + earthOverlay(lt);
			};
		},
	};
}

/* ---------------------------------------------------------------------------------------------
 * 4 · "The results are in.": a joke chart plummets through the floor, then a half-second flash of
 * a tiny brain on a brain-shaped beanbag.
 * ------------------------------------------------------------------------------------------- */

function chartCut() {
	const r = rng(404);
	const pts = [];
	let n = 0;
	for (let x = 360; x <= 1150; x += 10) {
		n = n * 0.6 + (r() - 0.5) * 14;
		pts.push([x, 352 + ((x - 360) / 790) ** 1.6 * 120 + n]);
	}
	const MONO_F = `font-family="JetBrains Mono" font-weight="500"`;
	let frame = `<defs><filter id="redGlow" x="-0.2" y="-0.2" width="1.4" height="1.4"><feGaussianBlur stdDeviation="10"/></filter></defs>`;
	frame += `<text x="360" y="170" font-family="Figtree" font-weight="900" font-size="96" fill="#f2f4f6" letter-spacing="-2">HUMAN IQ (2023–2026)</text>`;
	frame += `<text x="364" y="222" ${MONO_F} font-size="26" fill="#9fa4ab" letter-spacing="2">CLINICAL TRIAL · n = EVERYONE</text>`;
	["GALAXY BRAIN", "BIG BRAIN", "NORMAL", "SMOOTH BRAIN"].forEach((t, i) => {
		const y = 340 + i * 140;
		frame += `<line x1="360" y1="${y}" x2="1760" y2="${y}" stroke="#2a2d33" stroke-width="2" stroke-dasharray="10 10"/><text x="336" y="${y + 9}" text-anchor="end" ${MONO_F} font-size="24" fill="#9fa4ab">${t}</text>`;
	});
	frame += `<line x1="360" y1="880" x2="1760" y2="880" stroke="#4a4d54" stroke-width="3"/>`;
	["2023", "2024", "2025", "2026"].forEach((t, i) => (frame += `<text x="${f1(360 + i * 466.7)}" y="932" text-anchor="middle" ${MONO_F} font-size="28" fill="#9fa4ab">${t}</text>`));
	frame += `<text x="1760" y="1010" text-anchor="end" ${MONO_F} font-size="22" fill="#6b7078">source: trust me bro</text>`;
	return {
		dur: 2.0,
		flash: true,
		build(root) {
			root.style.background = "#0d0e10";
			const s = svgLayer(root);
			return (lt) => {
				const k = clamp01((lt - 0.12) / 0.62) * (pts.length - 1);
				const i = Math.floor(k);
				const line = pts.slice(0, i + 1);
				if (i < pts.length - 1) line.push(lerpPt(pts[i], pts[i + 1], k - i));
				const u = clamp01((lt - 0.76) / 0.16);
				const last = pts[pts.length - 1];
				if (u > 0) line.push([last[0] + 4, lerp(last[1], 1500, u * u)]);
				const head = line[line.length - 1];
				const P = line.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
				const pan = -170 * E.out3(clamp01((lt - 0.82) / 0.3));
				const hit = lt - 0.92;
				const a = hit > 0 ? Math.exp(-hit * 8) : 0;
				let m = `<g transform="translate(${f1(Math.sin(hit * 90) * 16 * a)} ${f1(pan + Math.cos(hit * 75) * 12 * a)})">${frame}`;
				m += `<polyline points="${P}" fill="none" stroke="#ff2440" stroke-width="24" stroke-linejoin="round" opacity="0.55" filter="url(#redGlow)"/><polyline points="${P}" fill="none" stroke="#ff4458" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>`;
				if (u < 1) m += `<circle cx="${f1(head[0])}" cy="${f1(head[1])}" r="22" fill="#ff2440" opacity="0.5" filter="url(#redGlow)"/><circle cx="${f1(head[0])}" cy="${f1(head[1])}" r="10" fill="#fff"/>`;
				s.innerHTML = m + `</g>`;
			};
		},
	};
}

function drawBrainlet(lt) {
	let m = rays(960, 560, lt * 30, 16, "rgba(255,255,255,0.04)") + ground(880, "#121733") + shadow(960, 890, 470);
	const sq = 1 - 0.06 * Math.exp(-lt * 8) * Math.cos(lt * 30);
	m += `<g transform="translate(960 750) scale(2.1 ${(2.1 * 0.55 * sq).toFixed(4)})">`;
	m += BRAIN_CIRCLES.map(([x, y, rr]) => `<circle cx="${x}" cy="${y + 7}" r="${rr}" fill="#e46f9b"/>`).join("");
	m += BRAIN_CIRCLES.map(([x, y, rr]) => `<circle cx="${x - 4}" cy="${y - 4}" r="${f1(rr * 0.94)}" fill="#ff9fc0"/>`).join("");
	m += BRAIN_FOLDS.map((d) => `<path d="${d}" stroke="#cf5487" stroke-width="9" fill="none" stroke-linecap="round"/>`).join("") + `</g>`;
	const drool = 10 * clamp01(lt / 0.4);
	m += brain({
		x: 960,
		y: 548 + 4 * Math.sin(lt * 9) - (1 - sq) * 60,
		s: 0.44,
		tone: 0.75,
		eyes: "wide",
		look: [
			[-0.8, -0.7],
			[0.9, 0.6],
		],
		mouth: "o",
		legs: [
			[-50, 110, -90, 150, -120, 168],
			[50, 110, 90, 150, 120, 168],
		],
		extra: `<path d="M12 98Q16 ${f1(118 + drool)} 10 ${f1(130 + drool * 2)}" stroke="#bfe6ff" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="10" cy="${f1(134 + drool * 2)}" r="10" fill="#bfe6ff"/>`,
	});
	return m;
}

/** Plays a scene's animation faster or slower so it fills `dur` seconds. */
function fit(scene, dur) {
	const k = scene.dur / dur;
	return { ...scene, dur, build: (root) => ((draw) => (t) => draw(t * k))(scene.build(root)) };
}

// Cut lengths follow Eric's voice-over take (out/vo/hook-eric.json) after its 0.35 s lead-in:
// "what happens" 5.09 s, "to a GPU" 7.50 s, "The results" 10.33 s, "Nearly 1,000" 11.67 s.
// Shot 1 just runs longer; the others play their animation faster to fit.
const hook2 = fit(cutScene("hook-2-outsource", [trashCut()]), 2.41);
const hook3 = fit(cutScene("hook-3-gpu-cluster", [earthCut()]), 2.83);
const hook4 = fit(cutScene("hook-4-results", [chartCut(), art(0.5, "#1b2244", drawBrainlet, { flash: true, zoom: [1.15, 960, 600] })]), 1.34);

SCENES.push({ ...hook1, dur: 5.09 }, hook2, hook3, hook4);
