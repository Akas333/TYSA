"use strict";
/*
 * The full video, as four section scenes timed to Eric's takes (out/vo/*-eric.json):
 *   film-1-hook · film-2-mindbuilding · film-3-problem · film-4-demo
 * Explainer shots follow EXPLAINER-STYLE.md (plain canvas, TYSA components, app fonts and colours,
 * still camera). Meme cut-ins reuse the cartoon brain and robot from samples.js. The hook opens
 * with the four storyboard shots from hook.js, and the demo embeds the probe explainer.
 * The demo shots are component stand-ins; swap them for real screen recordings when you have them.
 */
(() => {
	const C = { bg: "#111112", fg: "#f2f4f6", card: "#1f1f22", muted: "#9fa4ab", accent: "#2b2c30", border: "#2e3034", input: "#3a3c41", field: "#19191b", primary: "#0064e0", soft: "#4ca3ff", ok: "#5fb39a", okSoft: "#6fbf8a", miss: "#d9776f", warn: "#d9905e", mid: "#cfb05a" };
	const MONO_F = "JetBrains Mono";

	// The logo is an image, so the renderer waits for it along with the fonts.
	const LOGO = "assets/logo.png";
	(window.PRELOAD ??= []).push(
		new Promise((resolve) => {
			const img = new Image();
			img.onload = img.onerror = resolve;
			img.src = LOGO;
		}),
	);

	/* --- building blocks ----------------------------------------------------------------------- */

	const div = (style, parent, html) => el("div", style, parent, html);
	const abs = (x, y, w, extra = {}) => ({ position: "absolute", left: `${x}px`, top: `${y}px`, ...(w ? { width: `${w}px` } : {}), ...extra });
	const font = (size, weight = 500, color = C.fg, extra = {}) => ({ fontFamily: "Figtree", fontSize: `${size}px`, fontWeight: String(weight), color, ...extra });

	/** Fades a node in at `at` (seconds into the shot), rising a little. */
	function show(node, lt, at, dur = 0.35, rise = 16) {
		const a = seg(lt, at, dur);
		node.style.opacity = a.toFixed(3);
		node.style.transform = `translateY(${f1(rise * (1 - a))}px)`;
		return a;
	}

	const cardStyle = { background: C.card, border: `2px solid ${C.border}`, borderRadius: "26px", boxSizing: "border-box" };
	const pillStyle = (tone = "neutral") =>
		({
			neutral: { border: `2px solid ${C.border}`, background: C.card, color: C.fg },
			primary: { border: "2px solid rgba(0,100,224,0.5)", background: "rgba(0,100,224,0.14)", color: C.soft },
			ok: { border: "2px solid rgba(95,179,154,0.5)", background: "rgba(95,179,154,0.12)", color: C.fg },
			miss: { border: "2px solid rgba(217,119,111,0.55)", background: "rgba(217,119,111,0.12)", color: C.fg },
			dashed: { border: `2px dashed ${C.input}`, background: "transparent", color: C.muted },
		})[tone];

	/** A concept-marker pill: optional badge, then text. */
	function pill(parent, text, { tone = "neutral", badge = null, badgeColor = C.accent, size = 24, x = null, y = null, w = null } = {}) {
		const p = div({ display: "inline-flex", alignItems: "center", gap: "14px", borderRadius: "999px", padding: badge ? "6px 22px 6px 6px" : "8px 22px", boxSizing: "border-box", ...font(size), ...pillStyle(tone), whiteSpace: "nowrap", opacity: "0" }, parent);
		if (x != null) Object.assign(p.style, abs(x, y, w));
		let b = null;
		if (badge != null) b = el("span", { width: `${size + 16}px`, height: `${size + 16}px`, borderRadius: "50%", background: badgeColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: `${size - 6}px`, fontWeight: "600", flex: "none" }, p, badge);
		const label = el("span", {}, p, text);
		p.badge = b;
		p.label = label;
		return p;
	}

	/** The phase divider: dotted rule, pill, dotted rule. */
	function divider(parent, text, y, { spinner = false, tone = "neutral" } = {}) {
		const wrap = div({ ...abs(190, y, 1540), display: "flex", alignItems: "center", gap: "24px", opacity: "0" }, parent);
		const rule = () => div({ flex: "1", height: "0", borderTop: `3px dotted ${tone === "primary" ? C.soft : C.border}` }, wrap);
		rule();
		const p = div({ display: "flex", alignItems: "center", gap: "14px", borderRadius: "999px", padding: "10px 26px", ...font(28, 500, tone === "primary" ? C.soft : C.muted), ...(tone === "primary" ? pillStyle("primary") : { border: `2px solid ${C.border}` }) }, wrap);
		wrap.spin = spinner ? el("span", { fontFamily: MONO_F, color: C.soft }, p) : null;
		el("span", {}, p, text);
		rule();
		return wrap;
	}
	const spinTo = (wrap, lt) => wrap.spin && (wrap.spin.textContent = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"[Math.floor(lt / 0.08) % 10]);

	/** A shot: build(root) returns draw(lt), where lt is seconds since the shot started. */
	const shot = (build) => ({ build });

	/** A section scene: shots placed at voice-take times, after a lead-in. */
	function section(id, lead, voiceDur, shots) {
		const dur = +(lead + voiceDur + 0.25).toFixed(2);
		return {
			id,
			dur,
			push: false,
			build(root) {
				root.style.background = C.bg;
				const built = shots.map(([t, s]) => {
					const r = div({ position: "absolute", inset: "0", display: "none", overflow: "hidden", background: C.bg }, root);
					return { start: Math.max(0, lead + t), r, draw: s.build(r) };
				});
				return (t) => {
					let k = 0;
					while (k < built.length - 1 && t >= built[k + 1].start) k++;
					built.forEach((b, i) => (b.r.style.display = i === k ? "block" : "none"));
					built[k].draw(t - built[k].start);
				};
			},
		};
	}

	/** Embeds another scene as a shot, starting `offset` seconds into it. */
	const embed = (scene, offset = 0) => shot((r) => ((d) => (lt) => d(Math.min(scene.dur - 1e-3, lt + offset)))(scene.build(r)));

	/** A cartoon meme cut-in (samples.js art), drawn full-frame. */
	const meme = (bg, draw, zoom) => shot((r) => art(0, bg, draw, { zoom }).build(r));

	/** A big caps title card. Words rise in one after another; `hl` words are primary blue. */
	const title = (lines, { size = 120, hl = [] } = {}) =>
		shot((r) => {
			const box = div({ position: "absolute", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }, r);
			const words = [];
			for (const line of lines) {
				const row = div({ display: "flex", gap: "0.28em", ...font(size, 900, C.fg, { letterSpacing: "-0.01em", lineHeight: "1.08" }) }, box);
				for (const w of line.split(" ")) words.push(el("span", { display: "inline-block", opacity: "0", color: hl.includes(w) ? C.soft : C.fg }, row, escapeHtml(w)));
			}
			return (lt) => words.forEach((w, i) => show(w, lt, 0.05 + i * 0.07, 0.25, 20));
		});

	/* --- 1 · hook ----------------------------------------------------------------------------- */

	/** The study, as an app card. */
	const paper = (venue, name, authors, facts) =>
		shot((r) => {
			const c = div({ ...abs(410, 250, 1100), ...cardStyle, padding: "44px 52px", opacity: "0" }, r);
			const v = pill(c, venue, { tone: "primary", size: 22 });
			Object.assign(v.style, { opacity: "1", marginBottom: "26px", fontFamily: MONO_F });
			div(font(46, 600, C.fg, { lineHeight: "1.25" }), c, escapeHtml(name));
			div(font(26, 400, C.muted, { marginTop: "14px" }), c, escapeHtml(authors));
			div({ height: "0", borderTop: `2px dotted ${C.border}`, margin: "34px 0 26px" }, c);
			const rows = facts.map((f) => pill(div({ marginBottom: "14px" }, c), f, { badge: "●", badgeColor: C.primary, size: 24 }));
			return (lt) => {
				show(c, lt, 0, 0.4, 24);
				rows.forEach((p, i) => show(p, lt, 0.6 + i * 0.5));
			};
		});

	/** The study's results: diverging bars against students who never had AI. */
	function results(revealAt) {
		const ROWS = [
			{ label: "Practice, with ChatGPT", value: "+48%", frac: 0.48, col: C.ok },
			{ label: "Exam, once the AI was taken away", value: "−17%", frac: -0.17, col: C.miss },
			{ label: "Exam, with a hint-only tutor", value: "≈ no drop", frac: -0.015, col: C.okSoft },
		];
		return shot((r) => {
			const c = div({ ...abs(260, 200, 1400), ...cardStyle, padding: "44px 52px" }, r);
			div({ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "40px" }, c, `<span style="${css(font(34, 600))}">Compared with students who never had AI</span><span style="${css(font(20, 400, C.muted, { fontFamily: MONO_F }))}">Bastani et al. · PNAS 2025</span>`);
			const rows = ROWS.map((row) => {
				const line = div({ display: "grid", gridTemplateColumns: "430px 1fr 240px", alignItems: "center", gap: "28px", marginBottom: "34px", opacity: "0" }, c);
				div(font(26, 500), line, row.label);
				const rail = div({ position: "relative", height: "34px", borderRadius: "10px", background: "#141414", border: `2px solid ${C.border}` }, line);
				div({ position: "absolute", left: "50%", top: "-10px", bottom: "-10px", width: "2px", background: C.muted }, rail);
				const fill = div({ position: "absolute", top: "0", bottom: "0", borderRadius: "8px", background: row.col }, rail);
				const val = div(font(40, 800, row.col, { fontFamily: MONO_F, textAlign: "right", whiteSpace: "nowrap" }), line, row.value);
				return { line, fill, val, row };
			});
			return (lt) =>
				rows.forEach(({ line, fill, row }, i) => {
					show(line, lt, revealAt[i] ?? 99, 0.3, 10);
					const g = seg(lt, (revealAt[i] ?? 99) + 0.15, 0.6, E.out3) * Math.abs(row.frac) * 50 * 1.6;
					Object.assign(fill.style, row.frac >= 0 ? { left: "50%", width: `${f1(g)}%` } : { right: "50%", width: `${f1(Math.max(g, 0.6))}%` });
				});
		});
	}
	const css = (o) =>
		Object.entries(o)
			.map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`)
			.join(";");

	/** Meme: the brain on the couch with chips while the robot does the lifting. */
	function drawCouch(lt) {
		let m = disc(960, 540, 470, "#1f2d58") + ground(860, "#121b38");
		m += `<rect x="330" y="560" width="620" height="200" rx="40" fill="#5b3f8c"/><rect x="300" y="700" width="680" height="120" rx="30" fill="#6d4ea3"/><rect x="270" y="640" width="90" height="190" rx="36" fill="#7a5bb3"/><rect x="920" y="640" width="90" height="190" rx="36" fill="#7a5bb3"/><rect x="330" y="820" width="30" height="40" fill="#3a2a5a"/><rect x="920" y="820" width="30" height="40" fill="#3a2a5a"/>`;
		const munch = Math.abs(Math.sin(lt * 7));
		const bag = `<g transform="translate(205 -40) rotate(12)"><path d="M-48 -70L48 -70L56 70L-56 70Z" fill="#ff8c1a"/><path d="M-48 -70L48 -70L44 -50L-44 -50Z" fill="#ffd23f"/><circle cx="0" cy="8" r="26" fill="#ffd23f"/></g>`;
		m += brain({ x: 640, y: 640, s: 0.62, rot: -10, glasses: true, mouth: munch > 0.5 ? "o" : "smirk", arms: [[-150, 0, -230, 60, -170, 120]], armsFront: [[150, 10, 220, 20, 190, -10 - 50 * munch]], extra: bag });
		for (let i = 0; i < 6; i++) {
			const k = (lt * 1.2 + i / 6) % 1;
			m += `<path transform="translate(${f1(760 + 40 * Math.sin(i * 2 + k * 6))} ${f1(560 - 160 * k)}) rotate(${f1(k * 300 + i * 40)})" d="M0 -14L13 9L-13 9Z" fill="#ffb02e" opacity="${(1 - k).toFixed(2)}"/>`;
		}
		const lift = Math.abs(Math.sin(lt * 3.2));
		const y = -330 + 60 * (1 - lift);
		const plates = [
			{ x: 300, w: 44, h: 170, c: "#4ca3ff" },
			{ x: 352, w: 36, h: 130, c: "#ff5a4e" },
		];
		m += robot({ x: 1460, y: 660, s: 0.78, legs: true, eyes: "focus", mouth: "flat", headband: true, arms: [[-98, -55, -220, -120, -150, y], [98, -55, 220, -120, 150, y]], extra: barbell(y, plates) + sweat(-140, -250 + 20 * lift, 1.2) + sweat(150, -230, 1) });
		return m;
	}

	/** Meme: a speedrun timer for losing the ability to think. */
	const speedrun = shot((r) => {
		const c = div({ ...abs(560, 150, 800), ...cardStyle, padding: "34px 40px", fontFamily: MONO_F }, r);
		div({ display: "flex", justifyContent: "space-between", alignItems: "center", ...font(26, 600, C.fg, { fontFamily: MONO_F }) }, c, `<span>HUMAN MIND · ANY%</span><span style="color:${C.ok};font-size:20px;border:2px solid rgba(95,179,154,.5);border-radius:999px;padding:4px 14px">WR PACE</span>`);
		const timer = div(font(120, 700, C.ok, { fontFamily: MONO_F, margin: "18px 0 22px", letterSpacing: "-0.03em" }), c);
		const SPLITS = [
			["Outsourced the homework", "−0:12"],
			["Stopped reading the docs", "−0:31"],
			["Forgot long division", "−1:04"],
			["Thinking field: empty", "−2:18"],
		];
		const rows = SPLITS.map(([a, b]) => div({ display: "flex", justifyContent: "space-between", padding: "14px 0", borderTop: `2px solid ${C.border}`, ...font(26, 500, C.fg, { fontFamily: MONO_F }), opacity: "0" }, c, `<span>${a}</span><span style="color:${C.ok}">${b}</span>`));
		return (lt) => {
			const s = lt * 9.7 + 31.4;
			timer.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
			rows.forEach((row, i) => show(row, lt, 0.25 + i * 0.55, 0.25, 8));
		};
	});

	const hook = section("film-1-hook", 0.35, 35.89, [
		[-0.35, embed(SCENES.find((s) => s.id === "hook-1-experiment"))],
		[4.74, embed(SCENES.find((s) => s.id === "hook-2-outsource"))],
		[7.15, embed(SCENES.find((s) => s.id === "hook-3-gpu-cluster"))],
		[9.98, embed(SCENES.find((s) => s.id === "hook-4-results"))],
		[11.32, paper("PNAS · 2025", "Generative AI without guardrails can harm learning", "Bastani, Bastani, Sungu, Ge, Kabakcı, Mariman", ["~1,000 high-school students", "Math practice with a ChatGPT-style tutor", "Then an exam, without the AI"])],
		[16.79, results([0, 2.0])],
		[25.37, title(["THE STRUGGLE IS THE", "TRAINING SIGNAL."], { hl: ["STRUGGLE"] })],
		[27.23, meme("#182447", drawCouch, [1.08, 960, 660])],
		[32.54, speedrun],
	]);

	/* --- 2 · mindbuilding --------------------------------------------------------------------- */

	/** The Industrial Revolution, as pills: labour that machines took over. */
	const machines = shot((r) => {
		const d = divider(r, "1800s · the Industrial Revolution", 170);
		const JOBS = ["Hauling", "Ploughing", "Building", "Weaving", "Carrying water"];
		const rows = JOBS.map((j, i) => pill(r, j, { badge: String(i + 1), x: 560, y: 300 + i * 104, w: 800, size: 28 }));
		return (lt) => {
			show(d, lt, 0, 0.35, 0);
			rows.forEach((p, i) => {
				show(p, lt, 0.2 + i * 0.12);
				const gone = lt > 1.2 + i * 0.18;
				Object.assign(p.style, pillStyle(gone ? "dashed" : "neutral"));
				p.badge.style.background = gone ? C.input : C.accent;
				p.badge.textContent = gone ? "⚙" : String(i + 1);
				p.label.textContent = gone ? `${JOBS[i]} · machines do it now` : JOBS[i];
			});
		};
	});

	/** Progressive overload: the weight climbs as a ladder of checked pills. */
	const overload = shot((r) => {
		const d = divider(r, "Struggle, on purpose", 150, { tone: "primary" });
		const STEPS = ["Week 1 · 40 kg", "Week 4 · 60 kg", "Week 8 · 80 kg", "Week 12 · 100 kg"];
		const rows = STEPS.map((s, i) => pill(r, s, { badge: "✓", badgeColor: C.ok, tone: "ok", x: 420 + i * 300, y: 820 - i * 150, w: 380, size: 26 }));
		const lbl = pill(r, "Progressive overload", { tone: "primary", x: 220, y: 300, size: 26 });
		return (lt) => {
			show(d, lt, 0, 0.35, 0);
			rows.forEach((p, i) => show(p, lt, 0.2 + i * 0.35));
			show(lbl, lt, 1.8);
		};
	});

	/** Chess: the engine card, and human play quality rising after engines arrive. */
	const chess = shot((r) => {
		const eng = div({ ...abs(200, 260, 640), ...cardStyle, padding: "34px 40px", opacity: "0" }, r);
		div(font(20, 500, C.muted), eng, "Engine analysis");
		div(font(44, 700, C.fg, { fontFamily: MONO_F, margin: "14px 0 24px" }), eng, "Best: Nf3 · +0.8");
		const bar = div({ position: "relative", height: "26px", borderRadius: "8px", background: "#2a2b2f", overflow: "hidden" }, eng);
		const evalFill = div({ position: "absolute", left: "0", top: "0", bottom: "0", background: C.fg }, bar);
		const lines = ["1. Nf3  d5", "2. g3  Nf6", "3. Bg2  c6"].map((l) => div(font(26, 500, C.muted, { fontFamily: MONO_F, marginTop: "16px" }), eng, l));
		const chart = div({ ...abs(920, 260, 800), ...cardStyle, padding: "34px 40px", height: "560px", opacity: "0" }, r);
		div(font(20, 500, C.muted), chart, "Grandmaster play quality");
		const svg = svgLayer(chart);
		Object.assign(svg.style, { left: "0", top: "0" });
		svg.setAttribute("viewBox", "0 0 800 560");
		svg.setAttribute("width", "800");
		svg.setAttribute("height", "560");
		const gym = pill(r, "Engines as gym equipment", { tone: "primary", x: 1080, y: 860, size: 26 });
		const P = [];
		for (let i = 0; i <= 40; i++) {
			const u = i / 40;
			P.push([60 + u * 680, 470 - (u < 0.45 ? 60 * u : 27 + 330 * (u - 0.45) ** 1.2) - 8 * Math.sin(i * 1.7)]);
		}
		return (lt) => {
			show(eng, lt, 0, 0.4);
			show(chart, lt, 0.3, 0.4);
			evalFill.style.width = `${f1(50 + 12 * seg(lt, 0.6, 0.8, E.out3))}%`;
			lines.forEach((l, i) => show(l, lt, 0.5 + i * 0.25, 0.25, 6));
			const k = seg(lt, 0.7, 2.6, E.inOut3);
			const n = Math.max(2, Math.round(k * (P.length - 1)) + 1);
			const pts = P.slice(0, n).map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
			const mk = 60 + 0.45 * 680;
			svg.innerHTML =
				`<line x1="60" y1="480" x2="740" y2="480" stroke="${C.border}" stroke-width="3"/>` +
				`<line x1="${mk}" y1="90" x2="${mk}" y2="480" stroke="${C.soft}" stroke-width="3" stroke-dasharray="4 8" opacity="${seg(lt, 1.6, 0.3).toFixed(2)}"/>` +
				`<text x="${mk + 12}" y="112" font-family="Figtree" font-size="22" fill="${C.soft}" opacity="${seg(lt, 1.6, 0.3).toFixed(2)}">Engines beat humans</text>` +
				`<polyline points="${pts}" fill="none" stroke="${C.ok}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
			show(gym, lt, 3.67);
		};
	});

	const mindbuilding = section("film-2-mindbuilding", 0.2, 37.69, [
		[0, results([0, 0, 2.6])],
		[6.4, meme("#182447", drawHandBack, [1.2, 960, 680])],
		[8.79, machines],
		[11.6, meme("#14306b", drawLift)],
		[19.52, overload],
		[22.94, title(["NOW IT'S HAPPENING", "TO REASONING."], { hl: ["REASONING."] })],
		[25.01, chess],
		[32.67, meme("#182447", drawTrainer, [1.1, 960, 600])],
	]);

	/* --- 3 · problem -------------------------------------------------------------------------- */

	/** Meme, two-panel approve/reject format, with the brain as the judge. */
	const forklift = shot((r) => {
		const panel = (y, face, text, icon) => {
			const row = div({ ...abs(240, y, 1440), height: "380px", display: "flex", ...cardStyle, overflow: "hidden", opacity: "0" }, r);
			const pic = div({ width: "460px", height: "100%", background: "#182447", position: "relative" }, row);
			const s = svgLayer(pic);
			s.setAttribute("viewBox", "0 0 460 380");
			s.setAttribute("width", "460");
			s.setAttribute("height", "380");
			s.innerHTML = face;
			div({ flex: "1", display: "flex", alignItems: "center", gap: "40px", padding: "0 60px", ...font(44, 700) }, row, `${icon}<span>${text}</span>`);
			return row;
		};
		const nope = brain({ x: 230, y: 200, s: 0.62, eyes: "normal", lid: 0.4, brows: "angry", mouth: "frown", arms: [[-150, 0, -230, -60, -200, -130]], armsFront: [[150, 10, 250, -40, 260, -60]], extra: `<rect x="230" y="-110" width="70" height="90" rx="20" fill="#f585ae"/>` });
		const yes = brain({ x: 230, y: 200, s: 0.62, eyes: "happy", brows: "up", mouth: "grin", armsFront: [[150, 10, 250, 0, 300, -20]], extra: `<circle cx="318" cy="-24" r="22" fill="#f585ae"/><rect x="306" y="-40" width="60" height="16" rx="8" fill="#f585ae"/>` });
		const forkIcon = `<svg width="130" height="110" viewBox="0 0 130 110" fill="none" stroke="${C.fg}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="40" width="60" height="40" rx="6"/><path d="M70 80h20M95 10v80h30M20 40V20h30l10 20"/><circle cx="25" cy="92" r="10"/><circle cx="60" cy="92" r="10"/></svg>`;
		const rackIcon = `<svg width="130" height="110" viewBox="0 0 130 110" fill="none" stroke="${C.fg}" stroke-width="7" stroke-linecap="round"><path d="M25 10v95M105 10v95M10 40h110"/><rect x="2" y="26" width="14" height="28" rx="3" fill="${C.soft}" stroke="none"/><rect x="114" y="26" width="14" height="28" rx="3" fill="${C.soft}" stroke="none"/></svg>`;
		const a = panel(120, nope, `AI that does the lifting <span style="color:${C.muted};font-weight:500">(a forklift)</span>`, forkIcon);
		const b = panel(560, yes, `AI that loads the bar <span style="color:${C.soft};font-weight:500">(a squat rack)</span>`, rackIcon);
		return (lt) => {
			show(a, lt, 0, 0.35);
			show(b, lt, 2.71, 0.35);
		};
	});

	/** Chat bubbles: an LLM tutor leaking the answer, then grading a right method as wrong. */
	const leak = shot((r) => {
		const bubble = (x, y, w, text, mine) => div({ ...abs(x, y, w), padding: "22px 28px", borderRadius: "24px", background: mine ? "#2a2b2f" : C.card, border: `2px solid ${C.border}`, ...font(28, 500), lineHeight: "1.4", opacity: "0" }, r, text);
		const q1 = bubble(1040, 150, 640, "Can I get a hint for Q3? Don't tell me the answer.", true);
		const a1 = bubble(240, 300, 900, "Sure! The answer is <b>x = 4</b>, because you subtract 3 from both sides and divide by 2.", false);
		const t1 = pill(r, "Leaked the answer", { badge: "✕", badgeColor: C.miss, tone: "miss", x: 240, y: 470, size: 24 });
		const q2 = bubble(1040, 560, 640, "I divided by 2 first, then subtracted 1.5. Is that right?", true);
		const a2 = bubble(240, 710, 900, "That's not quite right. You should always subtract first.", false);
		const t2 = pill(r, "Flawed feedback: the method was fine", { badge: "✕", badgeColor: C.miss, tone: "miss", x: 240, y: 840, size: 24 });
		const src = div({ ...abs(1240, 1000, 440), ...font(20, 400, C.muted, { fontFamily: MONO_F, textAlign: "right" }), opacity: "0" }, r, "Macina et al. · MathDial · EMNLP 2023");
		return (lt) => {
			show(q1, lt, 0);
			show(a1, lt, 0.5);
			show(t1, lt, 1.1);
			show(q2, lt, 1.6);
			show(a2, lt, 2.0);
			show(t2, lt, 2.36);
			show(src, lt, 0.4);
		};
	});

	/** Many courses tangled with many learners. */
	const manyToMany = shot((r) => {
		const d = divider(r, "many-to-many", 110);
		const COURSES = ["Course A", "Textbook B", "Lecture C", "Tutorial D", "MOOC E"];
		const cs = COURSES.map((t, i) => pill(r, t, { badge: String(i + 1), x: 220, y: 240 + i * 150, w: 360, size: 24 }));
		const lines = svgLayer(r);
		const learners = Array.from({ length: 9 }, (_, i) => [1500 + (i % 2) * 120, 230 + i * 85]);
		return (lt) => {
			show(d, lt, 0, 0.3, 0);
			cs.forEach((p, i) => show(p, lt, 0.1 + i * 0.08));
			let m = "";
			const k = seg(lt, 0.5, 1.2);
			COURSES.forEach((_, i) =>
				learners.forEach(([x, y], j) => {
					const u = clamp01(k * 1.6 - (i + j) * 0.04);
					if (u <= 0) return;
					const x0 = 590;
					const y0 = 268 + i * 150;
					m += `<path d="M${x0} ${y0}C${x0 + 400} ${y0} ${x - 400} ${y} ${f1(lerp(x0, x, u))} ${f1(lerp(y0, y, u))}" fill="none" stroke="${C.border}" stroke-width="2"/>`;
				}),
			);
			learners.forEach(([x, y], j) => (m += `<circle cx="${x}" cy="${y}" r="${f1(16 * seg(lt, 0.2 + j * 0.05, 0.25))}" fill="${C.fg}"/>`));
			lines.innerHTML = m;
		};
	});

	/** One course, one pace, a million people: the pace rail with too slow and too fast. */
	const pace = shot((r) => {
		const course = div({ ...abs(660, 120, 600), ...cardStyle, padding: "26px 34px", textAlign: "center", opacity: "0" }, r, `<div style="${css(font(20, 500, C.muted))}">One course</div><div style="${css(font(36, 700))};margin-top:6px">Physics 101 · one pace</div>`);
		const dots = svgLayer(r);
		const rail = div({ ...abs(360, 860, 1200), height: "16px", borderRadius: "10px", background: "#141414", border: `2px solid ${C.border}`, opacity: "0" }, r);
		const mark = div({ position: "absolute", left: "50%", top: "-14px", width: "6px", height: "40px", borderRadius: "3px", background: C.soft }, rail);
		const slow = pill(r, "Too slow for some", { tone: "miss", badge: "✕", badgeColor: C.miss, x: 300, y: 930, size: 24 });
		const fast = pill(r, "Too fast for others", { tone: "miss", badge: "✕", badgeColor: C.miss, x: 1300, y: 930, size: 24 });
		const rr = rng(8);
		const people = Array.from({ length: 140 }, () => [400 + rr() * 1120, 330 + rr() * 430, rr()]);
		return (lt) => {
			show(course, lt, 0, 0.35);
			show(rail, lt, 0.4, 0.3, 0);
			mark.style.left = "50%";
			let m = "";
			people.forEach(([x, y, f], i) => {
				const a = seg(lt, 0.2 + i * 0.006, 0.2);
				const col = lt > 1.9 && f < 0.3 ? C.miss : lt > 3.14 && f > 0.7 ? C.warn : C.fg;
				m += `<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${col}" opacity="${a.toFixed(2)}"/>`;
			});
			dots.innerHTML = m;
			show(slow, lt, 1.9);
			show(fast, lt, 3.14);
		};
	});

	/** Too many sources: tabs, a random post, clashing notation, and a mental-RAM meter. */
	const sources = shot((r) => {
		const tab = (x, y, w, head, body, at) => {
			const c = div({ ...abs(x, y, w), ...cardStyle, padding: "22px 28px", opacity: "0" }, r, `<div style="${css(font(18, 500, C.muted))}">${head}</div><div style="${css(font(26, 500))};margin-top:8px;line-height:1.4">${body}</div>`);
			c.at = at;
			return c;
		};
		const cards = [
			tab(160, 120, 560, "Textbook · chapter 4", "Scattering cross-section σ ∝ ν⁴", 0),
			tab(780, 90, 520, "Docs", "Intensity I(λ) ∝ λ⁻⁴", 1.3),
			tab(1360, 150, 420, "random guy on X", "actually it's just the ozone 🙂 trust me", 2.58),
			tab(240, 470, 520, "Lecture notes", "frequency f, wavelength λ, c = fλ", 0.6),
			tab(820, 430, 520, "Forum answer · 3 years old", "It's Mie scattering (it isn't)", 2.0),
		];
		const nota = pill(r, "λ vs ν vs f: same idea, three notations", { tone: "miss", badge: "?", badgeColor: C.warn, x: 380, y: 720, size: 26 });
		const ram = div({ ...abs(1380, 640, 400), ...cardStyle, padding: "26px 30px", opacity: "0" }, r);
		div({ display: "flex", justifyContent: "space-between", ...font(22, 600) }, ram, `<span>Mental RAM</span>`);
		const rv = div(font(22, 600, C.warn, { fontFamily: MONO_F, marginTop: "-28px", textAlign: "right" }), ram, "0%");
		const rail = div({ position: "relative", height: "22px", borderRadius: "8px", background: "#141414", border: `2px solid ${C.border}`, marginTop: "18px" }, ram);
		const fill = div({ position: "absolute", left: "0", top: "0", bottom: "0", borderRadius: "6px", background: C.warn }, rail);
		const ramNote = div(font(20, 500, C.muted, { marginTop: "14px" }), ram, "spent on notation and who to trust");
		return (lt) => {
			cards.forEach((c) => show(c, lt, c.at));
			show(nota, lt, 5.74);
			show(ram, lt, 4.18);
			const v = 50 * seg(lt, 4.3, 1.4, E.out3);
			fill.style.width = `${f1(v)}%`;
			rv.textContent = `${Math.round(v)}%`;
			show(ramNote, lt, 5.0, 0.3, 0);
		};
	});

	const problem = section("film-3-problem", 0.2, 25.03, [
		[0, forklift],
		[5.29, leak],
		[9.35, manyToMany],
		[12.34, pace],
		[17.04, sources],
	]);

	/* --- 4 · demo ----------------------------------------------------------------------------- */

	/** The logo, the name and the Muse models it runs on. */
	const intro = (end = false) =>
		shot((r) => {
			const img = el("img", { ...abs(860, end ? 230 : 200, 200), height: "auto", opacity: "0" }, r);
			img.src = LOGO;
			const name = div({ ...abs(0, end ? 470 : 440, W), textAlign: "center", ...font(54, 700), opacity: "0" }, r, end ? "Teach Yourself Anything" : "TYSA · Teach Yourself Anything");
			const tag = div({ ...abs(0, end ? 550 : 520, W), textAlign: "center", ...font(28, 500, C.muted), opacity: "0" }, r, end ? "Built on Meta's Muse models" : "An agentic learning harness");
			const row = div({ ...abs(0, 660, W), display: "flex", justifyContent: "center", gap: "28px" }, r);
			const models = ["Muse Spark", "Muse Spark Contributor", "Muse Voice Transcribe"].map((t) => pill(row, t, { tone: "primary", badge: "●", badgeColor: C.primary, size: 24 }));
			return (lt) => {
				show(img, lt, 0, 0.4, 0);
				show(name, lt, 0.25);
				show(tag, lt, 0.5);
				if (!end) models.forEach((p, i) => show(p, lt, 2.26 + i * 0.15));
			};
		});

	/** Coding harness vs learning harness: same agent, different system being acted on. */
	const harness = shot((r) => {
		const row = (y, target, targetBody, at) => {
			const a = div({ ...abs(260, y, 420), ...cardStyle, padding: "28px 34px", opacity: "0" }, r, `<div style="${css(font(20, 500, C.muted))}">Agent</div><div style="${css(font(36, 700))};margin-top:6px">AI</div>`);
			const t = div({ ...abs(1180, y, 480), ...cardStyle, padding: "28px 34px", opacity: "0" }, r, `<div style="${css(font(20, 500, C.muted))}">Acts on</div><div style="${css(font(36, 700))};margin-top:6px">${target}</div><div style="${css(font(22, 500, C.muted, { fontFamily: MONO_F }))};margin-top:12px">${targetBody}</div>`);
			return { a, t, at, y };
		};
		const rows = [row(200, "A computer", "$ npm test  ✓ 42 passed", 0), row(560, "Your brain", "struggle in, understanding out", 3.37)];
		const labels = [pill(r, "Coding harness", { tone: "neutral", x: 260, y: 130, size: 22 }), pill(r, "Learning harness", { tone: "primary", x: 260, y: 490, size: 22 })];
		const svg = svgLayer(r);
		return (lt) => {
			let m = "";
			rows.forEach(({ a, t, at, y }, i) => {
				show(labels[i], lt, at, 0.3, 0);
				show(a, lt, at + 0.1);
				show(t, lt, at + 0.6);
				const k = seg(lt, at + 0.35, 0.4);
				if (k > 0) m += `<line x1="690" y1="${y + 70}" x2="${f1(690 + 470 * k)}" y2="${y + 70}" stroke="${i ? C.soft : C.muted}" stroke-width="4"/><circle cx="${f1(690 + 470 * k)}" cy="${y + 70}" r="9" fill="${i ? C.soft : C.muted}"/>`;
			});
			const dimTop = seg(lt, 3.37, 0.4);
			[rows[0].a, rows[0].t, labels[0]].forEach((n) => (n.style.opacity = (Math.min(+n.style.opacity, 1 - 0.55 * dimTop)).toFixed(3)));
			svg.innerHTML = m;
		};
	});

	/** Logistics move to TYSA's column; the struggle and the material stay in yours. */
	const logistics = shot((r) => {
		const col = (x, head, tone) => div({ ...abs(x, 160, 680), height: "720px", ...cardStyle, padding: "30px 34px", opacity: "0" }, r, `<div style="${css(font(30, 700, tone))}">${head}</div>`);
		const you = col(220, "You", C.fg);
		const tysa = col(1020, "TYSA handles", C.soft);
		const ITEMS = ["Fact-checking", "Planning", "Resource hunting"];
		const items = ITEMS.map((t, i) => pill(r, t, { badge: "•", size: 26, x: 260, y: 460 + i * 100, w: 600 }));
		const struggle = pill(r, "The struggle", { badge: "✓", badgeColor: C.ok, tone: "ok", x: 260, y: 260, w: 600, size: 26 });
		const material = pill(r, "The material itself", { badge: "✓", badgeColor: C.ok, tone: "ok", x: 260, y: 360, w: 600, size: 26 });
		return (lt) => {
			show(you, lt, 0, 0.35);
			show(tysa, lt, 0.2, 0.35);
			show(struggle, lt, 0.2);
			items.forEach((p, i) => {
				const move = seg(lt, 3.41 + i * 0.35, 0.5, E.inOut3);
				show(p, lt, 0.5 + i * 0.12, 0.3, 0);
				p.style.left = `${f1(lerp(260, 1060, move))}px`;
				p.style.top = `${f1(lerp(460 + i * 100, 260 + i * 100, move))}px`;
				Object.assign(p.style, pillStyle(move >= 1 ? "primary" : "neutral"));
				p.badge.style.background = move >= 1 ? C.primary : C.accent;
				p.badge.textContent = move >= 1 ? "✓" : "•";
			});
			show(material, lt, 6.65);
			material.style.outline = lt > 6.8 ? `3px solid rgba(0,100,224,${(0.8 * seg(lt, 6.8, 0.3)).toFixed(2)})` : "none";
			material.style.outlineOffset = "4px";
		};
	});

	/** The plan: a dependency map from what you know to the goal, then the confirm bar. */
	const plan = shot((r) => {
		const d = divider(r, "Planning", 70, { spinner: true });
		const N = [
			["Light is a wave", 220, 300, "ok"],
			["Wavelength λ", 220, 470, "ok"],
			["Air scatters light", 220, 640, "ok"],
			["Rayleigh's law: λ⁻⁴", 760, 380, "next"],
			["Why the sky isn't violet", 760, 560, "next"],
			["Path length through air", 760, 740, "next"],
			["Why sunsets are red", 1310, 560, "goal"],
		];
		const E2 = [
			[0, 3],
			[1, 3],
			[2, 3],
			[3, 4],
			[2, 5],
			[4, 6],
			[5, 6],
			[3, 6],
		];
		const svg = svgLayer(r);
		const nodes = N.map(([t, x, y, kind], i) =>
			pill(r, t, kind === "ok" ? { badge: "✓", badgeColor: C.ok, tone: "ok", x, y, w: 420, size: 24 } : kind === "goal" ? { badge: "★", badgeColor: C.primary, tone: "primary", x, y, w: 420, size: 24 } : { badge: String(i - 2), x, y, w: 420, size: 24 }),
		);
		const bar = div({ ...abs(460, 900, 1000), ...cardStyle, borderRadius: "22px", padding: "18px 22px 18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: "0" }, r, `<span style="${css(font(26, 500))}">Does this plan look right?</span><span style="display:flex;gap:14px"><span style="${css({ ...font(22, 500, C.fg), border: `2px solid ${C.border}`, borderRadius: "14px", padding: "10px 20px" })}">Change something</span><span style="${css({ ...font(22, 600, "#fff"), background: C.primary, borderRadius: "14px", padding: "10px 22px" })}">Start lesson</span></span>`);
		return (lt) => {
			show(d, lt, 0, 0.3, 0);
			spinTo(d, lt);
			nodes.forEach((p, i) => show(p, lt, (N[i][1] - 220) / 1100 * 2.6 + 0.2, 0.35, 10));
			let m = "";
			E2.forEach(([a, b], i) => {
				const k = seg(lt, 0.7 + i * 0.22, 0.5);
				if (k <= 0) return;
				const [x0, y0] = [N[a][1] + 420, N[a][2] + 27];
				const [x1, y1] = [N[b][1], N[b][2] + 27];
				const mx = (x0 + x1) / 2;
				m += `<path d="M${x0} ${y0}C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}" fill="none" stroke="${C.muted}" stroke-width="3" stroke-dasharray="900" stroke-dashoffset="${f1(900 * (1 - k))}"/>`;
			});
			svg.innerHTML = m;
			show(bar, lt, 4.31);
		};
	});

	/** Teaching: predict first, typed or spoken, then the explanation. */
	const teach = shot((r) => {
		const d = divider(r, "Teaching", 70);
		const marker = pill(r, "Rayleigh's law", { badge: "3", badgeColor: C.primary, tone: "primary", x: 220, y: 170, size: 24 });
		const c = div({ ...abs(220, 260, 1480), ...cardStyle, padding: "28px 34px", opacity: "0" }, r);
		div(font(20, 500, C.muted), c, "Predict before the explanation");
		div(font(32, 500, C.fg, { marginTop: "10px", lineHeight: "1.4" }), c, "If you halve the wavelength, how much more strongly does the light scatter?");
		const field = div({ marginTop: "22px", background: C.field, borderRadius: "20px", padding: "18px 22px", border: `2px solid ${C.border}` }, c);
		div(font(19, 500, C.muted, { marginBottom: "10px" }), field, "Thinking about your answer");
		const text = div(font(28, 500, C.fg, { minHeight: "80px", lineHeight: "1.4" }), field);
		const foot = div({ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }, field);
		const voice = div({ display: "flex", alignItems: "center", gap: "14px", ...font(20, 500, C.soft), opacity: "0" }, foot);
		const wave = div({ display: "flex", alignItems: "center", gap: "5px", height: "34px" }, voice);
		const bars = Array.from({ length: 18 }, () => div({ width: "5px", borderRadius: "3px", background: C.soft }, wave));
		el("span", {}, voice, "Transcribing with Muse Voice");
		const mic = div({ width: "54px", height: "54px", borderRadius: "50%", border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }, foot, `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${C.fg}" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`);
		const exp = div({ ...abs(220, 760, 1480), ...cardStyle, padding: "26px 34px", borderColor: "rgba(95,179,154,0.5)", opacity: "0" }, r, `<div style="${css(font(20, 600, C.ok))}">✓ Your prediction holds</div><div style="${css(font(28, 500))};margin-top:10px;line-height:1.45">Intensity goes as λ⁻⁴, so halving λ gives 2⁴ = 16 times the scattering.</div>`);
		const TYPED = "λ to the minus four… so 2⁴, sixteen times?";
		const MESSY = "shorter λ scatters more. by how much… ";
		return (lt) => {
			show(d, lt, 0, 0.3, 0);
			show(marker, lt, 0.2);
			show(c, lt, 0.3, 0.4);
			const typed = lt < 5.1 ? MESSY.slice(0, Math.max(0, Math.floor((lt - 2.4) * 22))) : MESSY + TYPED.slice(0, Math.max(0, Math.floor((lt - 5.1) * 16)));
			text.innerHTML = `${escapeHtml(typed)}<span style="display:inline-block;width:3px;height:30px;margin-left:3px;vertical-align:-5px;background:${C.soft}"></span>`;
			const talking = lt > 5.1 && lt < 8.3;
			voice.style.opacity = talking ? "1" : "0";
			mic.style.background = talking ? C.primary : "transparent";
			mic.style.borderColor = talking ? C.primary : C.border;
			bars.forEach((b, i) => (b.style.height = `${f1(talking ? 8 + 24 * Math.abs(Math.sin(lt * 9 + i * 0.9)) : 6)}px`));
			show(exp, lt, 8.55);
		};
	});

	/** Practice: the thinking trace read in chunks, the smallest hint, then a new surface. */
	const practice = shot((r) => {
		const d = divider(r, "Practice", 70);
		const prob = div({ ...abs(220, 170, 900), ...cardStyle, padding: "26px 32px" }, r);
		div(font(20, 500, C.muted), prob, "Problem");
		const q = div(font(30, 500, C.fg, { marginTop: "10px", lineHeight: "1.4", minHeight: "84px" }), prob);
		const CHUNKS = [
			["Overhead, sunlight crosses less air.", "ok"],
			["So less blue gets scattered out of it.", "ok"],
			["…but then why is it brighter at the horizon?", "stuck"],
		];
		const chunks = CHUNKS.map(([t], i) => pill(r, t, { badge: String(i + 1), x: 220, y: 440 + i * 100, w: 900, size: 24 }));
		const ladder = div({ ...abs(1220, 170, 480), ...cardStyle, padding: "26px 30px", opacity: "0" }, r);
		div(font(20, 500, C.muted, { marginBottom: "16px" }), ladder, "Hint ladder");
		const rungs = ["Nudge", "Hint", "Bigger hint", "Worked step"].map((t, i) => div({ padding: "12px 18px", borderRadius: "14px", marginBottom: "10px", border: `2px solid ${C.border}`, ...font(24, 500, C.muted) }, ladder, `${i}. ${t}`));
		const hint = div({ ...abs(1220, 600, 480), ...cardStyle, padding: "22px 28px", borderColor: "rgba(0,100,224,0.5)", opacity: "0" }, r, `<div style="${css(font(18, 600, C.soft))}">Nudge</div><div style="${css(font(26, 500))};margin-top:8px;line-height:1.4">Which way is the scattered light travelling when it reaches you?</div>`);
		const same = pill(r, "Same idea, new surface", { tone: "primary", badge: "↻", badgeColor: C.primary, x: 220, y: 780, size: 24 });
		const edge = pill(r, "Kept at the edge of your ability", { tone: "ok", badge: "✓", badgeColor: C.ok, x: 220, y: 880, size: 24 });
		return (lt) => {
			show(d, lt, 0, 0.3, 0);
			const second = lt > 7.75;
			q.textContent = second ? "On Mars the sunset sky is blue around the sun. Using the same idea, what does that tell you about its dust?" : "Why is the sky a deeper blue overhead than near the horizon?";
			prob.style.borderColor = second ? C.primary : C.border;
			chunks.forEach((p, i) => {
				show(p, lt, 0.6 + i * 0.7);
				const read = seg(lt, 3.34 + i * 0.4, 0.2) > 0 && !second;
				const tone = !read ? "neutral" : CHUNKS[i][1] === "ok" ? "ok" : "miss";
				Object.assign(p.style, pillStyle(tone));
				p.badge.style.background = !read ? C.accent : tone === "ok" ? C.ok : C.warn;
				p.badge.textContent = !read ? String(i + 1) : tone === "ok" ? "✓" : "?";
				if (second) p.style.opacity = (1 - seg(lt, 7.75, 0.3)).toFixed(3);
			});
			show(ladder, lt, 4.6);
			rungs.forEach((g, i) => {
				const on = i === 0 && lt > 5.0;
				g.style.borderColor = on ? C.primary : C.border;
				g.style.background = on ? "rgba(0,100,224,0.14)" : "transparent";
				g.style.color = on ? C.soft : C.muted;
			});
			show(hint, lt, 5.1);
			show(same, lt, 7.9);
			show(edge, lt, 9.6);
		};
	});

	/** The knowledge graph: claims and reasoning chains, growing. */
	const graph = shot((r) => {
		const d = divider(r, "Knowledge graph", 70);
		const svg = svgLayer(r);
		const rr = rng(4);
		const P = [];
		for (let i = 0; i < 90; i++) {
			const a = rr() * Math.PI * 2;
			const rad = Math.sqrt(rr());
			P.push([960 + Math.cos(a) * rad * 640, 560 + Math.sin(a) * rad * 340, rr()]);
		}
		P.sort((a, b) => Math.hypot(a[0] - 960, a[1] - 560) - Math.hypot(b[0] - 960, b[1] - 560));
		const EDGES = [];
		P.forEach((p, i) => {
			const near = P.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j]).filter(([, j]) => j < i).sort((a, b) => a[0] - b[0]).slice(0, 2);
			near.forEach(([, j]) => EDGES.push([j, i]));
		});
		const nearest = ([tx, ty]) => P.reduce((best, p, i) => (Math.hypot(p[0] - tx, p[1] - ty) < Math.hypot(P[best][0] - tx, P[best][1] - ty) ? i : best), 0);
		const LABELS = [
			[nearest([700, 420]), "Rayleigh's law", "primary"],
			[nearest([1250, 400]), "Wavelength λ", "ok"],
			[nearest([620, 720]), "Why the sky isn't violet", "primary"],
			[nearest([1230, 720]), "Path length through air", "ok"],
		];
		const labels = LABELS.map(([i, t, tone]) => pill(r, t, { tone, size: 22, x: P[i][0] + 18, y: P[i][1] - 22 }));
		labels.forEach((p) => (p.style.background = C.card));
		const live = pill(r, "A live map of what you know", { tone: "primary", badge: "●", badgeColor: C.primary, x: 700, y: 960, size: 26 });
		return (lt) => {
			show(d, lt, 0, 0.3, 0);
			const n = Math.max(Math.round(lerp(14, 90, seg(lt, 0.2, 6.5, E.inOut3))), ...LABELS.map(([i]) => (lt > 0.5 ? i + 1 : 0)));
			let m = "";
			EDGES.forEach(([a, b]) => b < n && (m += `<line x1="${f1(P[a][0])}" y1="${f1(P[a][1])}" x2="${f1(P[b][0])}" y2="${f1(P[b][1])}" stroke="${C.border}" stroke-width="2.5"/>`));
			P.slice(0, n).forEach(([x, y, f], i) => (m += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${i < 14 ? 9 : 7}" fill="${i >= n - 6 ? C.soft : f > 0.85 ? C.ok : C.fg}"/>`));
			svg.innerHTML = m;
			labels.forEach((p, i) => show(p, lt, 0.5 + i * 0.6));
			show(live, lt, 4.13);
		};
	});

	const demo = section("film-4-demo", 0.2, 77.84, [
		[0, intro()],
		[4.67, harness],
		[11.92, logistics],
		[21.62, embed(SCENES.find((s) => s.id === "x-1-probe"))],
		[30.69, plan],
		[38.29, teach],
		[50.1, practice],
		[62.77, graph],
		[70.19, title(["AI ISN'T HERE TO MAKE", "HUMANS OBSOLETE."], { size: 104, hl: ["OBSOLETE."] })],
		[73.52, meme("#14306b", drawPodium)],
		[76.67, intro(true)],
	]);

	SCENES.push(hook, mindbuilding, problem, demo);
})();
