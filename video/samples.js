"use strict";
/*
 * Fast-cut explainer samples: hard cuts that alternate a full-screen text card with a full-screen
 * flat illustration. A frame never shows both. Builds on the helpers in scenes.js (el, sv,
 * svgLayer, seg, E, clamp01, lerp, mixHex, rng, W, H).
 */

const FS = { bg: "#111112", text: "#f2f4f6", dim: "#9fa4ab", blue: "#4ca3ff", red: "#ff5a4e", yellow: "#ffd23f" };
const backOut = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const f1 = (n) => Math.round(n * 10) / 10;

/** A scene made of hard cuts. Each cut is { dur, flash, build(root) → draw(localT) }. */
function cutScene(id, list) {
	const dur = +list.reduce((sum, c) => sum + c.dur, 0).toFixed(3);
	return {
		id,
		dur,
		push: false,
		build(root) {
			const built = list.map((c) => {
				const r = el("div", { position: "absolute", inset: "0", display: "none", overflow: "hidden" }, root);
				const inner = el("div", { position: "absolute", inset: "0", transformOrigin: "50% 50%" }, r);
				return { c, r, inner, draw: c.build(inner) };
			});
			const flash = el("div", { position: "absolute", inset: "0", background: "#ffffff", opacity: "0" }, root);
			return (t) => {
				let start = 0;
				let k = 0;
				while (k < built.length - 1 && t >= start + built[k].c.dur) start += built[k++].c.dur;
				const lt = t - start;
				built.forEach((b, i) => (b.r.style.display = i === k ? "block" : "none"));
				const b = built[k];
				// Every cut lands with a punch-in, then drifts.
				const punch = 1 + 0.07 * (1 - E.out3(clamp01(lt / 0.32))) + 0.015 * (lt / b.c.dur);
				b.inner.style.transform = `scale(${punch.toFixed(4)})`;
				b.draw(lt);
				flash.style.opacity = (b.c.flash ? 0.3 * (1 - clamp01(lt / 0.09)) : 0).toFixed(3);
			};
		},
	};
}

/* ---------------------------------------------------------------------------------------------
 * Text cards: heavy Figtree words that pop in one by one. Tokens: { t, at, c, size, shake }
 * where c is "blue", "red", "dim" or "hl" (a yellow marker box).
 * ------------------------------------------------------------------------------------------- */

function card(dur, lines, { size = 140, flash = false } = {}) {
	return {
		dur,
		flash,
		build(root) {
			root.style.background = FS.bg;
			const box = el(
				"div",
				{
					position: "absolute",
					inset: "0",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "Figtree",
					fontWeight: "900",
					letterSpacing: "-0.035em",
					lineHeight: "1.04",
					color: FS.text,
				},
				root,
			);
			const toks = [];
			for (const line of lines) {
				const row = el("div", { display: "flex", alignItems: "baseline", justifyContent: "center", whiteSpace: "nowrap" }, box);
				for (const tk of line) {
					const st = { display: "inline-block", fontSize: `${tk.size ?? size}px`, margin: "0 0.11em", transformOrigin: "50% 70%", opacity: "0" };
					if (tk.c === "blue") st.color = FS.blue;
					if (tk.c === "red") st.color = FS.red;
					if (tk.c === "dim") st.color = FS.dim;
					if (tk.c === "hl") Object.assign(st, { background: FS.yellow, color: FS.bg, padding: "0 0.14em", borderRadius: "0.08em", margin: "0.06em 0.11em" });
					toks.push({ tk, node: el("span", st, row, escapeHtml(tk.t)) });
				}
			}
			return (lt) => {
				let sx = 0;
				let sy = 0;
				for (const { tk, node } of toks) {
					const p = clamp01((lt - tk.at) / 0.22);
					const s = 0.3 + 0.7 * backOut(p);
					node.style.opacity = clamp01((lt - tk.at) / 0.05).toFixed(3);
					node.style.transform = `translateY(${f1((1 - p) * 26)}px) scale(${s.toFixed(4)}) rotate(${tk.c === "hl" ? -2.5 : 0}deg)`;
					const d = lt - tk.at - 0.12;
					if (tk.shake && d > 0 && d < 0.35) {
						const a = Math.exp(-d * 9);
						sx += Math.sin(d * 110) * 16 * a;
						sy += Math.cos(d * 87) * 10 * a;
					}
				}
				box.style.transform = `translate(${f1(sx)}px, ${f1(sy)}px)`;
			};
		},
	};
}

/** An illustration cut: draw(lt) returns the SVG markup for that moment; zoom = [scale, ox, oy]. */
function art(dur, bg, draw, { flash = false, zoom = null } = {}) {
	return {
		dur,
		flash,
		build(root) {
			root.style.background = bg;
			const s = svgLayer(root);
			const [z, ox, oy] = zoom ?? [1, 0, 0];
			return (lt) => {
				s.innerHTML = z === 1 ? draw(lt) : `<g transform="translate(${ox} ${oy}) scale(${z}) translate(${-ox} ${-oy})">${draw(lt)}</g>`;
			};
		},
	};
}

/* ---------------------------------------------------------------------------------------------
 * Characters and props, as flat SVG markup.
 * ------------------------------------------------------------------------------------------- */

/** A point on a quadratic curve [x1, y1, cx, cy, x2, y2] at u. */
function qpt(a, u) {
	const [x1, y1, cx, cy, x2, y2] = a;
	const v = 1 - u;
	return [v * v * x1 + 2 * v * u * cx + u * u * x2, v * v * y1 + 2 * v * u * cy + u * u * y2];
}

function limb(a, color, w, kind, buff = 0) {
	const [x1, y1, cx, cy, x2, y2] = a.map(f1);
	let m = `<path d="M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}" stroke="${color}" stroke-width="${f1(w)}" fill="none" stroke-linecap="round"/>`;
	if (kind === "arm") {
		if (buff > 0.05) {
			const [bx, by] = qpt(a, 0.42);
			m += `<circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1(w * 0.5 + 24 * buff)}" fill="${color}"/>`;
		}
		m += `<circle cx="${x2}" cy="${y2}" r="${f1(w * 0.82)}" fill="${color}"/>`;
	} else {
		m += `<ellipse cx="${f1(x2 + 14)}" cy="${f1(y2 + 4)}" rx="${f1(w * 1.35)}" ry="${f1(w * 0.72)}" fill="#2b2d42"/>`;
	}
	return m;
}

