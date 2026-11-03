/**
 * The teacher's untaught-check guard (owner, 2026-11-02): a missed
 * prediction must not roll straight into the check — a `type: "check"`
 * question needs teaching prose since the learner's last answer.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { MIN_TEACHING_BEFORE_CHECK, needsSendToUser, untaughtCheckReason } from "../src/agent/teacher-agent.ts";

const assistant = (text: string, call?: { name: string; type: string }): AgentMessage =>
	({
		role: "assistant",
		content: [
			...(text ? [{ type: "text", text }] : []),
			...(call ? [{ type: "toolCall", id: "c1", name: call.name, arguments: { type: call.type } }] : []),
		],
	}) as unknown as AgentMessage;

const answer = (toolName: string): AgentMessage =>
	({ role: "toolResult", toolCallId: "p1", toolName, content: [{ type: "text", text: '{"kind":"quiz","dontKnow":true}' }], isError: false }) as unknown as AgentMessage;

const user = (text: string): AgentMessage => ({ role: "user", content: text }) as unknown as AgentMessage;

const lesson = "x".repeat(MIN_TEACHING_BEFORE_CHECK);

describe("untaughtCheckReason", () => {
	it("blocks a check posed straight after a prediction answer", () => {
		const current = assistant("Fair enough.", { name: "quiz", type: "check" });
		const messages = [assistant("Intro", { name: "quiz", type: "predict" }), answer("quiz"), current];
		assert.match(untaughtCheckReason("quiz", { type: "check" }, messages, current) ?? "", /Check blocked/);
	});

	it("allows a check once the step has been taught", () => {
		const current = assistant(lesson, { name: "quiz", type: "check" });
		assert.equal(untaughtCheckReason("quiz", { type: "check" }, [answer("quiz"), current], current), undefined);
	});

	it("counts teaching spread over earlier messages in the run", () => {
		const current = assistant("", { name: "quiz", type: "check" });
		const messages = [answer("quiz"), assistant(lesson), answer("research"), current];
		assert.equal(untaughtCheckReason("quiz", { type: "check" }, messages, current), undefined);
	});

	it("does not count prose from before the learner's last message", () => {
		const current = assistant("", { name: "explain", type: "check" });
		const messages = [assistant(lesson), user("Continue"), current];
		assert.ok(untaughtCheckReason("explain", { type: "check" }, messages, current));
	});

	it("leaves predictions and other tools alone", () => {
		const current = assistant("", { name: "quiz", type: "predict" });
		assert.equal(untaughtCheckReason("quiz", { type: "predict" }, [answer("quiz"), current], current), undefined);
		assert.equal(untaughtCheckReason("concept_done", { type: "check" }, [answer("quiz"), current], current), undefined);
	});
});

describe("teaching sent through send_to_user", () => {
	it("counts as teaching before a check", () => {
		const current = {
			role: "assistant",
			content: [
				{ type: "toolCall", id: "s1", name: "send_to_user", arguments: { message: lesson } },
				{ type: "toolCall", id: "c1", name: "quiz", arguments: { type: "check" } },
			],
		} as unknown as AgentMessage;
		assert.equal(untaughtCheckReason("quiz", { type: "check" }, [answer("quiz"), current], current), undefined);
	});
});

describe("needsSendToUser", () => {
	it("arms the channel for Claude and Meta's Muse models only", () => {
		assert.equal(needsSendToUser({ id: "claude-opus-5-5", provider: "anthropic" }), true);
		assert.equal(needsSendToUser({ id: "muse-wonder-1.0", provider: "meta" }), true);
		assert.equal(needsSendToUser({ id: "meta/muse-spark-1.2", provider: "openrouter" }), true);
		assert.equal(needsSendToUser({ id: "gpt-5", provider: "openai" }), false);
	});
});
