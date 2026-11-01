
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpenIcon, CheckIcon, ChevronDownIcon, DumbbellIcon, GraduationCapIcon } from "lucide-react";
import { MenuShell } from "@/components/menu-shell";
import { cn } from "@/lib/utils";

/** Home and the draft share one wrapping action row. Picker controls lead;
 * setup is centered only when it is the sole action. */
export function ComposerActions({ picker, setup }: { picker?: ReactNode; setup?: ReactNode }) {
	if (!picker && !setup) return null;
	return (
		<div
			data-testid="composer-actions"
			className={`pointer-events-auto mb-2 flex flex-wrap items-center gap-2 ${picker ? "justify-start" : "justify-center"}`}
		>
			{picker}
			{setup}
		</div>
	);
}

/** Count and Clear stay together if the setup action wraps onto another line.
 * These are node counts, even when a whole chain supplied the selection. */
export function NodePickerControl({ count, onOpen, onClear }: {
	count: number;
	onOpen?: () => void;
	onClear?: () => void;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<button
				type="button"
				data-testid="practice-props-chip"
				onClick={onOpen}
				className={
					"flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 font-ui text-xs transition-colors " +
					(count > 0
						? "border-border bg-card text-foreground hover:bg-accent"
						: "border-dashed border-border/80 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground")
				}
			>
				<DumbbellIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
				{count > 0 ? `${count} ${count === 1 ? "node" : "nodes"} selected` : "Pick nodes"}
			</button>
			{count > 0 && (
				<button
					type="button"
					data-testid="practice-props-clear"
					onClick={onClear}
					className="cursor-pointer rounded-full px-2 py-1 font-ui text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				>
					Clear
				</button>
			)}
		</div>
	);
}

/** The session a new chat starts as: guided teaching (the "teach" value,
 *  kept for existing selectors), the textbook style (2026-10-29), or
 *  practice. */
export type SessionMode = "teach" | "textbook" | "practice";

const SESSION_MODES: { mode: SessionMode; label: string; hint: string; Icon: typeof DumbbellIcon }[] = [
	{ mode: "teach", label: "Guided", hint: "Checks what you know, plans, then teaches", Icon: GraduationCapIcon },
	{ mode: "textbook", label: "Textbook", hint: "Chapter by chapter from your materials", Icon: BookOpenIcon },
	{ mode: "practice", label: "Practice", hint: "Mixed problems from your knowledge graph", Icon: DumbbellIcon },
];

/** Guided | Textbook | Practice — a quiet dropdown at the left of the row
 *  under the composer (home and the new-session draft share it). It opens
 *  up, like the model menu beside it. */
export function SessionModeMenu({
	mode,
	onChange,
	testIdPrefix = "home-mode",
}: {
	mode: SessionMode;
	onChange: (mode: SessionMode) => void;
	/** Kept per surface so existing selectors keep working. */
	testIdPrefix?: string;
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const current = SESSION_MODES.find((m) => m.mode === mode) ?? SESSION_MODES[0]!;

	// Outside pointerdown or Esc closes it. The menu body is portaled
	// (MenuShell), so its rows are carved out via [data-lh-menu] — the
	// model menu's discipline; otherwise a row's pointerdown eats the pick.
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			const t = e.target;
			if (t instanceof Element && t.closest("[data-lh-menu]")) return;
			if (rootRef.current && !rootRef.current.contains(t as Node)) setOpen(false);
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			// Claim the Esc: the window-level chain must not also stop
			// dictation under this menu.
			e.stopPropagation();
			setOpen(false);
			rootRef.current?.querySelector("button")?.focus();
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<div ref={rootRef} className="relative flex items-center">
			<button
				type="button"
				data-testid={`${testIdPrefix}-switch`}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={`Session type: ${current.label}`}
				onClick={() => setOpen((o) => !o)}
				className={cn(
					"flex items-center gap-1.5 whitespace-nowrap rounded-lg py-1 pl-2 pr-1.5 text-sm text-foreground transition-colors hover:bg-(--pill)",
					open && "bg-(--pill)",
				)}
			>
				<current.Icon aria-hidden className="size-4 text-muted-foreground" />
				{current.label}
				<ChevronDownIcon aria-hidden className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
			</button>
			{open && (
				<MenuShell
					anchorRef={rootRef}
					testid={`${testIdPrefix}-menu`}
					preferredSide="up"
					align="left"
					menuClass="flex w-80 flex-col gap-0.5 rounded-xl border bg-card p-1.5 text-sm shadow-xl"
				>
					<div role="menu" aria-label="Session type" className="contents">
						{SESSION_MODES.map(({ mode: m, label, hint, Icon }) => (
							<button
								key={m}
								type="button"
								role="menuitemradio"
								aria-checked={mode === m}
								data-testid={`${testIdPrefix}-${m}`}
								onClick={() => {
									onChange(m);
									setOpen(false);
								}}
								className={cn(
									"flex items-start gap-2.5 rounded-lg px-2 py-2 text-left text-card-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
									mode === m && "bg-muted/60",
								)}
							>
								<Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
								<span className="flex min-w-0 flex-1 flex-col">
									<span>{label}</span>
									<span className="text-xs text-muted-foreground">{hint}</span>
								</span>
								<CheckIcon aria-hidden className={cn("mt-0.5 size-4 shrink-0", mode === m ? "opacity-100" : "opacity-0")} />
							</button>
						))}
					</div>
				</MenuShell>
			)}
		</div>
	);
}
