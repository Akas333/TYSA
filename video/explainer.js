"use strict";
/*
 * Explainer shots on a plain canvas, illustrated with TYSA's own UI components and nothing else:
 * the phase divider, concept-marker pills, the probe card with its options, confidence rail and
 * thinking field. Only the app's tokens (globals.css) and fonts (Figtree, JetBrains Mono). Static
 * camera: elements appear and change, nothing zooms.
 *
 * Sample: "First, it probes. Multiple-choice questions binary-search the edge of what you know,
 * using your answer, how sure you are, and why." Cue times follow Eric's take plus a 0.3 s lead-in.
 */

// globals.css tokens, plus the confidence ramp from confidence-rail.tsx.
const UI = { bg: "#111112", fg: "#f2f4f6", card: "#1f1f22", muted: "#9fa4ab", accent: "#2b2c30", border: "#2e3034", input: "#3a3c41", primary: "#0064e0", soft: "#4ca3ff" };
const CONF = { 0: "#d9776f", 30: "#d9905e", 50: "#cfb05a", 70: "#a3bf6a", 90: "#6fbf8a", 100: "#5fb39a" };
const OK = CONF[100];
const MISS = CONF[0];
const BRAILLE_FRAMES = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
const CUE = { probes: 0.3, ladder: 1.2, mc: 2.38, edge: 4.74, using: 6.3, sure: 7.41, why: 8.24 };

// The ideas the goal builds on, basic at the bottom.
const IDEAS = ["Light is a wave", "Wavelength λ", "Air scatters light", "Rayleigh's law: λ⁻⁴", "Why the sky isn't violet", "Sunset geometry", "Mie scattering"];
const LADDER = { x: 190, w: 520, h: 60, top: 300, gap: 104 };
const pillY = (i) => LADDER.top + (IDEAS.length - 1 - i) * LADDER.gap;

// The three probes: the idea tested, the question, options, the pick, and whether it was right.
const PROBES = [
	{ idea: 3, at: 2.38, q: "Blue light (λ ≈ 450 nm) vs red (λ ≈ 650 nm): how much more strongly is the blue scattered?", opts: ["About 2 times", "About 4 times", "About 10 times", "About 100 times"], pick: 1, ok: true },
	{ idea: 5, at: 3.3, q: "Why does the setting sun look red?", opts: ["Its light crosses more air, which scatters the blue away", "The sun cools down at dusk", "Only dust in the air", "Ozone absorbs the blue"], pick: 1, ok: false },
	{ idea: 4, at: 4.0, q: "Violet scatters even more than blue. So why isn't the sky violet?", opts: ["Sunlight has less violet, and eyes are less sensitive to it", "Air absorbs violet light", "It is violet; we just call it blue", "Clouds filter it out"], pick: 1, ok: false },
];
const PICK_DELAY = 0.45;
const THOUGHT = "violet gets absorbed up high?? honestly not sure";

/** Phase divider (phase-divider.tsx): dotted rule, a bordered pill, dotted rule. */
function phaseDivider(root) {
	const wrap = el("div", { position: "absolute", left: "190px", right: "190px", display: "flex", alignItems: "center", gap: "24px", fontFamily: "Figtree" }, root);
	const rule = () => el("div", { flex: "1", height: "0", borderTop: `3px dotted ${UI.border}` }, wrap);
	rule();
	const pill = el("div", { display: "flex", alignItems: "center", gap: "14px", border: `2px solid ${UI.border}`, borderRadius: "999px", padding: "10px 26px", fontSize: "30px", fontWeight: "500", color: UI.muted }, wrap);
	const spin = el("span", { fontFamily: "JetBrains Mono", color: UI.soft, width: "22px" }, pill);
	el("span", {}, pill, "Probing");
	rule();
	return { wrap, pill, spin };
}

