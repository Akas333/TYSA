import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestionDock } from "@/components/question-dock";

const quiz = {
	question: "Which is right?",
	options: [{ label: "Alpha" }, { label: "Beta" }],
	explanation: "Because.",
	correctAnswer: "Alpha",
};

function render(draft: { confidenceSet?: boolean; dontKnow?: boolean }) {
	return renderToStaticMarkup(
		createElement(QuestionDock, {
			toolName: "quiz",
			toolCallId: "call_1",
			input: quiz as never,
			expanded: true,
			onExpand: () => {},
			onSubmit: () => {},
			initialDraft: {
				selection: { selected: new Set(draft.dontKnow ? [] : [0]), otherSelected: false, dontKnow: draft.dontKnow ?? false },
				thinking: "",
				other: "",
				text: "",
				confidenceIndex: 2,
				confidenceSet: draft.confidenceSet,
			},
		}),
	);
}

// Blocked either way: disabled outright, or (only the confidence missing)
// aria-disabled — the click then nudges the confidence row instead of sending.
const submitDisabled = (html: string) => /<button[^>]*(?:\sdisabled=""|aria-disabled="true")[^>]*>Submit answer/.test(html);

describe("confidence is required", () => {
	it("blocks Submit and asks how sure until confidence is set", () => {
		const html = render({});
		assert.ok(submitDisabled(html));
		assert.match(html, /How sure are you\?/);
		assert.match(html, /Set how sure you are to submit/);
	});
	it("allows Submit once confidence is set", () => {
		const html = render({ confidenceSet: true });
		assert.ok(!submitDisabled(html));
		assert.match(html, /50%/);
	});
	it("needs no confidence for I don't know", () => {
		assert.ok(!submitDisabled(render({ dontKnow: true })));
	});
});
