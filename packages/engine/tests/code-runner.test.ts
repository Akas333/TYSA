/**
 * The learn-to-program runner and tools (2026-11-02): output matching, the
 * real run path (with the Node that runs these tests — always installed),
 * the code_exercise gate that runs the teacher's own solution, and the
 * submission as the model reads it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { outputsMatch, runCode } from "../src/core/code-runner.ts";
import { codeExerciseTool, describeRun } from "../src/agent/tools/code.ts";
import { compactAnswerForModel } from "../src/core/question-core.ts";
import { QUESTION_TOOLS, toolQuestionKind } from "../src/core/pending.ts";

test("outputs match across line endings and trailing whitespace, not content", () => {
	assert.equal(outputsMatch("6  \r\n", "6"), true);
	assert.equal(outputsMatch("a\nb\n\n", "a\nb"), true);
	assert.equal(outputsMatch("6", "7"), false);
	assert.equal(outputsMatch(" 6", "6"), true); // whole-output trim
});

test("runs a program with stdin and grades tests, hiding hidden ones", async () => {
	const code = "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(Number(s)*2));";
	const res = await runCode({
		language: "javascript",
		code,
		tests: [
			{ name: "visible", stdin: "3", expected: "6" },
			{ name: "secret", stdin: "4", expected: "9", hidden: true },
		],
	});
	assert.ok(res.ok);
	assert.equal(res.tests?.[0]?.passed, true);
	assert.deepEqual(res.tests?.[1], { name: "secret", hidden: true, passed: false });
});

test("a crashing program fails its test and reports stderr", async () => {
	const res = await runCode({ language: "javascript", code: "throw new Error('boom')", tests: [{ name: "t", expected: "" }] });
	assert.ok(res.ok);
	assert.equal(res.tests?.[0]?.passed, false);
	assert.match(res.tests?.[0]?.stderr ?? "", /boom/);
	assert.match(describeRun(res), /test "t": FAIL/);
});

const exercise = {
	language: "javascript" as const,
	title: "Double it",
	prompt: "Read n, print 2n.",
	starterCode: "",
	tests: [{ name: "three", stdin: "3", expected: "6" }],
	solution: "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(Number(s)*2));",
};

test("code_exercise poses (terminates) when the reference solution passes", async () => {
	const result = await codeExerciseTool.execute("call-1", exercise);
	assert.equal(result.terminate, true);
});

test("code_exercise refuses a solution that fails its own tests", async () => {
	const result = await codeExerciseTool.execute("call-2", { ...exercise, solution: "console.log(5)" });
	assert.notEqual(result.terminate, true);
	const text = result.content.map((c) => (c.type === "text" ? c.text : "")).join("");
	assert.match(text, /does not pass your own tests/);
});

test("code_exercise needs at least one visible test", async () => {
	const result = await codeExerciseTool.execute("call-3", { ...exercise, tests: [{ ...exercise.tests[0]!, hidden: true }] });
	assert.notEqual(result.terminate, true);
});

test("code_exercise is a question tool with its own answer kind", () => {
	assert.ok((QUESTION_TOOLS as readonly string[]).includes("code_exercise"));
	assert.equal(toolQuestionKind("code_exercise"), "code");
});

test("the model reads the submission: code, score, and failing visible tests only", () => {
	const out = compactAnswerForModel({
		kind: "code",
		questionText: "Double it",
		dontKnow: false,
		answers: [],
		code: {
			language: "python",
			source: "print(int(input())*3)",
			tests: [
				{ name: "a", hidden: false, passed: false, expected: "6", actual: "9\n" },
				{ name: "b", hidden: true, passed: false },
				{ name: "c", hidden: false, passed: true, expected: "0", actual: "0" },
			],
		},
		answeredAt: "2026-11-02T00:00:00.000Z",
	});
	assert.deepEqual(out.submission, {
		language: "python",
		source: "print(int(input())*3)",
		passed: "1/3",
		tests: [
			{ name: "a", passed: false, expected: "6", actual: "9\n" },
			{ name: "b", passed: false, hidden: true },
			{ name: "c", passed: true },
		],
	});
});
