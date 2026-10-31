/**
 * Session naming (owner, 2026-10-31): the cheap model's reply becomes the
 * session title only once it reads as one. Pure seam: cleanTitle in
 * server/chat-title.ts.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cleanTitle } from "../src/server/chat-title.ts";

describe("cleanTitle", () => {
	it("keeps a plain title", () => {
		assert.equal(cleanTitle("Deep learning foundations"), "Deep learning foundations");
	});

	it("strips quotes, labels, markdown and trailing punctuation", () => {
		assert.equal(cleanTitle('"Deep learning foundations."'), "Deep learning foundations");
		assert.equal(cleanTitle("Title: Calculus exam prep"), "Calculus exam prep");
		assert.equal(cleanTitle("**Why the sky is blue**"), "Why the sky is blue");
	});

	it("takes the first non-empty line", () => {
		assert.equal(cleanTitle("\n  Linear algebra basics\nBecause the learner asked…"), "Linear algebra basics");
	});

	it("rejects empty replies and rambling ones", () => {
		assert.equal(cleanTitle("   \n "), null);
		assert.equal(cleanTitle("Sure! Here is a good title for a session about deep learning and neural networks"), null);
	});
});