const BRAIN_CIRCLES = [
	[-95, -20, 85],
	[-40, -75, 80],
	[40, -75, 80],
	[95, -20, 85],
	[-70, 50, 70],
	[70, 50, 70],
	[0, 30, 95],
	[0, -40, 90],
];
const BRAIN_FOLDS = [
	"M-165 -10C-140 -35 -120 0 -100 -20",
	"M-130 -95C-105 -80 -110 -55 -85 -60",
	"M-70 -140C-60 -115 -40 -125 -30 -100",
	"M165 -10C140 -35 120 0 100 -20",
	"M130 -95C105 -80 110 -55 85 -60",
	"M70 -140C60 -115 40 -125 30 -100",
	"M0 -158C-12 -125 12 -105 0 -70",
];
let uid = 0;

/**
 * The brain mascot. Local origin is its centre; feet sit about 238 below at s = 1.
 * o: x, y, s, sy, rot, tone (0 pink → 1 grey), eyes ("normal" | "wide" | "happy"), lid, look ([x, y] or one per eye),
 * brows, mouth, glasses, arms / armsFront / legs ([x1,y1,cx,cy,x2,y2] each), buff, extra.
 */
function brain(o) {
	const id = `b${++uid}`;
	const t = o.tone ?? 0;
	const base = mixHex("#ff9fc0", "#a4a9b3", t);
	const dark = mixHex("#e46f9b", "#7e848e", t);
	const fold = mixHex("#cf5487", "#6b717b", t);
	const skin = mixHex("#f585ae", "#8e949e", t);
	const ink = "#3a1d2a";
	const buff = o.buff ?? 0;
	const w = 24 + 12 * buff;
	const s = o.s ?? 1;
	let m = `<g transform="translate(${f1(o.x)} ${f1(o.y)}) rotate(${f1(o.rot ?? 0)}) scale(${s.toFixed(3)} ${(s * (o.sy ?? 1)).toFixed(3)})">`;
	m += (o.legs ?? []).map((l) => limb(l, skin, w, "leg")).join("");
	m += (o.arms ?? []).map((a) => limb(a, skin, w, "arm", buff)).join("");
	m += BRAIN_CIRCLES.map(([x, y, r]) => `<circle cx="${x}" cy="${y + 7}" r="${r}" fill="${dark}"/>`).join("");
	m += BRAIN_CIRCLES.map(([x, y, r]) => `<circle cx="${x - 4}" cy="${y - 4}" r="${f1(r * 0.94)}" fill="${base}"/>`).join("");
	m += BRAIN_FOLDS.map((d) => `<path d="${d}" stroke="${fold}" stroke-width="9" fill="none" stroke-linecap="round"/>`).join("");
	if (t < 0.6) m += [-88, 88].map((cx) => `<ellipse cx="${cx}" cy="56" rx="20" ry="11" fill="rgba(255,80,130,${(0.4 * (1 - t / 0.6)).toFixed(2)})"/>`).join("");

	const eyes = o.eyes ?? "normal";
	const look = o.look ?? [0, 0];
	if (!o.glasses) {
		for (const ex of [-52, 52]) {
			if (eyes === "happy") {
				m += `<path d="M${ex - 24} 22Q${ex} -6 ${ex + 24} 22" stroke="${ink}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
				continue;
			}
			const rx = eyes === "wide" ? 34 : 30;
			const ry = eyes === "wide" ? 40 : 35;
			const pr = eyes === "wide" ? 11 : 14;
			const cid = `${id}${ex < 0 ? "l" : "r"}`;
			const lk = Array.isArray(look[0]) ? look[ex < 0 ? 0 : 1] : look;
			const px = ex + lk[0] * 11;
			const py = 12 + lk[1] * 12;
			m += `<clipPath id="${cid}"><ellipse cx="${ex}" cy="12" rx="${rx}" ry="${ry}"/></clipPath>`;
			m += `<ellipse cx="${ex}" cy="12" rx="${rx}" ry="${ry}" fill="#fff"/>`;
			m += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${pr}" fill="#17171c"/><circle cx="${f1(px - 4)}" cy="${f1(py - 5)}" r="5" fill="#fff"/>`;
			const lid = clamp01(o.lid ?? 0);
			if (lid > 0.01) {
				const ly = 12 - ry + 2 * ry * lid;
				const half = rx * Math.sqrt(Math.max(0, 1 - ((ly - 12) / ry) ** 2));
				m += `<rect x="${ex - rx - 2}" y="${12 - ry - 2}" width="${rx * 2 + 4}" height="${f1(2 * ry * lid + 2)}" fill="${base}" clip-path="url(#${cid})"/>`;
				m += `<line x1="${f1(ex - half)}" y1="${f1(ly)}" x2="${f1(ex + half)}" y2="${f1(ly)}" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`;
			}
		}
	} else {
		m += `<path d="M-94 4L-150 -8M94 4L150 -8" stroke="#141418" stroke-width="7"/><g fill="#141418"><rect x="-94" y="-12" width="80" height="50" rx="18"/><rect x="14" y="-12" width="80" height="50" rx="18"/></g>`;
		m += `<path d="M-14 4Q0 -6 14 4" stroke="#141418" stroke-width="8" fill="none"/><path d="M-80 -2L-62 -6M28 -2L46 -6" stroke="rgba(255,255,255,0.55)" stroke-width="5" stroke-linecap="round"/>`;
	}
	const brows = {
		angry: ["M-84 -42L-30 -24", "M84 -42L30 -24"],
		worried: ["M-82 -24L-30 -42", "M82 -24L30 -42"],
		up: ["M-82 -48Q-56 -64 -30 -50", "M82 -48Q56 -64 30 -50"],
	}[o.brows];
	if (brows) m += brows.map((d) => `<path d="${d}" stroke="${ink}" stroke-width="10" fill="none" stroke-linecap="round"/>`).join("");
	const line = `stroke="${ink}" stroke-width="9" fill="none" stroke-linecap="round"`;
	m +=
		{
			smile: `<path d="M-30 64Q0 94 30 64" ${line}/>`,
			smirk: `<path d="M-26 72Q8 90 32 62" ${line}/>`,
			flat: `<path d="M-22 76L22 76" ${line}/>`,
			frown: `<path d="M-28 88Q0 62 28 88" ${line}/>`,
			o: `<ellipse cx="0" cy="80" rx="17" ry="21" fill="${ink}"/>`,
			grin: `<path d="M-40 60Q0 118 40 60Z" fill="${ink}"/><path d="M-20 90Q0 106 20 90Q0 96 -20 90Z" fill="#ff6f8f"/>`,
			grit: `<rect x="-38" y="60" width="76" height="32" rx="10" fill="#fff" stroke="${ink}" stroke-width="6"/><path d="M-38 76L38 76M-13 60L-13 92M13 60L13 92" stroke="${ink}" stroke-width="4"/>`,
		}[o.mouth ?? "smile"] ?? "";
	m += (o.armsFront ?? []).map((a) => limb(a, skin, w, "arm", buff)).join("");
	m += o.extra ?? "";
	return m + "</g>";
}

function robotArm(a) {
	const [x1, y1, cx, cy, x2, y2] = a.map(f1);
	return `<path d="M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}" stroke="#b9c3d0" stroke-width="28" fill="none" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="24" fill="#eef2f7" stroke="#b9c3d0" stroke-width="5"/>`;
}

/**
 * The AI robot. Local origin is the body centre; with legs, feet sit 186 below.
 * o: x, y, s, rot, eyes ("normal" | "focus" | "happy"), blink, glow, mouth, legs, headband,
 * whistle, armsBack / arms, extra.
 */
function robot(o) {
	const blink = o.blink ?? 0;
	let m = `<g transform="translate(${f1(o.x)} ${f1(o.y)}) rotate(${f1(o.rot ?? 0)}) scale(${(o.s ?? 1).toFixed(3)})">`;
	if (o.legs) {
		m += `<rect x="-62" y="66" width="40" height="100" rx="14" fill="#b9c3d0"/><rect x="22" y="66" width="40" height="100" rx="14" fill="#b9c3d0"/>`;
		m += `<rect x="-76" y="152" width="64" height="32" rx="14" fill="#8e99a8"/><rect x="12" y="152" width="64" height="32" rx="14" fill="#8e99a8"/>`;
	}
	m += (o.armsBack ?? []).map(robotArm).join("");
	m += `<rect x="-100" y="-80" width="200" height="172" rx="36" fill="#b9c3d0"/><rect x="-100" y="-90" width="200" height="168" rx="36" fill="#e3e9f1"/>`;
	m += `<circle cx="0" cy="-8" r="32" fill="none" stroke="#4ca3ff" stroke-opacity="0.35" stroke-width="6"/><circle cx="0" cy="-8" r="20" fill="#4ca3ff"/><rect x="-56" y="36" width="112" height="12" rx="6" fill="#c9d2de"/>`;
	m += `<rect x="-26" y="-112" width="52" height="28" fill="#b9c3d0"/>`;
	m += `<line x1="0" y1="-268" x2="0" y2="-298" stroke="#9aa6b8" stroke-width="8" stroke-linecap="round"/><circle cx="0" cy="-306" r="15" fill="#4ca3ff" fill-opacity="${(o.glow ?? 1).toFixed(2)}"/>`;
	m += `<rect x="-138" y="-222" width="24" height="64" rx="10" fill="#b9c3d0"/><rect x="114" y="-222" width="24" height="64" rx="10" fill="#b9c3d0"/>`;
	m += `<rect x="-120" y="-262" width="240" height="168" rx="44" fill="#b9c3d0"/><rect x="-120" y="-272" width="240" height="166" rx="44" fill="#eef2f7"/>`;
	m += `<rect x="-92" y="-250" width="184" height="122" rx="30" fill="#0f1a2e"/>`;
	const eyes = o.eyes ?? "normal";
	if (eyes === "happy") {
		m += [-40, 40].map((ex) => `<path d="M${ex - 19} -180Q${ex} -206 ${ex + 19} -180" stroke="#4ca3ff" stroke-width="9" fill="none" stroke-linecap="round"/>`).join("");
	} else {
		const h = (eyes === "focus" ? 20 : 40) * (1 - blink) + 3;
		m += [-40, 40].map((ex) => `<rect x="${ex - 16}" y="${f1(-192 - h / 2)}" width="32" height="${f1(h)}" rx="10" fill="#4ca3ff"/>`).join("");
	}
	m += o.mouth === "flat" ? `<path d="M-18 -152L18 -152" stroke="#4ca3ff" stroke-width="7" stroke-linecap="round"/>` : `<path d="M-22 -156Q0 -140 22 -156" stroke="#4ca3ff" stroke-width="7" fill="none" stroke-linecap="round"/>`;
	if (o.headband) m += `<rect x="-122" y="-264" width="244" height="28" fill="#ff5a4e"/><path d="M116 -256L156 -276L150 -240ZM116 -248L152 -228L118 -236Z" fill="#ff5a4e"/>`;
	if (o.whistle) m += `<rect x="4" y="-168" width="54" height="26" rx="11" fill="#ffd23f"/><circle cx="50" cy="-155" r="7" fill="#c99a0f"/>`;
	m += (o.arms ?? []).map(robotArm).join("");
	m += o.extra ?? "";
	return m + "</g>";
}

const paper = (x, y, rot = 0, sx = 1, sy = sx) =>
	`<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})"><rect x="-36" y="-46" width="72" height="92" rx="7" fill="#f2f4f6"/><rect x="-24" y="-30" width="48" height="7" rx="3.5" fill="#c3cad6"/><rect x="-24" y="-14" width="40" height="7" rx="3.5" fill="#c3cad6"/><rect x="-24" y="2" width="48" height="7" rx="3.5" fill="#c3cad6"/><rect x="-24" y="18" width="30" height="7" rx="3.5" fill="#4ca3ff"/></g>`;
const sparkle = (x, y, s, rot = 0, c = FS.yellow) =>
	s <= 0.01 ? "" : `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s.toFixed(3)})" d="M0 -30Q4 -4 30 0Q4 4 0 30Q-4 4 -30 0Q-4 -4 0 -30Z" fill="${c}"/>`;
const sweat = (x, y, s = 1, rot = 0) => `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s.toFixed(3)})" d="M0 -20Q14 0 0 12Q-14 0 0 -20Z" fill="#8fd0ff"/>`;
const ground = (y, color) => `<rect x="-200" y="${y}" width="${W + 400}" height="${H - y + 200}" fill="${color}"/>`;
const disc = (cx, cy, r, color) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
const shadow = (x, y, rx) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(rx * 0.16)}" fill="rgba(0,0,0,0.3)"/>`;

