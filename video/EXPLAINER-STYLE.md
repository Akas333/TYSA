# TYSA explainer animation style

How to make an explainer shot like `x-1-probe` ("First, it probes…"): a plain canvas, illustrated only with TYSA's own UI components, timed to Eric's voice-over. The reference for the pacing is a calm, minimal explainer: one idea at a time, a still camera, and things that appear and change state instead of moving around.

## The rules

1. **Plain canvas.** The app background `#111112`, edge to edge. No app chrome (no sidebar, header or panels), no textures, no vignette.
2. **Illustrate with the app's components only.** Every shape on screen is a piece of TYSA's UI, or is drawn the way a TYSA component is drawn. Use this table:

   | To show… | Use |
   |---|---|
   | A phase or section | Phase divider: dotted rule, bordered pill, dotted rule (`phase-divider.tsx`) |
   | An idea or concept | Concept-marker pill: rounded-full, number badge plus label (`concept-markers.tsx`) |
   | A question | Probe card: label, question, option rows, "I don't know", confidence rail, thinking field |
   | Confidence | The confidence rail with the app's colour ramp (`confidence-rail.tsx`) |
   | Reasoning | The thinking field, typing |
   | A callout or label | A numbered pill in the concept-marker style, in primary blue |
   | A connection | A thin `#4ca3ff` line that draws on, ending in a dot (plan-map edge style) |
   | A boundary or milestone | A phase-divider-style dotted rule with a primary pill |
   | Unknown or missing | Dashed border, muted text (like the "I don't know" row) |

3. **Only the app's fonts.** Figtree for everything; JetBrains Mono for numbers, percentages and the braille spinner. Never a serif, never a system font.
4. **Only the app's colours** (from `apps/web/app/globals.css`):

   | Token | Value | Use |
   |---|---|---|
   | background | `#111112` | Canvas |
   | foreground | `#f2f4f6` | Text |
   | card | `#1f1f22` | Card and pill fill |
   | accent | `#2b2c30` | Idle badge |
   | border | `#2e3034` | Borders, dotted rules |
   | input | `#3a3c41` | Radio rings, dashed borders |
   | muted-foreground | `#9fa4ab` | Secondary text |
   | primary | `#0064e0` | Active, callout badges, outlines |
   | primary-soft | `#4ca3ff` | Connectors, "How sure are you?", spinner |
   | primary tint | `rgba(0,100,224,0.1–0.15)` fill, `rgba(0,100,224,0.4–0.5)` border | Callout and edge pills |

   Confidence ramp: `0 #d9776f` · `30 #d9905e` · `50 #cfb05a` · `70 #a3bf6a` · `90 #6fbf8a` · `100 #5fb39a`. Use `100` for right/known (✓) and `0` for wrong/unknown (✕).
