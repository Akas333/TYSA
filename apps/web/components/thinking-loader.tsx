import { useEffect, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

/**
 * The turn loader (2026-10-29, reworked 2026-10-31): the chat's "a turn is
 * in flight" line. Its mark speaks the plan map's language — three round
 * nodes on one link. Each cycle the link draws from the first node to the
 * last, every node lights as the line reaches it and stays lit, the last
 * one pings, then the whole chain fades and starts again: a plan being
 * built, not a blinking light. Then the state in sentence case, and, once
 * the turn has run a few seconds, how long.
 *
 * CSS-only motion (globals.css .lh-weave-*): compositor-friendly
 * transforms and opacity plus one dash offset; reduced motion shows a
 * still mark with the first node lit. The line fades in on mount
 * (lh-card-enter) so it never pops.
 */

/** The nodes' centres, in the mark's viewBox units. */
const NODES = [4, 15, 26] as const;

/** Whole seconds since mount, ticking once a second. */
function useElapsedSeconds(): number {
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		const started = Date.now();
		const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
		return () => clearInterval(id);
	}, []);
	return seconds;
}

/** The elapsed time stays hidden for quick turns. */
const SHOW_ELAPSED_AFTER_S = 3;

export function ThinkingLoader({ label, className, testId }: { label: string; className?: string; testId?: string }) {
	const elapsed = useElapsedSeconds();
	return (
		<span
			role="status"
			aria-label={label}
			data-testid={testId ?? "thinking-loader"}
			className={cn("lh-card-enter flex items-center gap-2.5 text-[13px] text-muted-foreground", className)}
		>
			<LoaderMark className="h-4" />
			<Shimmer as="span" duration={1.8}>
				{label}
			</Shimmer>
			{elapsed >= SHOW_ELAPSED_AFTER_S && <span className="tabular-nums text-muted-foreground/60">{elapsed}s</span>}
		</span>
	);
}

/**
 * The loader's mark on its own: three nodes on one link, drawn node to
 * node. The turn line uses it beside its label; NodeSpinner is the compact
 * working state (sidebar rows, tool cards). Height sets the size.
 */
export function LoaderMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 30 12" className={cn("w-auto shrink-0 overflow-visible", className)} aria-hidden>
			<line x1={NODES[0]} y1={6} x2={NODES[2]} y2={6} strokeWidth={1} strokeLinecap="round" className="stroke-border" />
			<line
				x1={NODES[0]}
				y1={6}
				x2={NODES[2]}
				y2={6}
				pathLength={1}
				strokeWidth={1.4}
				strokeLinecap="round"
				className="lh-weave-link stroke-primary"
			/>
			{NODES.map((cx) => (
				<circle key={`base-${cx}`} cx={cx} cy={6} r={2.6} strokeWidth={1} className="fill-card stroke-border" />
			))}
			<circle cx={NODES[2]} cy={6} r={2.6} className="lh-weave-halo fill-primary" />
			{NODES.map((cx, i) => (
				<circle key={`lit-${cx}`} cx={cx} cy={6} r={2.6} data-i={i} className="lh-weave-node fill-primary" />
			))}
		</svg>
	);
}