function rays(cx, cy, rot, n = 16, color = "rgba(255,255,255,0.05)") {
	let m = "";
	for (let i = 0; i < n; i++) {
		const a0 = (((i / n) * 360 + rot) * Math.PI) / 180;
		const a1 = a0 + Math.PI / n;
		m += `<path d="M${cx} ${cy}L${f1(cx + 1700 * Math.cos(a0))} ${f1(cy + 1700 * Math.sin(a0))}L${f1(cx + 1700 * Math.cos(a1))} ${f1(cy + 1700 * Math.sin(a1))}Z" fill="${color}"/>`;
	}
	return m;
}

const drink = (x, y) =>
	`<g transform="translate(${x} ${y})"><path d="M-26 -44L26 -44L18 28L-18 28Z" fill="rgba(255,255,255,0.22)" stroke="#f2f4f6" stroke-width="5" stroke-linejoin="round"/><path d="M-22 -18L22 -18L17 24L-17 24Z" fill="#ffb02e"/><path d="M8 -44L22 -84" stroke="#ff5a4e" stroke-width="6" stroke-linecap="round"/><path d="M-6 -62L-6 -44" stroke="#f2f4f6" stroke-width="3"/><path d="M-32 -60Q-6 -94 20 -60Z" fill="#4ca3ff"/></g>`;

