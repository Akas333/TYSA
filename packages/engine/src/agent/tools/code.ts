/**
 * THE CODING TOOLS (learn-to-program, 2026-11-02): the teacher's hands on
 * the learner's machine, for lessons that teach programming.
 *
 * - `toolchains` (server): which languages this machine can run, with the
 *   install hint for each missing one.
 * - `run_code` (server): run a snippet with the installed toolchain — check
 *   an example's output before showing it, reproduce the learner's bug.
 * - `code_exercise` (CLIENT-ANSWERED, a question tool): pose a coding task;
 *   the editor dock replaces the composer, the learner writes, runs and
 *   tests, then submits. The submission (code + test results) returns as
 *   this call's result, exactly like a quiz answer.
 *
 * Mechanics-only descriptions: when and how to use them lives in
 * prompts/teacher/60-coding.md.
 */

import { Type, type Static } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { CODE_LANGUAGES, detectToolchain, detectToolchains, isCodeLanguage, runCode, type CodeLanguage, type RunResponse } from "../../core/code-runner.ts";
import { invalidInputResult, questionResult, serverExecute } from "../tool-execute.ts";

export const CODE_EXERCISE_TOOL = "code_exercise";

// A union over a .map() array (not a tuple) types its Static as never, so
// Unsafe names the type; the schema itself is the same anyOf of literals.
const languageSchema = Type.Unsafe<CodeLanguage>(
	Type.Union(
		CODE_LANGUAGES.map((l) => Type.Literal(l)),
		{ description: `REQUIRED — one of: ${CODE_LANGUAGES.join(", ")} (bare word, no quotes).` },
	),
);

const testSchema = Type.Object({
	name: Type.String({ description: "Short label the learner sees, e.g. \"two negatives\"." }),
	stdin: Type.Optional(Type.String({ description: "Text fed to the program's standard input." })),
	expected: Type.String({ description: "The exact standard output expected (trailing whitespace is ignored)." }),
	hidden: Type.Optional(Type.Boolean({ description: "true = the learner sees only pass/fail, never the input or expected output." })),
});

// ─── toolchains ──────────────────────────────────────────────────────────────

const toolchainsInput = Type.Object({});

export const toolchainsTool: AgentTool<typeof toolchainsInput> = {
	name: "toolchains",
	label: "toolchains",
	description:
		"List the programming languages installed on the learner's computer (with versions) and how to install each missing one. " +
		"Takes no arguments.",
	parameters: toolchainsInput,
	execute: serverExecute("toolchains", toolchainsInput, () =>
		detectToolchains()
			.map((t) => (t.installed ? `${t.language}: installed — ${t.version}` : `${t.language}: NOT installed — ${t.install}`))
			.join("\n"),
	),
};

// ─── run_code ────────────────────────────────────────────────────────────────

const runCodeInput = Type.Object({
	language: languageSchema,
	code: Type.String({ description: "REQUIRED — the complete program (Java: `public class Main`)." }),
	stdin: Type.Optional(Type.String({ description: "Text fed to standard input." })),
	tests: Type.Optional(Type.Array(testSchema, { maxItems: 8, description: "Optional stdin → expected-stdout checks (max 8)." })),
});

/** The run result as the model reads it — compact, honest, capped. */
export function describeRun(result: RunResponse): string {
	if (!result.ok && result.reason === "not-installed") {
		return `${result.toolchain.label} is NOT installed on the learner's computer. Install: ${result.toolchain.install}`;
	}
	if (!result.ok) {
		return `Compile error (exit ${result.compile.exitCode}):\n${clip(result.compile.stderr || result.compile.stdout)}`;
	}
	const parts: string[] = [];
	if (result.run) {
		const r = result.run;
		parts.push(
			`exit ${r.exitCode ?? "killed"}${r.timedOut ? " (TIMED OUT)" : ""}${r.truncated ? " (output truncated)" : ""} · ${r.durationMs}ms`,
			`stdout:\n${clip(r.stdout) || "(empty)"}`,
			...(r.stderr ? [`stderr:\n${clip(r.stderr)}`] : []),
		);
	}
	for (const t of result.tests ?? []) {
		parts.push(
			`test "${t.name}": ${t.passed ? "PASS" : "FAIL"}` +
				(t.passed || t.hidden ? "" : `\n  expected: ${JSON.stringify(t.expected)}\n  actual:   ${JSON.stringify(clip(t.actual ?? "", 400))}`),
		);
	}
	return parts.join("\n");
}

