
import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { ConfidenceRail } from "@/components/confidence-rail";
import { GlyphMark } from "@/components/ui/glyph-mark";
import { ThinkingBlock } from "@/components/thinking-block";
import { cn } from "@/lib/utils";
import { ToolContentResponse } from "@/components/ai-elements/message";
import type { QuestionAnswerData } from "@/src/core";
import { answerForPresentation, parseAskInput, parseQuizInput } from "@/src/core";

/**
 * Static rendering of an answered question (tool part in `output-available`).
 *
 * Quiz answers are GRADED: ✓/✗ marks, the correct answers, and the
 * explanation. Ask answers are NOT graded — a plain record of what was said.
 * (The v1 bug this pins: ask answers must never get quiz grading UI.)
 * Explain answers are graded by the MODEL in its next reply, not by the
 * client — the card reveals his answer, the committed correct answer, and
 * the explanation, with NO verdict chips (owner ruling 2026-09-27).
 *
 * Once answered, the card rests COLLAPSED (owner, 2026-10-31): the question
 * and the chosen answer form a dropdown header; the options, confidence,
 * thinking and explanation open beneath it on click.
 */
export function AnsweredCard({ answer: savedAnswer, input }: { answer: QuestionAnswerData; input?: unknown }) {
	const answer = answerForPresentation(savedAnswer, input);
	const [whyOpen, setWhyOpen] = useState(false); // the tucked explanation (predictions, owner 2026-10-03)
	const [open, setOpen] = useState(false);
	if (answer.dismissed) {
		return (
			<div className="rounded-2xl border border-input/70 bg-card p-4 text-sm text-muted-foreground">
				<span className="font-medium">{answer.questionText}</span> — skipped
			</div>
		);
	}

	const isQuiz = answer.kind === "quiz";
	const isExplain = answer.kind === "explain";
	const selectedIdx = new Set(answer.answers.map((a) => a.index));
	const correctIdx = new Set(answer.correctIndices ?? []);
	// The question's own context rides the ORIGINAL CALL, not the answer
	// snapshot (owner, 2026-10-12): the details line — and, for ask
	// questions, option descriptions — re-render from the persisted
	// arguments, so every existing transcript shows them too. The lean
	// snapshot (what the model sees, compactAnswerForModel) is untouched;
	// any parse failure or absent input renders exactly the older card.
	const askInput = answer.kind === "ask" ? parseAskInput(input) : undefined;
	const parsedDetails = askInput?.details ?? (answer.kind === "quiz" ? parseQuizInput(input)?.details : undefined);
	const descByIndex = new Map((askInput?.options ?? []).map((o, i) => [i + 1, o.description]));
	// What the collapsed header shows: the picked options (graded colors on a
	// quiz), the learner's own typed option or text, or "I don't know".
	type Chosen = { text: string; tone: "right" | "wrong" | "plain" | "muted" };
	const chosen: Chosen[] = [
		...(answer.options ?? [])
			.filter((o) => selectedIdx.has(o.index))
			.map((o): Chosen => ({ text: o.label, tone: isQuiz ? (correctIdx.has(o.index) ? "right" : "wrong") : "plain" })),
		...(answer.other ? [{ text: `“${answer.other}”`, tone: "plain" as const }] : []),
		...(answer.text ? [{ text: `“${answer.text}”`, tone: "plain" as const }] : []),
		...(answer.dontKnow && isQuiz ? [{ text: "I don't know", tone: "muted" as const }] : []),
	];

	return (
		<>
		{/* The reading channel LIFTED (owner round, 2026-10-05): thoughts
		    captured while reading are chronologically PRIOR to the question —
		    rendered as its own user-side block ABOVE the card, the unified
		    ThinkingBlock, instead of an inset inside the answer. Same muted
		    rail as before; labelled like the live field it came from. */}
		{answer.readingThinking && (
			<ThinkingBlock testId="reading-thinking-block" label="Thinking while reading" text={answer.readingThinking} defaultOpen />
		)}
		<div className="rounded-2xl border border-input/70 bg-card text-card-foreground" data-testid="answered-card" data-open={open}>
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className="group flex w-full items-start gap-3 rounded-2xl px-5 py-4 text-left"
			>
				<span className="min-w-0 flex-1">
					<span className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
						{/* The tool's OWN name first (owner 2026-10-09): probe-phase
						    cards label Probe/Recall — the phase boundary visible in the
						    transcript. No `tool` on old records: kind labels as before. */}
						{answer.tool === "probe"
							? "Probe"
							: answer.tool === "recall"
								? "Recall"
								: isQuiz
									? answer.questionType === "predict"
										? "Prediction"
										: "Check"
									: isExplain
										? "Explain"
										: "Question"}
						{isQuiz &&
							(answer.dontKnow ? (
								<span className="rounded-full bg-(--pill) px-2 py-0.5">didn't know</span>
							) : answer.correct ? (
								<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300/85">correct</span>
							) : (
								<span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-700 dark:text-rose-300/85">incorrect</span>
							))}
					</span>
					<span className="block font-medium">
						<ToolContentResponse>{answer.questionText}</ToolContentResponse>
					</span>
					{!open && chosen.length > 0 && (
						// The chosen answer at a glance — the record's headline.
						<span className="mt-2 flex flex-wrap gap-1.5 text-sm" data-testid="answered-summary">
							{chosen.map((c, i) => (
								<span
									key={i}
									className={cn(
										"line-clamp-2 max-w-full rounded-xl px-3 py-1",
										c.tone === "right" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300/85",
										c.tone === "wrong" && "bg-rose-500/10 text-rose-700 dark:text-rose-300/85",
										c.tone === "plain" && "bg-primary/15 text-foreground",
										c.tone === "muted" && "bg-(--pill) text-muted-foreground",
									)}
								>
									<ToolContentResponse className="inline [&>p]:m-0 [&>p]:inline">{c.text}</ToolContentResponse>
								</span>
							))}
						</span>
					)}
				</span>
				<ChevronDownIcon
					aria-hidden
					className={cn(
						"mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground",
						open && "rotate-180",
					)}
				/>
			</button>

			{open && (
			// [&>*:last-child]:mb-0 (owner round, 2026-10-07): on ask cards the
			// thinking row is the last child — its my-3 would stack with the
			// padding into a void below.
			<div className="px-5 pb-5 [&>*:last-child]:mb-0" data-testid="answered-details">
			{parsedDetails && (
				// The details line, same paint as the pending dock (owner,
				// 2026-10-12): full markdown, LaTeX included.
				<div className="mb-3 text-sm text-muted-foreground">
					<ToolContentResponse>{parsedDetails}</ToolContentResponse>
				</div>
			)}

			{((answer.options?.length ?? 0) > 0 || answer.other) && (
				<div className="flex flex-col gap-1.5 text-sm">
					{answer.options?.map((opt) => {
						const sel = selectedIdx.has(opt.index);
						const key = isQuiz && correctIdx.has(opt.index);
						return (
							<div
								key={opt.index}
								className={cn(
									"flex items-center gap-2 rounded-xl border border-input/70 px-3.5 py-2",
									sel && key && "border-emerald-400/25 bg-emerald-500/[0.07]",
									sel && !key && isQuiz && "border-rose-400/25 bg-rose-500/[0.07]",
									sel && !isQuiz && "border-primary bg-primary/15",
									!sel && key && "border-emerald-400/20",
								)}
							>
								{isQuiz && (
									// Zapf-Dingbats-derived SVG outlines — the exact LaTeX \ding{51}/
									// \ding{55} hand-drawn shapes (owner, round 6); see ui/glyph-mark.
									<span
										aria-hidden
										data-mark={sel && key ? "check" : sel && !key ? "x" : !sel && key ? "check" : undefined}
										className={cn(
											"flex shrink-0 items-center",
											sel && key && "text-emerald-700 dark:text-emerald-300/85",
											sel && !key && "text-rose-700 dark:text-rose-300/85",
											!sel && key && "text-emerald-700 dark:text-emerald-300/85",
										)}
									>
										{/* Owner round 8: a touch smaller than the text (size-4→size-3.5,
											   ≈14px vs the 16px row) while centered. */}
										{(key || sel) && <GlyphMark kind={key ? "check" : "x"} className="size-3.5" />}
									</span>
								)}
								<span className={cn(!sel && "text-muted-foreground")}>
									<ToolContentResponse>{opt.label}</ToolContentResponse>
									{descByIndex.get(opt.index) && (
										// Ask-option subtext (owner, 2026-10-12): same markdown path
										// as the pending dock — LaTeX included. Quiz options carry
										// none (owner ruling 2026-09-26); the map stays empty for them.
										<ToolContentResponse className="lh-prose block text-xs text-muted-foreground">
											{descByIndex.get(opt.index)}
										</ToolContentResponse>
									)}
								</span>
							</div>
						);
					})}
					{/* The learner's own typed option is an OPTION — same container,
					    same selected styling as its siblings, not a loose quote
					    floating outside the list. Quotes keep the learner's words. */}
					{answer.other && (
						<div
							data-testid="answered-other"
							className="flex items-center gap-2 rounded-xl border border-primary bg-primary/15 px-3.5 py-2"
						>
							<span>“{answer.other}”</span>
						</div>
					)}
				</div>
			)}

			{answer.text && <div className="lh-prose mt-2 whitespace-pre-wrap">“{answer.text}”</div>}

			{/* The confidence record (owner round 6): the slider's rail, disc
			    removed — the missing handle itself says "this is a record, not a
			    control". Same ramp as the live dock, labelled and slimmer (owner,
			    2026-10-31). Quiz answers only, and only when a confidence exists:
			    "I don't know" sent none (its slider was grayed out), explain and
			    ask never had one, and records from before the feature carry no
			    field — nothing to show, nothing rendered. */}
			{isQuiz && answer.confidence != null && (
				<div className="mt-4 flex items-center gap-3 text-xs" data-testid="answered-confidence">
					<span className="shrink-0 text-muted-foreground">Confidence</span>
					<ConfidenceRail value={answer.confidence} className="h-1 min-w-0 flex-1 border-0" />
					<span className="shrink-0 rounded-full bg-(--pill) px-2 py-0.5 font-medium tabular-nums text-foreground">
						{answer.confidence}%
					</span>
				</div>
			)}
			{answer.dontKnow && isQuiz && (
				<div className="mt-2 text-sm text-muted-foreground">Answered “I don't know”.</div>
			)}

			{(answer.thinking ?? answer.note) && (
				/* The SAME unified row (owner round, 2026-10-05): the quiz answer's
				    thinking is the identical collapsible ThinkingBlock — one
				    geometry, but NO band on the card (owner round five, 2026-10-07:
				    the accent lift read too light); rail only, heights identical. */
				<ThinkingBlock
					testId="your-thinking"
					label="Thinking about your answer"
					text={answer.thinking ?? answer.note ?? ""}
					inCard
				/>
			)}

			{isQuiz && answer.explanation && (
				/* The TUCKED explanation — ALL questions (owner, 2026-10-07): the
				   verdict shows, the explanation sits collapsed behind the Why
				   toggle — viewable, never center stage. Identical to the
				   prediction pattern it generalizes (owner, 2026-10-03). */
				<div className="mt-2" data-testid="tucked-explanation">
					<button
						type="button"
						onClick={() => setWhyOpen((v) => !v)}
						className="inline-flex h-7 items-center rounded-full bg-(--pill) px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-(--pill-hover) hover:text-foreground"
					>
						{whyOpen ? "Hide why" : "Why"}
					</button>
					{whyOpen && (
						<div className="mt-2 rounded-xl bg-(--pill) px-4 py-3 text-sm text-foreground/70">
							<span className="font-medium text-muted-foreground">Why: </span>
							{/* Keep the first paragraph beside the label, not every paragraph:
							   later paragraphs must retain their recovered document structure. */}
							<ToolContentResponse className="inline [&>p:first-child]:inline [&>p:first-child]:m-0">{answer.explanation}</ToolContentResponse>
						</div>
					)}
				</div>
			)}

			{/* The explain reveal (owner ruling 2026-09-27): the committed answer
			    — one field, reasoning included — shown on submit; no verdict,
			    the model's next reply IS the grading. */}
			{isExplain && answer.committed && (
				<div className="mt-3 rounded-xl bg-(--pill) px-4 py-3 text-sm text-muted-foreground">
					<span className="font-medium text-foreground">The answer: </span>
					<ToolContentResponse className="inline [&>p:first-child]:inline [&>p:first-child]:m-0">{answer.committed}</ToolContentResponse>
				</div>
			)}
			</div>
			)}
		</div>
		</>
	);
}