/** Barbell in the holder's local coords; plates: [{ x, w, h, c, side }] (side -1, 1, or 0 for both). */
function barbell(y, plates) {
	let m = `<path d="M-400 ${f1(y)}L400 ${f1(y)}" stroke="#d5dbe4" stroke-width="14" stroke-linecap="round"/>`;
	for (const p of plates)
		for (const sg of p.side ? [p.side] : [-1, 1]) m += `<rect x="${f1(sg * p.x - p.w / 2)}" y="${f1(y - p.h / 2)}" width="${p.w}" height="${p.h}" rx="9" fill="${p.c}"/>`;
	m += [-1, 1].map((sg) => `<rect x="${sg * 236 - 9}" y="${f1(y - 26)}" width="18" height="52" rx="5" fill="#9aa6b8"/>`).join("");
	return m;
}

function battery(x, y, level, alarm) {
	const col = level > 0.66 ? "#6fbf8a" : level > 0.34 ? FS.yellow : FS.red;
	const edge = alarm ? FS.red : "#f2f4f6";
	let m = `<g transform="translate(${x} ${y})"><rect x="-84" y="-40" width="168" height="80" rx="16" fill="none" stroke="${edge}" stroke-width="8"/><rect x="86" y="-16" width="16" height="32" rx="5" fill="${edge}"/>`;
	const bars = Math.ceil(level * 3 - 0.001);
	for (let i = 0; i < bars; i++) m += `<rect x="${-68 + i * 48}" y="-26" width="40" height="52" rx="7" fill="${col}"/>`;
	return m + "</g>";
}

function cobweb(cx, cy, dir, s) {
	if (s <= 0.01) return "";
	const spokes = [0, 22, 45, 68, 90].map((d) => (d * Math.PI) / 180);
	const L = 300 * s;
	let m = `<g stroke="rgba(230,232,236,0.45)" stroke-width="3" fill="none" stroke-linecap="round">`;
	for (const a of spokes) m += `<line x1="${cx}" y1="${cy}" x2="${f1(cx + dir * L * Math.cos(a))}" y2="${f1(cy + L * Math.sin(a))}"/>`;
	for (const r of [0.3, 0.55, 0.8]) {
		let d = "";
		spokes.forEach((a, i) => {
			const x = cx + dir * L * r * Math.cos(a);
			const y = cy + L * r * Math.sin(a);
			if (!i) d += `M${f1(x)} ${f1(y)}`;
			else {
				const mid = (a + spokes[i - 1]) / 2;
				d += `Q${f1(cx + dir * L * r * 0.84 * Math.cos(mid))} ${f1(cy + L * r * 0.84 * Math.sin(mid))} ${f1(x)} ${f1(y)}`;
			}
		});
		m += `<path d="${d}"/>`;
	}
	return m + "</g>";
}

function fly(x, y, t) {
	const flap = Math.abs(Math.sin(t * 60));
	return `<g transform="translate(${f1(x)} ${f1(y)})"><ellipse cx="-7" cy="-9" rx="10" ry="${f1(3 + 7 * flap)}" fill="rgba(255,255,255,0.75)"/><ellipse cx="7" cy="-9" rx="10" ry="${f1(3 + 7 * flap)}" fill="rgba(255,255,255,0.75)"/><circle r="8" fill="#141418"/></g>`;
}

/** A thrown object's position on a quadratic arc, u in 0..1. */
const arc = (from, ctrl, to, u) => qpt([from[0], from[1], ctrl[0], ctrl[1], to[0], to[1]], u);

/* ---------------------------------------------------------------------------------------------
 * Shared sets: the hammock and the robot's desk.
 * ------------------------------------------------------------------------------------------- */

const HAMMOCK_PIVOT = [500, 515];
const hammockPosts = () => `<path d="M230 870L230 500M770 870L770 500" stroke="#8b5e3c" stroke-width="20" stroke-linecap="round"/><circle cx="230" cy="496" r="14" fill="#a8744c"/><circle cx="770" cy="496" r="14" fill="#a8744c"/>`;
const hammockRopes = () => `<path d="M232 505L266 578M768 505L734 578" stroke="#e8d5b0" stroke-width="6" stroke-linecap="round"/>`;
const hammockFabric = () =>
	`<path d="M258 570Q500 790 742 570L742 604Q500 846 258 604Z" fill="#ff6b5b"/><path d="M262 583Q500 806 738 583" stroke="#f2f4f6" stroke-width="7" fill="none"/><path d="M262 595Q500 824 738 595" stroke="${FS.yellow}" stroke-width="5" fill="none"/>`;
const desk = () =>
	`<rect x="1130" y="716" width="580" height="26" rx="8" fill="#b07a52"/><rect x="1150" y="742" width="540" height="40" fill="#8a5a3b"/><rect x="1172" y="782" width="22" height="80" fill="#8a5a3b"/><rect x="1646" y="782" width="22" height="80" fill="#8a5a3b"/>`;