/** A concept-marker pill (concept-markers.tsx): number badge plus label, rounded-full. */
function conceptPill(root, i) {
	const p = el(
		"div",
		{ position: "absolute", left: `${LADDER.x}px`, top: `${pillY(i)}px`, width: `${LADDER.w}px`, height: `${LADDER.h}px`, boxSizing: "border-box", display: "flex", alignItems: "center", gap: "16px", padding: "0 24px 0 9px", borderRadius: "999px", border: `2px solid ${UI.border}`, background: UI.card, fontFamily: "Figtree", fontSize: "24px", fontWeight: "500", color: UI.fg, opacity: "0" },
		root,
	);
	const badge = el("span", { width: "42px", height: "42px", borderRadius: "50%", background: UI.accent, color: UI.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px", fontWeight: "600", flex: "none" }, p, String(i + 1));
	el("span", {}, p, escapeHtml(IDEAS[i]));
	return { p, badge };
}

/** The probe card (question-dock): label, question, options, confidence rail, thinking field. */
function probeCard(root) {
	const h = {};
	const row = { display: "flex", alignItems: "center", gap: "18px" };
	h.card = el("div", { position: "absolute", left: "880px", top: "236px", width: "760px", background: UI.card, border: `2px solid ${UI.border}`, borderRadius: "26px", fontFamily: "Figtree", color: UI.fg, overflow: "hidden", opacity: "0" }, root);
	const head = el("div", { padding: "22px 26px 6px" }, h.card);
	h.label = el("div", { fontSize: "18px", color: UI.muted, marginBottom: "8px" }, head, "Probe");
	h.q = el("div", { fontSize: "24px", lineHeight: "1.4", minHeight: "68px" }, head);
	const list = el("div", { padding: "10px 26px 8px", display: "flex", flexDirection: "column", gap: "10px" }, h.card);
	h.opts = [0, 1, 2, 3].map(() => {
		const r = el("div", { ...row, border: `2px solid ${UI.border}`, borderRadius: "16px", padding: "12px 20px", fontSize: "21px" }, list);
		const dot = el("span", { width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${UI.input}`, flex: "none", boxSizing: "border-box" }, r);
		const txt = el("span", { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, r);
		return { r, dot, txt };
	});
	el("div", { ...row, border: `2px dashed ${UI.border}`, borderRadius: "16px", padding: "10px 20px", fontSize: "18px", color: UI.muted }, list, `<span style="width:20px;height:20px;border-radius:50%;border:2px solid ${UI.border};box-sizing:border-box"></span>I don't know`);
	h.sure = el("div", { ...row, gap: "22px", padding: "16px 26px", borderTop: `2px solid ${UI.border}`, marginTop: "8px" }, h.card);
	el("span", { fontSize: "19px", color: UI.soft, whiteSpace: "nowrap" }, h.sure, "How sure are you?");
	h.rail = el("div", { position: "relative", flex: "1", height: "8px", borderRadius: "6px", border: `1px solid ${UI.border}`, background: "#141414" }, h.sure);
	for (const v of [30, 50, 70, 90]) el("span", { position: "absolute", left: `${v}%`, top: "-1px", width: "2px", height: "8px", background: UI.border }, h.rail);
	h.fill = el("div", { position: "absolute", left: "0", top: "0", bottom: "0", width: "0%", borderRadius: "6px" }, h.rail);
	h.thumb = el("div", { position: "absolute", top: "50%", left: "50%", width: "24px", height: "24px", borderRadius: "50%", background: "#8a8f96", transform: "translate(-50%,-50%)" }, h.rail);
	h.value = el("span", { fontFamily: "JetBrains Mono", fontSize: "18px", color: UI.muted, width: "52px", textAlign: "right" }, h.sure, "–");
	h.think = el("div", { margin: "0 12px 12px", background: "#19191b", borderRadius: "20px", padding: "16px 20px", border: `2px solid ${UI.border}` }, h.card);
	el("div", { fontSize: "17px", color: UI.muted, marginBottom: "8px" }, h.think, "Thinking about your answer");
	h.thought = el("div", { fontSize: "21px", minHeight: "56px" }, h.think);
	return h;
}

/** A numbered callout in the concept-marker style, pointing at a card part. */
function callout(root, n, text) {
	const c = el("div", { position: "absolute", left: "1676px", display: "flex", alignItems: "center", gap: "10px", borderRadius: "999px", border: "2px solid rgba(0,100,224,0.4)", background: "rgba(0,100,224,0.1)", padding: "5px 18px 5px 5px", fontFamily: "Figtree", fontSize: "20px", fontWeight: "500", color: UI.fg, whiteSpace: "nowrap", opacity: "0" }, root);
	el("span", { width: "32px", height: "32px", borderRadius: "50%", background: UI.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }, c, String(n));
	el("span", {}, c, text);
	return c;
}

const probeExplainer = {
	id: "x-1-probe",
	dur: 9.3,
	push: false,
	build(root) {
		root.style.background = UI.bg;
		const divider = phaseDivider(root);
		const heading = el("div", { position: "absolute", left: `${LADDER.x}px`, top: "150px", fontFamily: "Figtree", opacity: "0" }, root, `<div style="font-size:30px;font-weight:600;color:${UI.fg}">What you already know</div><div style="font-size:20px;color:${UI.muted};margin-top:8px">Quick checks on the ideas this builds on</div>`);
		const lines = svgLayer(root);
		const pills = IDEAS.map((_, i) => conceptPill(root, i));
		// The edge: a phase divider dropped between the last idea known and the first one not.
		const edgeY = pillY(3) - (LADDER.gap - LADDER.h) / 2;
		const edge = el("div", { position: "absolute", left: `${LADDER.x - 20}px`, width: `${LADDER.w + 40}px`, top: `${edgeY - 19}px`, display: "flex", alignItems: "center", gap: "14px", fontFamily: "Figtree", opacity: "0" }, root);
		const edgeRule = () => el("div", { flex: "1", height: "0", borderTop: `3px dotted ${UI.soft}` }, edge);
		edgeRule();
		el("div", { borderRadius: "999px", border: "2px solid rgba(0,100,224,0.5)", background: "rgba(0,100,224,0.15)", padding: "4px 18px", fontSize: "20px", fontWeight: "600", color: UI.soft }, edge, "The edge of what you know");
		edgeRule();
		const card = probeCard(root);
		const calls = [callout(root, 1, "Your answer"), callout(root, 2, "How sure"), callout(root, 3, "Why")];

		return (t) => {
			// "First, it probes": the phase divider, centred, then it settles to the top.
			const up = seg(t, 1.0, 0.5, E.inOut3);
			divider.wrap.style.top = `${f1(lerp(510, 60, up))}px`;
			divider.wrap.style.opacity = seg(t, 0.15, 0.3).toFixed(3);
			divider.spin.textContent = BRAILLE_FRAMES[Math.floor(t / 0.08) % BRAILLE_FRAMES.length];
			heading.style.opacity = seg(t, CUE.ladder, 0.4).toFixed(3);
			card.card.style.opacity = seg(t, CUE.ladder + 0.4, 0.4).toFixed(3);
			card.card.style.transform = `translateY(${f1(24 * (1 - seg(t, CUE.ladder + 0.4, 0.5)))}px)`;

			// The ladder of ideas, and each probe's verdict on it.
			const settled = t >= CUE.edge + 0.25;
			pills.forEach(({ p, badge }, i) => {
				const a = seg(t, CUE.ladder + i * 0.09, 0.3);
				p.style.opacity = a.toFixed(3);
				p.style.transform = `translateY(${f1(16 * (1 - a))}px)`;
				let st = "idle";
				for (const pr of PROBES) if (pr.idea === i && t >= pr.at) st = t < pr.at + PICK_DELAY + 0.1 ? "probe" : pr.ok ? "ok" : "miss";
				if (settled && st === "idle") st = i < 4 ? "ok" : "miss";
				const known = st === "ok";
				const unknown = st === "miss";
				p.style.border = st === "probe" ? `2px solid ${UI.primary}` : unknown ? `2px dashed ${UI.input}` : known ? `2px solid rgba(95,179,154,0.45)` : `2px solid ${UI.border}`;
				p.style.background = st === "probe" ? "rgba(0,100,224,0.12)" : unknown ? "transparent" : UI.card;
				p.style.color = unknown ? UI.muted : UI.fg;
				badge.style.background = st === "probe" ? UI.primary : known ? OK : unknown ? MISS : UI.accent;
				badge.style.color = st === "idle" ? UI.muted : "#fff";
				badge.textContent = known ? "✓" : unknown ? "✕" : String(i + 1);
			});
			edge.style.opacity = seg(t, CUE.edge, 0.4).toFixed(3);
			edge.style.transform = `scaleX(${(0.6 + 0.4 * seg(t, CUE.edge, 0.4, E.out3)).toFixed(3)})`;

			// The probe card: question, pick, then the three signals it reads.
			let k = 0;
			while (k < PROBES.length - 1 && t >= PROBES[k + 1].at) k++;
			const pr = PROBES[k];
			card.label.textContent = t >= CUE.mc ? `Probe · ${k + 1} of 3` : "Probe";
			card.q.textContent = pr.q;
			const picked = t >= CUE.mc && t >= pr.at + PICK_DELAY;
			const lit1 = seg(t, CUE.using, 0.3);
			card.opts.forEach((o, i) => {
				o.txt.textContent = pr.opts[i];
				const sel = picked && i === pr.pick;
				const col = pr.ok ? OK : MISS;
				o.r.style.borderColor = sel ? col : UI.border;
				o.r.style.background = sel ? `${col}22` : "transparent";
				o.r.style.outline = sel && lit1 > 0 ? `3px solid rgba(0,100,224,${(0.8 * lit1).toFixed(2)})` : "none";
				o.r.style.outlineOffset = "4px";
				o.dot.style.borderColor = sel ? col : UI.input;
				o.dot.style.background = sel ? col : "transparent";
			});
			const c = seg(t, CUE.sure, 0.45, E.inOut3);
			const v = Math.round(lerp(50, 30, c));
			card.fill.style.width = t >= CUE.sure ? `${v}%` : "0%";
			card.fill.style.background = CONF[30];
			card.thumb.style.left = `${v}%`;
			card.thumb.style.background = t >= CUE.sure ? "#e8e9eb" : "#8a8f96";
			card.value.textContent = t >= CUE.sure ? `${v}%` : "–";
			card.sure.style.outline = c > 0 ? `3px solid rgba(0,100,224,${(0.8 * seg(t, CUE.sure, 0.3)).toFixed(2)})` : "none";
			card.sure.style.outlineOffset = "-6px";
			card.sure.style.borderRadius = "16px";
			const n = Math.max(0, Math.min(THOUGHT.length, Math.floor((t - CUE.why) * 38)));
			card.thought.innerHTML =
				t < CUE.why ? `<span style="color:${UI.muted}">Why this answer? What's on your mind?</span>` : `${escapeHtml(THOUGHT.slice(0, n))}<span style="display:inline-block;width:3px;height:24px;margin-left:3px;vertical-align:-4px;background:${UI.soft}"></span>`;
			card.think.style.borderColor = t >= CUE.why ? UI.primary : UI.border;

			// Callouts sit level with the card parts they name.
			const top = (node) => node.getBoundingClientRect().top - root.getBoundingClientRect().top + node.offsetHeight / 2 - 22;
			const targets = [card.opts[pr.pick].r, card.sure, card.think];
			[CUE.using, CUE.sure, CUE.why].forEach((at, i) => {
				const a = seg(t, at, 0.3);
				calls[i].style.opacity = a.toFixed(3);
				calls[i].style.top = `${f1(top(targets[i]))}px`;
				calls[i].style.transform = `translateX(${f1(-12 * (1 - a))}px)`;
			});

			// Connectors: from the card to the idea it is testing, in the plan-map's edge style.
			let m = "";
			for (const p of PROBES) {
				const a = seg(t, p.at, 0.3) * (1 - seg(t, p.at + 0.75, 0.3));
				if (a <= 0 || t < CUE.mc) continue;
				const y1 = pillY(p.idea) + LADDER.h / 2;
				const x0 = 880;
				const y0 = 300;
				const x1 = LADDER.x + LADDER.w + 4;
				const mid = (x0 + x1) / 2;
				const d = `M${x0} ${y0}C${mid} ${y0} ${mid} ${f1(y1)} ${x1} ${f1(y1)}`;
				m += `<path d="${d}" fill="none" stroke="${UI.soft}" stroke-width="3" stroke-dasharray="1000" stroke-dashoffset="${f1(1000 * (1 - seg(t, p.at, 0.3)))}" opacity="${a.toFixed(2)}"/>`;
				m += `<circle cx="${x1}" cy="${f1(y1)}" r="7" fill="${UI.soft}" opacity="${(a * seg(t, p.at + 0.25, 0.1)).toFixed(2)}"/>`;
			}
			[CUE.using, CUE.sure, CUE.why].forEach((at, i) => {
				const a = seg(t, at, 0.3);
				if (a <= 0) return;
				const y = top(targets[i]) + 22;
				m += `<line x1="1642" y1="${f1(y)}" x2="${f1(1642 + 30 * a)}" y2="${f1(y)}" stroke="rgba(0,100,224,0.6)" stroke-width="2"/>`;
			});
			lines.innerHTML = m;
		};
	},
};

SCENES.push(probeExplainer);
