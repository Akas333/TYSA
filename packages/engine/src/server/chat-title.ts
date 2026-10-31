/**
 * Session naming (owner, 2026-10-31): a new session is born with its title
 * cut from the learner's first message (titleFromPrompt — instant, so the
 * sidebar never shows a blank row), then the CHEAP slot rewrites it into a
 * short topic name ("teach me deep learning" → "Deep learning foundations")
 * in the background.
 *
 * Best-effort and quiet: no cheap model, a failed call or an unusable reply
 * leaves the cut title in place. A rename the learner made meanwhile always
 * wins — the agent's name lands only while the title is still the cut one.
 */

import { normalizeContext, type AssistantMessage, type Message } from "@earendil-works/pi-ai";
import { piEngineForSpec, type PiEngine } from "../agent/models.ts";
import { titleFromPrompt } from "../core/contracts.ts";
import { resolveSlot } from "../core/settings-resolution.ts";
import { stores } from "./stores.ts";

const SYSTEM_PROMPT = `You name study sessions in a learning app. Reply with a title of 2 to 5 words for the session the learner's first message starts — the topic and, when it says so, the angle (e.g. "Deep learning foundations", "Calculus exam prep", "Why the sky is blue").
Sentence case. No quotes, no trailing punctuation, no emoji, nothing but the title. Write it in the learner's language.`;

const REQUEST_MAX_CHARS = 2000;

/** The model's reply → a title, or null when it isn't one (pure — tests). */
export function cleanTitle(reply: string): string | null {
	const line = reply
		.split("\n")
		.map((l) => l.trim())
		.find((l) => l.length > 0);
	if (!line) return null;
	const title = line
		.replace(/^(title|session)\s*:\s*/i, "")
		.replace(/^["'“‘*_#`\s]+|["'”’*_`\s]+$/g, "")
		.replace(/[.!?:;,]+$/, "")
		.trim();
	if (!title || title.split(/\s+/).length > 10) return null;
	return titleFromPrompt(title);
}

async function complete(engine: PiEngine, text: string): Promise<string> {
	const messages: Message[] = [{ role: "user", content: [{ type: "text", text }], timestamp: Date.now() }];
	const stream = engine.streamFn(engine.model, normalizeContext({ systemPrompt: SYSTEM_PROMPT, messages, tools: [] }), {} as never);
	let result: AssistantMessage | null = null;
	for await (const event of stream) {
		if (event.type === "done") {
			result = event.message;
			break;
		}
		if (event.type === "error") throw new Error(event.error.errorMessage ?? "The model call failed.");
	}
	return (result?.content ?? [])
		.filter((b) => b.type === "text")
		.map((b) => (b as { text: string }).text)
		.join("");
}

/** Name the session from its first message with the cheap model. Never
 *  throws; resolves once the title is saved (or left alone). */
export async function nameChat(chatId: string, prompt: string, options: { engine?: PiEngine } = {}): Promise<void> {
	const words = prompt.trim().slice(0, REQUEST_MAX_CHARS);
	const placeholder = stores.chatStore.getChat(chatId)?.title;
	if (!words || !placeholder) return;
	try {
		let engine = options.engine;
		if (!engine) {
			const slot = resolveSlot(stores.settingsStore.readSettings()?.models?.cheap);
			if (!slot) return;
			// A title needs no reasoning: the lowest level the model allows.
			engine = piEngineForSpec({ ...slot, thinkingLevel: "minimal" });
		}
		const title = cleanTitle(await complete(engine, words));
		if (!title) return;
		// The learner renamed it meanwhile (or deleted it): theirs wins.
		if (stores.chatStore.getChat(chatId)?.title !== placeholder) return;
		stores.chatStore.renameChat(chatId, title);
	} catch {
		// Best-effort: the cut title stays.
	}
}