function laptop(open = 1) {
	const h = 128 * open;
	let m = `<rect x="1300" y="706" width="240" height="12" rx="5" fill="#aab4c3"/>`;
	if (h > 2) m += `<rect x="1325" y="${f1(708 - h)}" width="190" height="${f1(h)}" rx="10" fill="#cfd7e3"/><circle cx="1420" cy="${f1(708 - h / 2)}" r="${f1(14 * open)}" fill="${FS.blue}"/>`;
	return m;
}
function paperStack(n) {
	let m = "";
	for (let i = 0; i < n; i++) m += `<rect x="${1566 + ((i * 37) % 9) - 4}" y="${716 - 7 * (i + 1)}" width="96" height="7" rx="2" fill="${i % 2 ? "#dde3ea" : "#f2f4f6"}"/>`;
	return m;
}
const STACK_TOP = (i) => [1614, 716 - 7 * (i + 1)];
const blinkAt = (t, at) => clamp01(1 - Math.abs(t - at) / 0.07);

/* ---------------------------------------------------------------------------------------------
 * SAMPLE 1: "Does AI make people smarter or dumber? If someone outsources all of their thinking
 * to AI, their thinking capabilities decay. Doing a hard thing produces and maintains the
 * capacity for doing the hard thing."
 * ------------------------------------------------------------------------------------------- */

/** The brain lounges in a hammock and tosses its homework to a robot typing at a laptop. */
function drawOutsource(lt) {
	const sway = 2.2 * Math.sin(lt * 2.4);
	let m = disc(960, 520, 470, "#1f2d58") + ground(860, "#121b38") + hammockPosts();
	m += `<g transform="rotate(${f1(sway)} ${HAMMOCK_PIVOT[0]} ${HAMMOCK_PIVOT[1]})">` + hammockRopes();
	const sip = seg(lt, 2.0, 0.25) * (1 - seg(lt, 2.45, 0.25));
	m += brain({
		x: 500,
		y: 612,
		s: 0.6,
		rot: -12,
		glasses: true,
		mouth: "smirk",
		arms: [[-150, 0, -215, -110, -105, -150]],
		armsFront: [[150, 10, 235, 30, 222 - 70 * sip, -60 - 20 * sip]],
		extra: drink(f1(222 - 70 * sip), f1(-104 - 20 * sip)),
	});
	m += hammockFabric() + `</g>`;

	// Homework flies from the brain to the robot's pile.
	const N = 9;
	let landed = 0;
	let flying = "";
	for (let i = 0; i < N; i++) {
		const L = 0.22 + i * 0.23;
		const u = (lt - L) / 0.55;
		if (u >= 1) landed++;
		if (u < 0 || u >= 1) continue;
		const e = E.inOut3(u);
		const [x, y] = arc([540, 515], [1080, 200], STACK_TOP(i), e);
		flying += paper(x, y, e * (360 + i * 40), lerp(0.85, 0.7, e), lerp(0.85, 0.7, e) * (u > 0.8 ? 1 - (u - 0.8) * 4 : 1));
	}

	// The robot types like mad behind the laptop.
	const bob = (ph) => 11 * Math.abs(Math.sin(lt * 26 + ph));
	m += robot({
		x: 1420,
		y: 640,
		s: 0.9,
		eyes: "focus",
		blink: blinkAt(lt, 1.7),
		glow: 0.6 + 0.4 * Math.abs(Math.sin(lt * 5)),
		mouth: "flat",
		arms: [
			[-98, -55, -165, 25, -64, -78 - bob(0)],
			[98, -55, 165, 25, 64, -78 - bob(1.3)],
		],
	});
	// Code shavings float up from the keyboard.
	const cols = [FS.blue, FS.yellow, "#6fbf8a", "#f2f4f6"];
	for (let i = 0; i < 30; i++) {
		const t0 = 0.1 + i * 0.09;
		const k = (lt - t0) / 0.9;
		if (k < 0 || k > 1) continue;
		const wdt = 18 + ((i * 29) % 44);
		m += `<rect x="${1345 + ((i * 53) % 150)}" y="${f1(575 - 230 * k)}" width="${wdt}" height="9" rx="4.5" fill="${cols[i % 4]}" opacity="${(1 - k).toFixed(2)}"/>`;
	}
	m += laptop(1) + desk() + paperStack(landed) + flying;
	return m;
}

/** Alone, the brain shrinks, greys and droops; cobwebs grow and its battery runs out. */
function drawDecay(lt) {
	const k = seg(lt, 0.25, 2.3, E.inOut3);
	const s = lerp(1, 0.66, k);
	const y = 860 - 238 * s;
	let m = disc(960, 540, 440, "#23262f") + ground(860, "#15171d");
	m += cobweb(0, 0, 1, seg(lt, 0.9, 1.1)) + cobweb(W, 0, -1, seg(lt, 1.2, 1.1));
	const r = rng(7);
	for (let i = 0; i < 16; i++) {
		const x0 = 520 + r() * 880;
		const sp = 30 + r() * 40;
		const yy = ((r() * 600 + lt * sp) % 640) + 220;
		m += `<circle cx="${f1(x0 + 14 * Math.sin(lt * 2 + i))}" cy="${f1(yy)}" r="${f1(2 + r() * 3)}" fill="rgba(200,204,212,0.35)"/>`;
	}
	m += shadow(960, 862, 170 * s);
	const droop = 20 * k;
	m += brain({
		x: 960,
		y,
		s,
		rot: -6 * k,
		tone: lerp(0, 0.9, k),
		lid: lerp(0.08, 0.62, k),
		look: [0, 0.7 * k],
		brows: k > 0.5 ? "worried" : null,
		mouth: k < 0.3 ? "smile" : k < 0.6 ? "flat" : "frown",
		arms: [
			[-160, 20, -205, 110, -188, 190 + droop],
			[160, 20, 205, 110, 188, 190 + droop],
		],
		legs: [
			[-50, 110, -56, 170, -62, 222],
			[50, 110, 56, 170, 62, 222],
		],
	});
	const level = lerp(1, 0.18, seg(lt, 0.35, 2.1, E.inOut3));
	m += battery(960, 250, level, level < 0.34 && Math.floor(lt * 6) % 2 === 0);
	if (lt > 1.1) {
		const a = (lt - 1.1) * 5;
		m += fly(960 + 230 * s * Math.cos(a), y - 150 * s + 60 * Math.sin(a * 1.4), lt);
	}
	return m;
}