5. **Static camera.** No zoom, push-in, shake or flash. Elements may fade in, rise 16–24 px as they appear, or slide into place once (as the phase divider moves to the top). Everything else is a state change: a border, a fill, a badge, typing.
6. **Highlight with outlines and borders, not glows.** Focus a card part with a `3px` primary outline (`outline-offset: 4px`), or by changing its border colour. No blurred glows, no neon.
7. **One idea per beat.** Each spoken phrase gets one visible change. If the voice names three things, three things appear, one per word.
8. **Real content.** Use real-looking questions, options and labels from the lesson topic (the sample uses why the sky is blue, matching the app's own screenshots), never lorem ipsum.

## Sizes

The frame is 1920×1080, which is about 1.33× the app's CSS pixels. Scale the app's sizes by that:

| Element | Size |
|---|---|
| Section heading | Figtree 600, 30 px; subtitle 20 px muted |
| Pill text | Figtree 500, 24 px; badge 42 px circle |
| Card question | 24 px, line-height 1.4 |
| Option row | 21 px, 12×20 px padding, 16 px radius, 2 px border |
| Card | 26 px radius, 2 px border |
| Small labels | 17–19 px muted |
| Callout pill | 20 px text, 32 px badge |

Keep at least 190 px of margin left and right; callouts must end before x 1880.

## Timing to the voice

1. Generate the line with Eric (see **Pipeline**). `voice.mjs` saves the per-character timings as `out/vo/<take>-eric.json`.
2. Read the start time of each phrase from that JSON and write them into a `CUE` object at the top of the scene. Add the lead-in (0.3 s) to every cue.
3. Start each visual change on its word: a state change lands on the word, and an entrance starts about 0.1 s before it.
4. Make the scene last the clip plus about 0.3 s, so the final frame holds.

Example from the sample:

```js
const CUE = { probes: 0.3, ladder: 1.2, mc: 2.38, edge: 4.74, using: 6.3, sure: 7.41, why: 8.24 };
```

## How a scene is built

Scenes live in `video/explainer.js` and are plain objects pushed onto `SCENES`:

```js
const myExplainer = {
	id: "x-2-plan",        // the output file name; render.mjs filters by this prefix
	dur: 9.0,              // seconds
	push: false,           // keeps the camera still; always false in this style
	build(root) {
		root.style.background = UI.bg;
		// Build the components once, as DOM (el) or SVG (svgLayer)…
		return (t) => {
			// …then set their state for time t. Must be a pure function of t.
		};
	},
};
SCENES.push(myExplainer);
```

- Build each component once in `build`, and in the returned function only change styles and text. This keeps renders fast and frames deterministic.
- Use `seg(t, start, duration, ease)` for every animated value. It returns 0 to 1.
- Use DOM (`el`) for components, so they get real text layout, and an SVG layer (`svgLayer`) for connectors and lines.
- Reuse the builders already in `explainer.js`: `phaseDivider`, `conceptPill`, `probeCard`, `callout`. Add new builders in the same pattern when a scene needs another component (a plan-map node, a practice card, the knowledge-graph view), copying its look from `apps/web/components`.
- `explainer.js` relies on helpers from `scenes.js` (`el`, `svgLayer`, `seg`, `E`, `lerp`, `clamp01`, `escapeHtml`) and `samples.js` (`f1`). It is loaded by `scenes.html` after them.

## Pipeline

All commands run from the repo root. Rendering uses Playwright's cached headless Chromium and the `ffmpeg-static` binary:

```bash
export CHROME="$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-x64/chrome-headless-shell"
export FFMPEG=/path/to/ffmpeg-static/ffmpeg
```

1. **Voice:** add the take's text to `TAKES` in `video/voice.mjs`, then:

   ```bash
   node video/voice.mjs eric <take>
   ```

   This needs `ELEVENLABS_API_KEY` in `video/.env` (git-ignored). Eric is voice `cjVigY5qzO86Huf0OWal` at speed 0.95, stability 0.5, style 0.2. TYSA is pronounced "Tie-sah", so write it that way in the take's text.
2. **Quick check:** render a 10 fps preview and look at a contact sheet before the full render:

   ```bash
   FPS=10 SCALE=1 node video/render.mjs x-2
   "$FFMPEG" -i video/out/x-2-plan.mp4 -vf "select='not(mod(n\,15))',scale=960:-1,tile=2x3" -frames:v 1 sheet.png
   ```

3. **Full render:** 1080p, 60 fps, captured at 2× and downscaled:

   ```bash
   node video/render.mjs x-2
   ```

4. **Add the voice:** cut the line from the take with a 0.3 s lead-in and normalise the loudness:

   ```bash
   "$FFMPEG" -i video/out/x-2-plan.mp4 -ss <start> -t <length> -i video/out/vo/demo-eric-final.mp3 \
     -filter_complex "[1:a]aresample=48000,adelay=300|300,apad,loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
     -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t <scene dur> video/out/x-2-plan-eric.mp4
   ```

   No sound effects: voice only.

## Checklist before delivering

- [ ] The canvas is plain `#111112`, with no app chrome.
- [ ] Every element is an app component or drawn like one.
- [ ] Only Figtree and JetBrains Mono; only `globals.css` colours and the confidence ramp.
- [ ] The camera never moves: no zoom, shake or flash.
- [ ] Highlights are outlines or border changes, not glows.
- [ ] Each change lands on its word in Eric's take.
- [ ] Nothing is clipped at the frame edges (check the last frame, where the most is on screen).
- [ ] Voice only, loudness-normalised, starting after the 0.3 s lead-in.
