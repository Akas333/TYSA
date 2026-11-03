import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { ToolContentResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/code-editor";
import { RunOutput } from "@/components/code-output";
import { CODE_LANGUAGE_LABELS, runCodeRequest, type CodeLanguage, type RunResponse, type TestCase } from "@/components/code-run";
import { cn } from "@/lib/utils";
import { usePhoneScreen } from "@/lib/use-phone-screen";
import type { CodeSubmission, QuestionAnswerData } from "@/src/core";

/**
 * The coding-exercise dock (learn-to-program, 2026-11-02): a pending
 * `code_exercise` replaces the composer, like a question does. The task
 * above, the editor in the middle, the console below. Run (⌘↵) runs the
 * program with optional input; Run tests runs the teacher's tests; Submit
 * runs them on the current code and sends code + results as the call's
 * answer. "I'm stuck" sends the same with `stuck` — the teacher hints
 * instead of grading.
 *
 * The draft survives reloads in localStorage (per exercise call), so a
 * half-written program is never lost to a refresh.
 */

export interface CodeExerciseView {
	language: CodeLanguage;
	title: string;
	prompt: string;
	starterCode: string;
	tests: TestCase[];
}

export interface CodeDockProps {
	toolCallId: string;
	input: CodeExerciseView;
	expanded: boolean;
	onExpand: () => void;
	onSubmit: (output: QuestionAnswerData) => void;
	compactionRunning?: boolean;
}

const draftKey = (id: string) => `axiom:code-draft:${id}`;

function readDraft(id: string): string | null {
	try {
		return localStorage.getItem(draftKey(id));
	} catch {
		return null;
	}
}

function writeDraft(id: string, code: string) {
	try {
		localStorage.setItem(draftKey(id), code);
	} catch {
		// storage unavailable — the draft lives in memory only
	}
}

export function clearCodeDraft(id: string) {
	try {
		localStorage.removeItem(draftKey(id));
	} catch {
		// nothing to clear
	}
}

/** The submission record from a run (pure — the dock's only grading). */
export function submissionFrom(language: string, source: string, result: RunResponse | null, stuck: boolean): CodeSubmission {
	const base: CodeSubmission = { language, source, ...(stuck ? { stuck: true } : {}) };
	if (!result) return base;
	if (!result.ok && result.reason === "not-installed") return { ...base, runError: `${result.toolchain.label} is not installed` };
	if (!result.ok) return { ...base, compileError: result.compile.stderr || result.compile.stdout };
	return {
		...base,
		tests: (result.tests ?? []).map((t) => ({
			name: t.name,
			hidden: t.hidden,
			passed: t.passed,
			...(t.hidden ? {} : { expected: t.expected, actual: t.actual }),
		})),
	};
}

export function CodeDock({ toolCallId, input, expanded, onExpand, onSubmit, compactionRunning = false }: CodeDockProps) {
	const phone = usePhoneScreen();
	const language = input.language;
	const [code, setCode] = useState(() => readDraft(toolCallId) ?? input.starterCode ?? "");
	const codeRef = useRef(code);
	const [resetKey, setResetKey] = useState(0);
	const [stdin, setStdin] = useState("");
	const [stdinOpen, setStdinOpen] = useState(false);
	const [promptOpen, setPromptOpen] = useState(true);
	const [result, setResult] = useState<RunResponse | null>(null);
	/** The source the shown test result belongs to — Submit reuses it when unchanged. */
	const [testedSource, setTestedSource] = useState<string | null>(null);
	const [running, setRunning] = useState<null | "run" | "tests" | "submit">(null);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	useEffect(() => () => abortRef.current?.abort(), []);

	const change = (v: string) => {
		codeRef.current = v;
		setCode(v);
		writeDraft(toolCallId, v);
	};

	const exec = async (kind: "run" | "tests" | "submit"): Promise<RunResponse | null> => {
		abortRef.current?.abort();
		const ac = new AbortController();
		abortRef.current = ac;
		const source = codeRef.current;
		setRunning(kind);
		setError(null);
		try {
			const res = await runCodeRequest(
				kind === "run" ? { language, code: source, stdin } : { language, code: source, tests: input.tests },
				ac.signal,
			);
			setResult(res);
			setTestedSource(kind === "run" ? null : source);
			return res;
		} catch (err) {
			if ((err as Error).name !== "AbortError") setError((err as Error).message);
			return null;
		} finally {
			if (abortRef.current === ac) setRunning(null);
		}
	};

	const submit = async (stuck: boolean) => {
		if (compactionRunning || running) return;
		const source = codeRef.current;
		const res = testedSource === source && result ? result : await exec("submit");
		onSubmit({
			kind: "code",
			tool: "code_exercise",
			questionText: input.title,
			dontKnow: false,
			answers: [],
			code: submissionFrom(language, source, res, stuck),
			answeredAt: new Date().toISOString(),
		});
		clearCodeDraft(toolCallId);
	};

	if (!expanded) {
		return (
			<button
				type="button"
				data-testid="code-dock-bar"
				onClick={onExpand}
				className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<ChevronRightIcon className="size-4 shrink-0 rotate-90" />
				<span className="font-medium">Exercise</span>
				<span className="min-w-0 flex-1 truncate">{input.title}</span>
			</button>
		);
	}

	const visibleTests = input.tests.filter((t) => !t.hidden).length;
	return (
		<div data-testid="code-dock" data-exercise={toolCallId} className="flex min-h-0 flex-col overflow-y-auto">
			<div className="shrink-0 px-4 pt-3 pb-2">
				<button
					type="button"
					onClick={() => setPromptOpen((o) => !o)}
					className="mb-1 flex w-full cursor-pointer items-center gap-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
				>
					<ChevronRightIcon className={cn("size-3.5 transition-transform", promptOpen && "rotate-90")} />
					Exercise · {CODE_LANGUAGE_LABELS[language] ?? language}
					<span className="min-w-0 flex-1 truncate text-foreground">{input.title}</span>
				</button>
				{promptOpen && (
					<div className="lh-prose max-h-56 overflow-y-auto text-[15px]">
						<ToolContentResponse>{input.prompt}</ToolContentResponse>
					</div>
				)}
			</div>

			<div className="mx-2 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background/60">
				<CodeEditor
					language={language}
					value={code}
					onChange={change}
					onRun={() => void exec("run")}
					resetKey={`${toolCallId}:${resetKey}`}
					autoFocus={!phone}
					className="max-h-[42vh] min-h-40 overflow-auto"
				/>
				{stdinOpen && (
					<textarea
						data-testid="code-stdin"
						value={stdin}
						onChange={(e) => setStdin(e.target.value)}
						placeholder="Input for Run (what your program reads)"
						rows={2}
						className="border-t border-border bg-transparent px-3 py-2 font-mono text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
					/>
				)}
				<div className="max-h-48 overflow-y-auto border-t border-border" data-testid="code-output">
					<RunOutput result={result} error={error} running={running !== null} />
				</div>
			</div>

			<div className="flex shrink-0 flex-wrap items-center gap-1.5 px-2 pt-2 pb-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					title="Start over from the starter code"
					onClick={() => {
						change(input.starterCode ?? "");
						setResetKey((k) => k + 1);
						setResult(null);
					}}
				>
					<RotateCcwIcon className="size-3.5" />
					Reset
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={() => setStdinOpen((o) => !o)}>
					{stdinOpen ? "Hide input" : "Input"}
				</Button>
				<div className="flex-1" />
				<Button type="button" variant="outline" size="sm" disabled={running !== null} onClick={() => void exec("run")} data-testid="code-run">
					<PlayIcon className="size-3.5" />
					Run{!phone && <span className="text-muted-foreground">⌘↵</span>}
				</Button>
				<Button type="button" variant="outline" size="sm" disabled={running !== null} onClick={() => void exec("tests")} data-testid="code-run-tests">
					Run tests{visibleTests < input.tests.length ? ` (${input.tests.length})` : ""}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={running !== null || compactionRunning}
					onClick={() => void submit(true)}
					data-testid="code-stuck"
				>
					I'm stuck
				</Button>
				<Button
					type="button"
					size="sm"
					disabled={running !== null || compactionRunning}
					onClick={() => void submit(false)}
					data-testid="code-submit"
					className="rounded-xl px-3.5 font-medium"
				>
					{running === "submit" ? "Checking…" : "Submit"}
				</Button>
			</div>
		</div>
	);
}