/** The brain presses a barbell overhead and gets buffer with every rep. */
function drawLift(lt) {
	const lift = lt < 0.2 ? 0 : lt < 0.6 ? E.inOut3((lt - 0.2) / 0.4) : lt < 0.75 ? 1 : lt < 1.05 ? 1 - E.inOut3((lt - 0.75) / 0.3) : lt < 1.15 ? 0 : lt < 1.55 ? E.inOut3((lt - 1.15) / 0.4) : 1;
	const buff = 0.15 + 0.4 * seg(lt, 0.45, 0.25) + 0.45 * seg(lt, 1.4, 0.25);
	const s = lerp(0.82, 1.0, buff);
	const y = 880 - 238 * s;
	const done = lt >= 1.6;
	let m = rays(960, 560, lt * 14) + ground(880, "#0f224d") + shadow(960, 882, 190 * s);
	const barY = lerp(-175, -335, lift);
	const arm = (sg) => [sg * 150, -10, sg * lerp(300, 225, lift), lerp(-60, (barY - 10) / 2, lift), sg * 215, barY];
	m += brain({
		x: 960,
		y,
		s,
		sy: 1 - 0.04 * (1 - lift),
		buff,
		eyes: done ? "happy" : "normal",
		lid: done ? 0 : 0.3,
		brows: done ? "up" : "angry",
		mouth: done ? "grin" : "grit",
		arms: [arm(-1), arm(1)],
		legs: [
			[-50, 110, -92, 168, -112, 222],
			[50, 110, 92, 168, 112, 222],
		],
		extra: barbell(barY, [
			{ x: 268, w: 46, h: 190, c: FS.red },
			{ x: 318, w: 38, h: 150, c: FS.blue },
		]),
	});
	for (const peak of [0.6, 1.55]) {
		const d = lt - peak;
		if (d < 0 || d > 0.6) continue;
		for (const sg of [-1, 1])
			for (let j = 0; j < 2; j++) {
				const vx = sg * (260 + j * 120);
				m += sweat(960 + sg * 170 * s + vx * d, y - 120 * s - (300 - j * 80) * d + 900 * d * d, 1.1 - d, sg * 30);
			}
	}
	if (done) {
		const spots = [
			[700, 360],
			[1230, 330],
			[640, 620],
			[1290, 600],
			[820, 230],
			[1110, 210],
		];
		spots.forEach(([x, yy], i) => (m += sparkle(x, yy, backOut(clamp01((lt - 1.6 - i * 0.06) / 0.25)) * (0.9 + 0.2 * Math.sin(lt * 9 + i)), lt * 90 + i * 20)));
	}
	return m;
}

/* ---------------------------------------------------------------------------------------------
 * SAMPLE 2: "But we can point the tool the other way around. We can use AI to load ourselves
 * with a very heavy cognitive load and train our thinking and reasoning in ways that weren't
 * possible in the past."
 * ------------------------------------------------------------------------------------------- */

/** The robot slams the laptop shut and fires the homework back; the brain's shades fly off. */
function drawHandBack(lt) {
	const shock = lt >= 0.35;
	const sway = 2.2 * Math.sin(lt * 2.4) + (shock ? 5 * Math.sin((lt - 0.35) * 14) * Math.exp(-(lt - 0.35) * 2.5) : 0);
	let m = disc(960, 520, 470, "#1f2d58") + ground(860, "#121b38") + hammockPosts();
	m += `<g transform="rotate(${f1(sway)} ${HAMMOCK_PIVOT[0]} ${HAMMOCK_PIVOT[1]})">` + hammockRopes();
	const raise = seg(lt, 0.35, 0.18, backOut);
	m += brain({
		x: 500,
		y: 612,
		s: 0.6,
		rot: -12,
		glasses: !shock,
		eyes: "wide",
		brows: shock ? "up" : null,
		mouth: shock ? "o" : "smirk",
		arms: [[-150, 0, lerp(-215, -230, raise), lerp(-110, -90, raise), lerp(-105, -215, raise), lerp(-150, -170, raise)]],
		armsFront: [[150, 10, lerp(235, 240, raise), lerp(30, -60, raise), lerp(222, 215, raise), lerp(-60, -175, raise)]],
	});
	m += hammockFabric();

	// Papers land in a growing pile on the hammock.
	const N = 9;
	let launched = 0;
	let flying = "";
	let pile = "";
	for (let i = 0; i < N; i++) {
		const L = 0.3 + i * 0.16;
		const u = (lt - L) / 0.5;
		if (u >= 0) launched++;
		if (u >= 1) {
			pile += paper(440 + ((i * 41) % 90), 650 - i * 9, ((i * 67) % 50) - 25, 0.6);
			continue;
		}
		if (u < 0) continue;
		const e = E.inOut3(u);
		const [x, y] = arc(STACK_TOP(N - 1 - i), [1060, 220], [470 + ((i * 41) % 90), 650 - i * 9], e);
		flying += paper(x, y, -e * (360 + i * 50), lerp(0.7, 0.6, e));
	}
	m += pile + `</g>`;

	if (shock) {
		const u = (lt - 0.35) / 0.9;
		if (u < 1)
			m += `<g transform="translate(${f1(495 - 240 * u)} ${f1(600 - 420 * u + 1100 * u * u)}) rotate(${f1(-420 * u)}) scale(0.6)"><g fill="#141418"><rect x="-94" y="-12" width="80" height="50" rx="18"/><rect x="14" y="-12" width="80" height="50" rx="18"/></g><path d="M-14 4Q0 -6 14 4" stroke="#141418" stroke-width="8" fill="none"/></g>`;
	}

	const point = seg(lt, 0.25, 0.25, backOut);
	m += robot({
		x: 1420,
		y: 640,
		s: 0.9,
		eyes: "happy",
		glow: 0.6 + 0.4 * Math.abs(Math.sin(lt * 5)),
		arms: [
			[-98, -55, lerp(-165, -180, point), lerp(25, -80, point), lerp(-64, -270, point), lerp(-78, -120, point)],
			[98, -55, 165, 25, 64, -78],
		],
	});
	m += laptop(1 - seg(lt, 0.1, 0.16)) + desk() + paperStack(N - launched) + flying;
	return m;
}

