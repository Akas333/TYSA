import { useEffect, useRef, useState } from "react";
import { PlayIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/code-editor";
import { RunOutput } from "@/components/code-output";
import { CODE_LANGUAGE_LABELS, runCodeRequest, type CodeLanguage, type RunResponse } from "@/components/code-run";
import { usePhoneScreen } from "@/lib/use-phone-screen";

/**
 * The Try-it scratch editor (learn-to-program, 2026-11-02): opens under a
 * lesson code block, seeded with its source. Edit, run (⌘↵), see the
 * output — nothing is sent to the teacher. Lazy-loaded by md-blocks so the
 * editor costs nothing until someone presses Try it.
 */
export default function CodeScratch({ language, source, onClose }: { language: CodeLanguage; source: string; onClose: () => void }) {
	const phone = usePhoneScreen();
	const codeRef = useRef(source);
	const [resetKey, setResetKey] = useState(0);
	const [stdin, setStdin] = useState("");
	const [stdinOpen, setStdinOpen] = useState(false);
	const [result, setResult] = useState<RunResponse | null>(null);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	useEffect(() => () => abortRef.current?.abort(), []);

	const run = async () => {
		abortRef.current?.abort();
		const ac = new AbortController();
		abortRef.current = ac;
		setRunning(true);
		setError(null);
		try {
			setResult(await runCodeRequest({ language, code: codeRef.current, stdin }, ac.signal));
		} catch (err) {
			if ((err as Error).name !== "AbortError") setError((err as Error).message);
		} finally {
			if (abortRef.current === ac) setRunning(false);
		}
	};

	return (
		<div className="mt-2 overflow-hidden rounded-xl border border-border bg-background/60" data-testid="code-scratch">
			<div className="flex items-center gap-1 border-b border-border px-2 py-1">
				<span className="px-1 text-xs font-medium text-muted-foreground">Try it · {CODE_LANGUAGE_LABELS[language]}</span>
				<div className="flex-1" />
				<Button
					type="button"
					variant="ghost"
					size="sm"
					title="Back to the original code"
					onClick={() => {
						codeRef.current = source;
						setResetKey((k) => k + 1);
						setResult(null);
					}}
				>
					<RotateCcwIcon className="size-3.5" />
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={() => setStdinOpen((o) => !o)}>
					{stdinOpen ? "Hide input" : "Input"}
				</Button>
				<Button type="button" variant="outline" size="sm" disabled={running} onClick={() => void run()} data-testid="scratch-run">
					<PlayIcon className="size-3.5" />
					Run{!phone && <span className="text-muted-foreground">⌘↵</span>}
				</Button>
				<Button type="button" variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
					<XIcon className="size-3.5" />
				</Button>
			</div>
			<CodeEditor
				language={language}
				value={source}
				onChange={(v) => {
					codeRef.current = v;
				}}
				onRun={() => void run()}
				resetKey={resetKey}
				autoFocus={!phone}
				className="max-h-[50vh] min-h-24 overflow-auto"
			/>
			{stdinOpen && (
				<textarea
					value={stdin}
					onChange={(e) => setStdin(e.target.value)}
					placeholder="Input for Run (what your program reads)"
					rows={2}
					className="w-full border-t border-border bg-transparent px-3 py-2 font-mono text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
				/>
			)}
			{(result || running || error) && (
				<div className="max-h-64 overflow-y-auto border-t border-border">
					<RunOutput result={result} error={error} running={running} />
				</div>
			)}
		</div>
	);
}
