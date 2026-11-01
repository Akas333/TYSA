import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeContext, type Api, type Model } from "@earendil-works/pi-ai";
import { piEngineForSpec, piModels } from "../src/agent/models.ts";

/*
 * Cache lifetime (2026-11-01): the lesson chat asks for the long cache so a
 * learner's pause past 5 minutes still reads the cached history; every other
 * engine keeps pi-ai's short default. Driven through the real Anthropic
 * provider with fetch faked, reading the cache_control it sends.
 */

const model = piModels().getModel("anthropic", "claude-sonnet-5-5") as Model<Api>;

type Block = { cache_control?: { type: string; ttl?: string } };

/** The cache_control blocks of one request (every response is a 400, so
 *  no SSE is needed). */
async function cacheControls(cacheRetention?: "long"): Promise<Block["cache_control"][]> {
	let body: { system?: Block[]; messages?: Array<{ content: Block[] | string }> } = {};
	const previousKey = process.env.ANTHROPIC_API_KEY;
	process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
	try {
		const engine = piEngineForSpec({ provider: "anthropic", id: model.id }, false, undefined, cacheRetention);
		const stream = engine.streamFn(model, normalizeContext({ systemPrompt: "Teach.", messages: [{ role: "user", content: "hi", timestamp: 0 }] }), {
			maxRetries: 0,
			fetch: async (_url, init) => {
				body = JSON.parse(String(init?.body));
				return new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "stop" } }), { status: 400, headers: { "content-type": "application/json" } });
			},
		});
		for await (const _event of stream) { /* drain */ }
	} finally {
		if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
		else process.env.ANTHROPIC_API_KEY = previousKey;
	}
	const blocks = [
		...(body.system ?? []),
		...(body.messages ?? []).flatMap((m) => (Array.isArray(m.content) ? m.content : [])),
	];
	return blocks.map((b) => b.cache_control).filter(Boolean);
}

test("the lesson chat's long cache sends the 1-hour TTL on every breakpoint", async () => {
	const controls = await cacheControls("long");
	assert(controls.length > 0, "the request carries cache breakpoints");
	for (const control of controls) assert.deepEqual(control, { type: "ephemeral", ttl: "1h" });
});

test("an engine without a cache lifetime keeps the short default", async () => {
	const controls = await cacheControls();
	assert(controls.length > 0, "the request carries cache breakpoints");
	for (const control of controls) assert.deepEqual(control, { type: "ephemeral" });
});
