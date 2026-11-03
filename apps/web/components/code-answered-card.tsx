import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { ToolContentResponse } from "@/components/ai-elements/message";
import { TestList } from "@/components/code-output";
import { CODE_LANGUAGE_LABELS, type CodeLanguage } from "@/components/code-run";
import { cn } from "@/lib/utils";
import type { QuestionAnswerData } from "@/src/core";

/**
 * A submitted coding exercise in the transcript (learn-to-program,
 * 2026-11-02): rests collapsed like the answered question cards — title and
 * score as the header; the code (a runnable fenced block, so Try it works on
 * it too) and the per-test results open beneath.
 */
export function CodeAnsweredCard({ answer, input }: { answer: QuestionAnswerData; input?: unknown }) {
	const [open, setOpen] = useState(false);
	const title = answer.questionText || (input as { title?: string } | undefined)?.title || "Exercise";
	if (answer.dismissed || !answer.code) {
		return (
			<div className="rounded-2xl border border-input/70 bg-card p-4 text-sm text-muted-foreground">
				<span className="font-medium">{title}</span> — skipped
			</div>
		);
	}
	const c = answer.code;
	const tests = c.tests ?? [];
	const passed = tests.filter((t) => t.passed).length;
	const status = c.stuck
		? "asked for help"
		: c.runError
			? c.runError
			: c.compileError
				? "didn't compile"
				: tests.length > 0
					? `${passed}/${tests.length} tests passing`
					: "submitted";
	const allPass = !c.stuck && tests.length > 0 && passed === tests.length;
	const label = CODE_LANGUAGE_LABELS[c.language as CodeLanguage] ?? c.language;
	return (
		<div className="rounded-2xl border border-input/70 bg-card text-sm" data-testid="code-answered-card">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left"
			>
				<span className="text-xs font-medium text-muted-foreground">Exercise · {label}</span>
				<span className="min-w-0 flex-1 truncate font-medium text-foreground">{title}</span>
				<span className={cn("shrink-0 text-xs", allPass ? "text-emerald-400" : "text-muted-foreground")}>{status}</span>
				<ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
			</button>
			{open && (
				<div className="space-y-3 border-t border-border px-4 pt-2 pb-4">
					<div className="lh-prose text-[14px]">
						<ToolContentResponse>{"```" + c.language + "\n" + c.source + "\n```"}</ToolContentResponse>
					</div>
					{c.compileError && <pre className="whitespace-pre-wrap font-mono text-xs text-destructive/90">{c.compileError}</pre>}
					{tests.length > 0 && <TestList tests={tests} />}
				</div>
			)}
		</div>
	);
}
