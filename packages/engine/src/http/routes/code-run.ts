/**
 * POST /api/code/run — run the learner's code with the toolchain installed
 * on this machine (core/code-runner.ts). Body: { language, code, stdin?,
 * tests? }. The editor dock's Run / Run tests and the lesson's Try-it
 * scratch editor both land here.
 */

import { isCodeLanguage, runCode, type TestCase } from "../../core/code-runner.ts";

const MAX_CODE = 200_000;
const MAX_TESTS = 30;

function parseTests(raw: unknown): TestCase[] | null {
	if (raw === undefined) return [];
	if (!Array.isArray(raw) || raw.length > MAX_TESTS) return null;
	const out: TestCase[] = [];
	for (const t of raw) {
		if (typeof t !== "object" || t === null) return null;
		const { name, stdin, expected, hidden } = t as Record<string, unknown>;
		if (typeof name !== "string" || typeof expected !== "string") return null;
		if (stdin !== undefined && typeof stdin !== "string") return null;
		out.push({ name, expected, ...(typeof stdin === "string" ? { stdin } : {}), ...(hidden === true ? { hidden: true } : {}) });
	}
	return out;
}

export async function POST(req: Request) {
	let body: Record<string, unknown>;
	try {
		body = (await req.json()) as Record<string, unknown>;
	} catch {
		return new Response("body must be JSON", { status: 400 });
	}
	if (!isCodeLanguage(body.language)) return new Response("unknown language", { status: 400 });
	if (typeof body.code !== "string" || body.code.length > MAX_CODE) return new Response("code must be a string", { status: 400 });
	if (body.stdin !== undefined && typeof body.stdin !== "string") return new Response("stdin must be a string", { status: 400 });
	const tests = parseTests(body.tests);
	if (tests === null) return new Response("tests must be [{name, expected, stdin?, hidden?}]", { status: 400 });
	const result = await runCode({
		language: body.language,
		code: body.code,
		...(typeof body.stdin === "string" ? { stdin: body.stdin } : {}),
		tests,
		signal: req.signal,
	});
	return Response.json(result);
}