/** The robot, now a personal trainer, slams plates onto the brain's barbell. */
function drawTrainer(lt) {
	const SLAMS = [0.6, 1.25, 1.9, 2.55];
	const SIDES = [1, -1, 1, -1];
	const COLORS = [FS.red, FS.yellow, FS.red, FS.yellow];
	const added = SLAMS.filter((ts) => lt >= ts).length;
	const buff = 0.35 + 0.16 * added;
	const s = 0.86 + 0.03 * added;
	const bx = 720;
	const by = 860 - 238 * s;
	let dip = 0;
	for (const ts of SLAMS) if (lt >= ts) dip = Math.max(dip, 34 * Math.exp(-(lt - ts) * 9) * Math.abs(Math.cos((lt - ts) * 16)));
	const barY = -310 + dip;

	let m = disc(960, 520, 470, "#1f2d58") + ground(860, "#121b38") + shadow(bx, 862, 190 * s);
	const plates = [{ x: 268, w: 46, h: 180, c: FS.blue }];
	SLAMS.forEach((ts, i) => {
		if (lt < ts) return;
		const nOnSide = SLAMS.slice(0, i).filter((_, j) => SIDES[j] === SIDES[i]).length;
		plates.push({ x: 318 + nOnSide * 44, w: 38, h: 150 - nOnSide * 14, c: COLORS[i], side: SIDES[i] });
	});
	const arm = (sg) => [sg * 150, -10, sg * 228, -150, sg * 215, barY];
	m += brain({
		x: bx,
		y: by,
		s,
		sy: 1 - dip / 400,
		buff,
		lid: 0.3,
		brows: "angry",
		mouth: "grit",
		arms: [arm(-1), arm(1)],
		legs: [
			[-50, 110, -92, 168, -112, 222],
			[50, 110, 92, 168, 112, 222],
		],
		extra: barbell(barY, plates),
	});

	// Robot trainer: headband, whistle, clipboard, and a throwing arm.
	const RX = 1430;
	const RY = 702;
	const RS = 0.85;
	const toWorld = ([lx, ly]) => [RX + lx * RS, RY + ly * RS];
	let next = SLAMS.findIndex((ts) => lt < ts);
	const wind = next >= 0 ? clamp01((lt - (SLAMS[next] - 0.62)) / 0.27) : 0;
	const thrown = next >= 0 ? clamp01((lt - (SLAMS[next] - 0.35)) / 0.12) : 1;
	// Swing from down at its side (holding the plate) up and forward to the release.
	const hand = [lerp(lerp(-150, -185, wind), -250, thrown), lerp(lerp(-40, 60, wind), -130, thrown)];
	const holding = next >= 0 && lt >= SLAMS[next] - 0.62 && lt < SLAMS[next] - 0.35;
	const puff = SLAMS.map((ts) => lt - ts).filter((d) => d >= 0 && d < 0.4);
	let whistle = "";
	for (const d of puff) for (let j = 0; j < 3; j++) whistle += `<circle cx="${f1(70 + d * 260 + j * 18)}" cy="${f1(-160 - d * 120 - j * 14)}" r="${f1(6 + d * 30)}" fill="rgba(255,255,255,${(0.6 * (1 - d / 0.4)).toFixed(2)})"/>`;
	const clip = `<g transform="translate(150 62) rotate(-8)"><rect x="-46" y="-62" width="92" height="124" rx="10" fill="#b07a52"/><rect x="-36" y="-48" width="72" height="100" rx="5" fill="#f2f4f6"/><rect x="-18" y="-70" width="36" height="16" rx="5" fill="#9aa6b8"/><rect x="-24" y="-30" width="48" height="7" rx="3.5" fill="#c3cad6"/><rect x="-24" y="-12" width="40" height="7" rx="3.5" fill="#c3cad6"/><rect x="-24" y="6" width="48" height="7" rx="3.5" fill="#6fbf8a"/></g>`;
	const heldPlate = holding ? `<rect x="${f1(hand[0] - 20)}" y="${f1(hand[1] - 75)}" width="40" height="150" rx="9" fill="${COLORS[next]}"/>` : "";
	m += robot({
		x: RX,
		y: RY,
		s: RS,
		legs: true,
		headband: true,
		whistle: true,
		eyes: "normal",
		blink: blinkAt(lt, 1.6),
		arms: [
			[-98, -55, -170, -60, hand[0], hand[1]],
			[98, -55, 175, 10, 150, 50],
		],
		extra: clip + heldPlate + whistle,
	});

	// Plates in flight, then the impact.
	SLAMS.forEach((ts, i) => {
		const u = (lt - (ts - 0.35)) / 0.35;
		const nOnSide = SLAMS.slice(0, i).filter((_, j) => SIDES[j] === SIDES[i]).length;
		const target = [bx + SIDES[i] * (318 + nOnSide * 44) * s, by + barY * s];
		if (u >= 0 && u < 1) {
			const from = toWorld([-250, -130]);
			const ctrl = SIDES[i] > 0 ? [1180, 120] : [900, -40];
			const [x, y] = arc(from, ctrl, target, u);
			m += `<rect x="${f1(x - 20)}" y="${f1(y - 75)}" width="40" height="150" rx="9" fill="${COLORS[i]}" transform="rotate(${f1(u * 540)} ${f1(x)} ${f1(y)})"/>`;
		}
		const d = lt - ts;
		if (d >= 0 && d < 0.2) {
			const a = 1 - d / 0.2;
			for (const ang of [-40, 0, 40]) {
				const rad = (ang * Math.PI) / 180;
				const ox = SIDES[i] * Math.cos(rad);
				const oy = Math.sin(rad);
				m += `<line x1="${f1(target[0] + ox * 60)}" y1="${f1(target[1] + oy * 60)}" x2="${f1(target[0] + ox * (95 + 40 * (1 - a)))}" y2="${f1(target[1] + oy * (95 + 40 * (1 - a)))}" stroke="${FS.yellow}" stroke-width="8" stroke-linecap="round" opacity="${a.toFixed(2)}"/>`;
			}
		}
		if (d >= 0 && d < 0.55) for (const sg of [-1, 1]) m += sweat(bx + sg * (170 * s + 260 * d), by - 120 * s - 240 * d + 800 * d * d, 1 - d, sg * 30);
	});
	return m;
}

