import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RunResponse, TestResult } from "@/components/code-run";

/**
 * What a run printed (learn-to-program, 2026-11-02): console output, the
 * compiler's complaint, the not-installed notice, and per-test results —
 * shared by the exercise dock and the Try-it scratch editor.
 */

const PRE = "whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed";

export function RunOutput({ result, error, running }: { result: RunResponse | null; error?: string | null; running?: boolean }) {
	if (running) return <div className="px-3 py-2 font-mono text-xs text-muted-foreground">Running…</div>;
	if (error) return <div className={cn(PRE, "px-3 py-2 text-destructive")}>{error}</div>;
	if (!result) return <div className="px-3 py-2 text-xs text-muted-foreground">Run your code to see its output here.</div>;
	if (!result.ok && result.reason === "not-installed") {
		return (
			<div className="space-y-1 px-3 py-2 text-sm" data-testid="run-not-installed">
				<div className="font-medium text-foreground">{result.toolchain.label} isn't installed on this computer.</div>
				<div className="text-muted-foreground">{result.toolchain.install}</div>
				<div className="text-xs text-muted-foreground">Ask the teacher if you want help setting it up.</div>
			</div>
		);
	}
	if (!result.ok) {
		return (
			<div className="px-3 py-2">
				<div className="mb-1 text-xs font-medium text-destructive">Didn't compile</div>
				<pre className={cn(PRE, "text-foreground/90")}>{result.compile.stderr || result.compile.stdout}</pre>
			</div>
		);
	}
	return (
		<div className="space-y-2 px-3 py-2">
			{result.run && (
				<div data-testid="run-console">
					<pre className={cn(PRE, "text-foreground")}>{result.run.stdout || <span className="text-muted-foreground">(no output)</span>}</pre>
					{result.run.stderr && <pre className={cn(PRE, "text-destructive/90")}>{result.run.stderr}</pre>}
					<div className="mt-1 text-[11px] text-muted-foreground">
						{result.run.timedOut
							? "Stopped after 10 seconds — is there an infinite loop?"
							: `exit ${result.run.exitCode ?? "—"} · ${result.run.durationMs} ms`}
						{result.run.truncated && " · output cut short"}
					</div>
				</div>
			)}
			{result.tests && <TestList tests={result.tests} />}
		</div>
	);
}

export function TestList({ tests }: { tests: TestResult[] }) {
	const passed = tests.filter((t) => t.passed).length;
	return (
		<div data-testid="run-tests">
			<div className={cn("mb-1 text-xs font-medium", passed === tests.length ? "text-emerald-400" : "text-muted-foreground")}>
				{passed}/{tests.length} tests passing
			</div>
			<ul className="space-y-1.5">
				{tests.map((t) => (
					<li key={t.name} className="text-sm">
						<div className="flex items-center gap-1.5">
							{t.passed ? <CheckIcon className="size-3.5 text-emerald-400" /> : <XIcon className="size-3.5 text-destructive" />}
							<span className={t.passed ? "text-foreground" : "text-foreground/90"}>{t.name}</span>
							{t.hidden && <span className="text-[11px] text-muted-foreground">hidden</span>}
						</div>
						{!t.passed && !t.hidden && (
							<div className="mt-1 ml-5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
								{t.stdin !== undefined && (
									<>
										<span className="text-muted-foreground">input</span>
										<pre className={PRE}>{t.stdin}</pre>
									</>
								)}
								<span className="text-muted-foreground">expected</span>
								<pre className={PRE}>{t.expected}</pre>
								<span className="text-muted-foreground">got</span>
								<pre className={cn(PRE, "text-destructive/90")}>{t.timedOut ? "(timed out)" : t.actual || "(nothing)"}</pre>
								{t.stderr && (
									<>
										<span className="text-muted-foreground">error</span>
										<pre className={cn(PRE, "text-destructive/90")}>{t.stderr}</pre>
									</>
								)}
							</div>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
