import type { RunResponse, TestCase } from "@/src/core/code-runner";

/**
 * The browser side of the code runner (learn-to-program, 2026-11-02): the
 * language names the editor knows and the POST to /api/code/run. Type-only
 * imports from the engine — the runner itself is server code.
 */

export const CODE_LANGUAGE_LABELS = {
	python: "Python",
	javascript: "JavaScript",
	typescript: "TypeScript",
	c: "C",
	cpp: "C++",
	java: "Java",
	go: "Go",
	rust: "Rust",
	ruby: "Ruby",
	bash: "Bash",
} as const;

export type CodeLanguage = keyof typeof CODE_LANGUAGE_LABELS;

/** Fence tags that map to a runnable language (```py, ```js, ```c++, …). */
const FENCE_ALIASES: Record<string, CodeLanguage> = {
	python: "python",
	py: "python",
	python3: "python",
	javascript: "javascript",
	js: "javascript",
	node: "javascript",
	typescript: "typescript",
	ts: "typescript",
	c: "c",
	cpp: "cpp",
	"c++": "cpp",
	cc: "cpp",
	java: "java",
	go: "go",
	golang: "go",
	rust: "rust",
	rs: "rust",
	ruby: "ruby",
	rb: "ruby",
	bash: "bash",
	sh: "bash",
	shell: "bash",
};

export function runnableLanguage(fence: string | undefined | null): CodeLanguage | null {
	if (!fence) return null;
	return FENCE_ALIASES[fence.trim().toLowerCase()] ?? null;
}

export async function runCodeRequest(
	body: { language: CodeLanguage; code: string; stdin?: string; tests?: TestCase[] },
	signal?: AbortSignal,
): Promise<RunResponse> {
	const res = await fetch("/api/code/run", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
		signal,
	});
	if (!res.ok) throw new Error((await res.text()) || `The run failed (${res.status}).`);
	return (await res.json()) as RunResponse;
}

export type { RunResponse, TestCase, TestResult } from "@/src/core/code-runner";