/** A buff brain flexes on a podium; rays, confetti, and the robot clapping. */
function drawPodium(lt) {
	const s = 0.55 + 0.45 * backOut(clamp01(lt / 0.32));
	const land = Math.exp(-Math.max(0, lt - 0.32) * 10);
	const bx = 960;
	const by = 760 - 238 * s;
	const flex = 6 * Math.sin(lt * 8);
	let m = rays(960, 520, lt * 16, 18) + ground(900, "#0f224d");
	const ring = clamp01((lt - 0.3) / 0.7);
	if (ring < 1) m += `<circle cx="${bx}" cy="${f1(by)}" r="${f1(240 + 520 * E.out3(ring))}" fill="none" stroke="${FS.blue}" stroke-width="${f1(14 * (1 - ring))}" opacity="${(1 - ring).toFixed(2)}"/>`;
	m += `<circle cx="${bx}" cy="${f1(by)}" r="${f1(268 + 6 * Math.sin(lt * 6))}" fill="none" stroke="${FS.blue}" stroke-width="8" opacity="0.5"/>`;
	m += `<rect x="740" y="760" width="440" height="140" rx="6" fill="#2b2d42"/><rect x="740" y="760" width="440" height="20" rx="6" fill="${FS.yellow}"/>`;
	m += `<path transform="translate(960 840) scale(1.2)" d="M0 -38L11 -12L39 -12L16 4L25 32L0 15L-25 32L-16 4L-39 -12L-11 -12Z" fill="${FS.yellow}"/>`;
	const arm = (sg) => [sg * 150, -10, sg * 270, -20 - flex, sg * 235, -165 - flex];
	m += brain({
		x: bx,
		y: by,
		s,
		sy: 1 - 0.08 * land,
		buff: 1,
		eyes: "happy",
		brows: "up",
		mouth: "grin",
		arms: [arm(-1), arm(1)],
		legs: [
			[-50, 110, -70, 168, -80, 222],
			[50, 110, 70, 168, 80, 222],
		],
	});
	const spots = [
		[700, 330],
		[1220, 300],
		[620, 560],
		[1300, 540],
		[850, 200],
		[1080, 180],
		[560, 420],
		[1370, 400],
	];
	spots.forEach(([x, y], i) => (m += sparkle(x, y, backOut(clamp01((lt - 0.35 - i * 0.07) / 0.25)) * (0.8 + 0.25 * Math.sin(lt * 10 + i)), lt * 120 + i * 25, i % 3 ? FS.yellow : "#f2f4f6")));
	const clap = Math.abs(Math.sin(lt * 13));
	m += robot({
		x: 1580,
		y: 900 - 186 * 0.8,
		s: 0.8,
		legs: true,
		eyes: "happy",
		arms: [
			[-98, -55, -150, 10, -40 - 70 * clap, -40],
			[98, -55, 150, 10, 40 + 70 * clap, -40],
		],
	});
	const r = rng(99);
	const CONF = [FS.red, FS.yellow, FS.blue, "#6fbf8a", "#f2f4f6"];
	for (let i = 0; i < 70; i++) {
		const x0 = r() * W;
		const delay = r() * 0.9;
		const speed = 380 + r() * 380;
		const d = lt - 0.2 - delay;
		if (d < 0) continue;
		const y = -40 + speed * d;
		if (y > H + 40) continue;
		m += `<rect x="-9" y="-5" width="18" height="10" rx="2" fill="${CONF[i % 5]}" transform="translate(${f1(x0 + 40 * Math.sin(d * 3 + i))} ${f1(y)}) rotate(${f1(d * 360 * (r() > 0.5 ? 1 : -1) + i * 30)})"/>`;
	}
	return m;
}

const sample1 = cutScene("sample-1-smarter-or-dumber", [
	card(1.2, [[{ t: "Does", at: 0.02 }, { t: "AI", at: 0.14, c: "blue" }, { t: "make", at: 0.26 }, { t: "people", at: 0.38 }]], { size: 150 }),
	card(
		1.5,
		[
			[{ t: "smarter", at: 0.02, c: "blue", size: 230 }],
			[
				{ t: "or", at: 0.42, c: "dim", size: 120 },
				{ t: "dumber?", at: 0.55, c: "red", size: 230, shake: true },
			],
		],
		{ flash: true },
	),
	art(2.8, "#182447", drawOutsource, { flash: true, zoom: [1.2, 960, 680] }),
	art(3.0, "#1b1d25", drawDecay, { zoom: [1.15, 960, 640] }),
	card(
		1.8,
		[
			[{ t: "The", at: 0.02 }, { t: "hard", at: 0.12 }, { t: "thing", at: 0.22 }],
			[{ t: "BUILDS", at: 0.45, c: "hl", size: 220, shake: true }],
			[{ t: "the", at: 0.78 }, { t: "capacity.", at: 0.88 }],
		],
		{ size: 130, flash: true },
	),
	art(2.8, "#14306b", drawLift, { flash: true }),
]);

const sample2 = cutScene("sample-2-load-your-brain", [
	card(1.1, [[{ t: "Point", at: 0.02 }, { t: "it", at: 0.12 }, { t: "the", at: 0.2 }], [{ t: "OTHER WAY.", at: 0.38, c: "hl", size: 200, shake: true }]], { size: 140 }),
	art(2.6, "#182447", drawHandBack, { flash: true, zoom: [1.2, 960, 680] }),
	card(
		1.6,
		[
			[{ t: "Use", at: 0.02 }, { t: "AI", at: 0.12, c: "blue" }, { t: "to", at: 0.22 }],
			[{ t: "LOAD", at: 0.42, c: "hl", size: 260, shake: true }],
			[{ t: "your", at: 0.8 }, { t: "brain.", at: 0.9 }],
		],
		{ size: 130, flash: true },
	),
	art(3.2, "#182447", drawTrainer, { flash: true, zoom: [1.1, 960, 600] }),
	card(
		1.8,
		[
			[{ t: "Train", at: 0.02 }, { t: "your", at: 0.12 }, { t: "reasoning", at: 0.22 }],
			[{ t: "like", at: 0.55 }, { t: "never", at: 0.68, c: "blue" }, { t: "before.", at: 0.8, c: "blue" }],
		],
		{ size: 140, flash: true },
	),
	art(2.6, "#14306b", drawPodium, { flash: true }),
]);

SCENES.push(sample1, sample2);