function clip(text: string, max = 4000): string {
	return text.length > max ? `${text.slice(0, max)}\n… (${text.length - max} more chars)` : text;
}

export const runCodeTool: AgentTool<typeof runCodeInput> = {
	name: "run_code",
	label: "run_code",
	description:
		"Run a program on the learner's computer with its installed toolchain and get stdout, stderr, exit code — and, " +
		"with `tests`, pass/fail per test. 10-second limit per run. Nothing is shown to the learner.",
	parameters: runCodeInput,
	execute: serverExecute("run_code", runCodeInput, async (input, { signal }) =>
		describeRun(await runCode({ language: input.language, code: input.code, stdin: input.stdin, tests: input.tests, signal })),
	),
};

// ─── code_exercise ───────────────────────────────────────────────────────────

export const codeExerciseInput = Type.Object({
	language: languageSchema,
	title: Type.String({ description: "REQUIRED — a short name for the task (3–8 words)." }),
	prompt: Type.String({
		description: "REQUIRED — the task as the learner reads it (markdown): what the program must do, input/output format, one worked example.",
	}),
	starterCode: Type.String({
		description: "REQUIRED — the code the editor opens with: a skeleton with the I/O already handled where that isn't the point. May be empty.",
	}),
	tests: Type.Array(testSchema, {
		minItems: 1,
		maxItems: 12,
		description: "REQUIRED — 1–12 stdin → expected-stdout tests. Make the first one or two visible; hide the edge cases.",
	}),
	solution: Type.String({
		description: "REQUIRED — your reference solution. Hidden from the learner; it must pass every test (it is run before the task is posed).",
	}),
});

export type CodeExerciseInput = Static<typeof codeExerciseInput>;

export const codeExerciseTool: AgentTool<typeof codeExerciseInput> = {
	name: CODE_EXERCISE_TOOL,
	label: CODE_EXERCISE_TOOL,
	description:
		"Pose a coding exercise. The learner gets an editor with your starter code, a Run button, the tests, and Submit. " +
		"Your reference solution is run against the tests first; the call fails if it does not pass them all (fix and re-call), " +
		"or if the language is not installed (guide the install first). A clean call ENDS your turn — the learner's submission " +
		"(their code + per-test results) arrives as this call's result. One exercise per turn.",
	parameters: codeExerciseInput,
	executionMode: "sequential",
	execute: async (_toolCallId, input, signal) => {
		const problems: string[] = [];
		if (!isCodeLanguage(input.language)) problems.push(`language must be one of ${CODE_LANGUAGES.join(", ")}`);
		const names = new Set<string>();
		for (const t of input.tests) {
			if (names.has(t.name)) problems.push(`test names must be unique ("${t.name}" repeats)`);
			names.add(t.name);
		}
		if (!input.tests.some((t) => !t.hidden)) problems.push("at least one test must be visible (hidden: false or absent)");
		if (problems.length > 0) return invalidInputResult(CODE_EXERCISE_TOOL, problems);
		const toolchain = detectToolchain(input.language);
		if (!toolchain.installed) {
			return invalidInputResult(CODE_EXERCISE_TOOL, [
				`${toolchain.label} is not installed on the learner's computer. Walk them through installing it first: ${toolchain.install}`,
			]);
		}
		// Run unhidden so a failure shows the teacher every expected/actual pair.
		const tests = input.tests.map((t) => ({ ...t, hidden: false }));
		const check = await runCode({ language: input.language, code: input.solution, tests, signal });
		if (!check.ok || check.tests?.some((t) => !t.passed)) {
			return invalidInputResult(CODE_EXERCISE_TOOL, [
				"your reference solution does not pass your own tests — fix the solution or the tests and re-call:\n" + describeRun(check),
			]);
		}
		return questionResult();
	},
};

export function codeTools(): Record<string, AgentTool<any>> {
	return { toolchains: toolchainsTool, run_code: runCodeTool, [CODE_EXERCISE_TOOL]: codeExerciseTool };
}
