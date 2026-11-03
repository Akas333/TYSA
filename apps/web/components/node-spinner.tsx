import { LoaderMark } from "@/components/thinking-loader";
import { cn } from "@/lib/utils";

/**
 * The compact working-state indicator (sidebar rows, tool cards, thinking):
 * the turn loader's mark — three nodes on one link, drawn node to node —
 * without its label (owner, 2026-11-02: it replaced the braille dots). CSS
 * motion only (globals.css .lh-weave-*); it exists only while work is in
 * flight.
 */
export function NodeSpinner({
	className,
	label = "Working",
}: {
	/** Sizing/position classes; height drives the scale. */
	className?: string;
	/** The accessible name of the state this spinner announces. */
	label?: string;
}) {
	return (
		<span role="status" aria-label={label} data-testid="node-spinner" className={cn("inline-flex shrink-0 items-center", className)}>
			<LoaderMark className="h-3" />
		</span>
	);
}
