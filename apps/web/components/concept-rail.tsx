import { useState } from "react";
import { cn } from "@/lib/utils";

export interface RailConcept {
	id: string;
	title: string;
	number: number;
}

/**
 * The concept rail: a quiet column of ticks at the transcript's right edge,
 * one per concept the lesson has reached (owner, 2026-11-02 — the plan stays
 * out of the chat, and the way back through it is a marker, not a chart).
 * The concept being read draws long and bright; hovering opens the titles
 * beside the ticks, and a click scrolls to that concept's divider. It only
 * ever lists reached concepts, so it grows one tick at a time.
 */
export function ConceptRail({
	concepts,
	viewingId,
	onJump,
}: {
	concepts: readonly RailConcept[];
	viewingId: string | null;
	onJump: (nodeId: string) => void;
}) {
	const [open, setOpen] = useState(false);
	if (concepts.length < 2) return null;
	return (
		<nav
			aria-label="Concepts in this lesson"
			data-testid="concept-rail"
			onMouseEnter={() => setOpen(true)}
			onMouseLeave={() => setOpen(false)}
			onFocus={() => setOpen(true)}
			onBlur={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
			}}
			className="absolute top-20 right-1 z-30 hidden md:block"
		>
			<ol
				className={cn(
					"flex flex-col items-end rounded-xl border py-2 transition-[background-color,border-color,box-shadow,padding] duration-150",
					open ? "border-border bg-popover/95 pr-2 pl-3 shadow-lg backdrop-blur" : "border-transparent px-0",
				)}
			>
				{concepts.map((c) => {
					const active = c.id === viewingId;
					return (
						<li key={c.id}>
							<button
								type="button"
								data-testid={`concept-rail-${c.id}`}
								aria-current={active ? "location" : undefined}
								aria-label={`${c.number}. ${c.title}`}
								onClick={() => onJump(c.id)}
								className="group flex h-6 items-center justify-end gap-3 outline-none"
							>
								{open && (
									<span
										className={cn(
											"max-w-[16rem] truncate text-xs transition-colors",
											active ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground",
										)}
									>
										<span className="mr-1.5 tabular-nums opacity-60">{c.number}</span>
										{c.title}
									</span>
								)}
								<span
									aria-hidden
									className={cn(
										"h-0.5 shrink-0 rounded-full transition-all duration-200",
										active ? "w-4 bg-foreground" : "w-2.5 bg-muted-foreground/50 group-hover:bg-foreground/80",
									)}
								/>
							</button>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
