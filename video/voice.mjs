// Generates voice-over takes with ElevenLabs and prints when each marked phrase starts.
// Reads ELEVENLABS_API_KEY from video/.env (git-ignored). Writes out/vo/<take>-<voice>.mp3.
//
//   node video/voice.mjs <voice> <take> [<take>…]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const line of fs.readFileSync(path.join(here, ".env"), "utf8").split("\n")) {
	const m = line.match(/^(\w+)=(.*)$/);
	if (m) process.env[m[1]] ??= m[2].trim();
}
const KEY = process.env.ELEVENLABS_API_KEY;

const VOICES = { liam: "TX3LPaxmHKxFdv7VOQHJ", chris: "iP95p4xoKVk53GoZ742B", eric: "cjVigY5qzO86Huf0OWal", brian: "nPczCjzI2devNBz1zQrb", will: "bIHbv24MWmeRgasZH58o" };

// Each take: the text and the phrases whose start times we want back. The text is the final script.
const TAKES = {
	hook: {
		text: "Since 2023, humanity has been running a massive experiment: what happens when you outsource your critical thinking to a GPU cluster in Northern Virginia? The results are in. Nearly 1,000 high-school students got a ChatGPT-style tutor for math practice. They did 48% better. Then it was taken away, and they scored 17% worse on the exam than students who never had it. The struggle is the training signal. Let an LLM do all the heavy lifting, and your neurons are on the couch eating Doritos. We are speedrunning an obesity epidemic for the human mind.",
		marks: ["Since 2023", "what happens", "to a GPU", "The results", "Nearly 1,000", "The struggle", "We are"],
	},
	mindbuilding: {
		text: "But the same study had a twist: students whose AI only gave hints mostly avoided the drop. So what if we point it the other way? When machines took physical labor out of survival, we invented a bizarre new hobby: walk into a room, lift heavy metal circles for no reason, and put them back down. Struggle became voluntary, so we turned it into a science. Now the same thing is happening to reasoning. When chess engines beat us, grandmasters didn't get dumber. They used them as gym equipment and got freakishly good. Your real competition is about to use AI to bench press 500 pounds of pure math.",
		marks: ["So what if", "When machines", "Now the same", "Your real"],
	},
	problem: {
		text: "But today's AI tools are built like a forklift, when what you need is a squat rack. LLM tutors often leak the answer and give flawed feedback. And traditional learning is a many-to-many mess. One course for a million people: too slow for some, too fast for others. Meanwhile you're jumping between textbooks, docs and random guys on X, burning half your mental RAM on notation and who to trust.",
		marks: ["LLM tutors", "And traditional", "Meanwhile"],
	},
	// The demo's first sentence alone, with TYSA spelled two ways, to splice over the original.
	"tysa-word": { text: "So we built Tie-sah, an agentic learning harness running on Meta's Muse models.", marks: ["So we"] },
	"tysa-letters": { text: "So we built T. Y. S. A., an agentic learning harness running on Meta's Muse models.", marks: ["So we"] },
	// Pickups for the final cut: TYSA as a harness built for learning, and the problem line without "tutors".
	"tysa-harness": { text: "So we built Tie-sah, a harness built for learning, running on Meta's Muse models.", marks: ["So we"] },
	"llms-leak": { text: "LLMs often leak the answer and give flawed feedback.", marks: ["LLMs"] },
	"chatgpt-practice": { text: "Nearly 1,000 high-school students got ChatGPT for math practice.", marks: ["Nearly"] },
	// Version 2 script, one take per section, in a subtler delivery (see SUBTLE).
	"v2-cold": { subtle: true, text: "Since 2023, humanity has been running a massive experiment: what happens when you outsource your critical thinking to a GPU cluster in Northern Virginia? And the results are in. In a study of nearly 1,000 students, those who offloaded math practice to an LLM performed 48% better during practice than those who didn't, and then scored 17% worse on the exam when the AI was removed.", marks: ["And the results", "In a study"] },
	"v2-goal": { subtle: true, text: "Doing a hard thing is what produces and maintains the capacity for doing that hard thing. Specifically, the struggle is the training signal. When machines removed physical work from survival, we invented the gym, imposing a voluntary load on the body to turn strength into a science. Now, the same conditions have arrived for reasoning. Our goal is not to minimize mental effort and create an illusion of learning. Our goal is to maximize real, usable understanding built per unit of effort spent. We do that by reallocating your cognitive bandwidth, driving logistical friction like resource hunting, notation switching, and fact-checking down to zero, so 100% of your mental effort goes into high-tension collision with the material itself.", marks: ["Specifically", "When machines", "Our goal is not", "We do that"] },
	"v2-harness": { subtle: true, text: "That is why we engineered Tie-sah, an agentic learning harness powered by Meta's Muse models. An agent harness is the surrounding machinery that lets a model explore and act on an external system. For a coding agent, the system is a computer. For Tie-sah, the external system being acted on is your brain. In every other harness, you are the operator driving the agent. Here, you are the system being modeled and upgraded.", marks: ["An agent harness", "For a coding", "In every other"] },
	"v2-install": { subtle: true, text: "Following a derivation in a lecture and recognizing when to recall it under pressure are two different cognitive abilities. So Tie-sah splits learning into two coupled engines: teaching installs understanding, and practice broadens and strengthens the retrieval cues that bring it to mind. Because a step is only optimal relative to what you already know, a binary right-or-wrong answer isn't enough. Two people can get the same wrong answer for completely different reasons. Tie-sah needs continuous telemetry on how you reason. That is why every interaction features a Thinking Field, where you type or speak your raw, unfiltered stream of consciousness, transcribed live by Muse.", marks: ["So Tie-sah", "Because a step", "That is why"] },
	"v2-demo": { subtle: true, text: "Let's see Tie-sah in action. First, it probes, using multiple-choice questions, a confidence slider, and your raw thinking to binary-search the exact edge of your knowledge in seconds. Next, it plans, dispatching background research and PDF sub-agents to verify facts and construct the minimal dependency tree from what you already hold as obviously true to your target goal. In teaching, the goal is for every step to land as obviously true. And at each node, you go first: you predict the next move in the Thinking Field, Tie-sah teaches the step, spinning up custom SVGs and interactive simulations on the fly, and then checks your understanding so misconceptions are fixed the moment they happen. When you move to practice, Tie-sah poses adaptive recall demands, reading your thinking in chunks and giving only the smallest possible nudge when you stall, so you discover the solution yourself. Every session is distilled into a persistent graph of propositions and reasoning chains: a high-precision, low-token map of your mind that connects across every subject you learn.", marks: ["First, it probes", "Next, it plans", "In teaching", "When you move", "Every session"] },
	// The learner's own voice for the demo recording, fed to the browser as a fake microphone so Muse transcribes it live.
	"dictate-1": { text: "Hmm, okay... so the data is fixed, right? So the only thing that can actually change is the weights. So the weights move until the predictions come down.", marks: ["Hmm"] },
	// Version 3, final 3-minute script (from the founder's notes), one take per section.
	"f-cold": { subtle: true, text: "Does AI make people smarter or dumber? If you outsource your thinking to it, your thinking decays, because the struggle is the training signal. In a 2025 study of about a thousand high-school students, the ones who practiced math with ChatGPT scored 48% higher in practice, and 17% lower on the exam once it was taken away. But we can point the tool the other way, and use AI to load our thinking instead.", marks: ["In a 2025", "But we can"] },
	"f-mind": { subtle: true, text: "When machines took physical work out of daily life, we invented the gym. Once training was voluntary, it became a science, and bodybuilding produced physiques nobody had seen before. Thinking is next: reasoning is becoming a choice. And equipment matters. Early bodybuilders had flat chests because the bench press didn't exist yet. When chess engines passed us, they became training equipment, and human play got far better. AI can be the equipment for the mind.", marks: ["Thinking is next", "And equipment", "When chess"] },
	"f-many": { subtle: true, text: "Today, learning is many-to-many. One course teaches thousands of people, so it fits none of them. The best path sits exactly at the edge of what you know. And you learn from many sources, each with its own notation and reliability. Switching costs effort, and you don't fully commit to a source you don't trust yet. So we want one-to-one: one interface, fitted to one mind, that pulls from every source. And with AI, trust can't be built up over time. It has to be engineered in, with fact-checking you can rely on.", marks: ["And you learn", "So we want", "And with AI"] },
	"f-goal": { subtle: true, text: "The goal is to maximize understanding built per unit of mental effort. Not to minimize the effort. The biggest risk with AI isn't hallucination. It's skipping the struggle and getting an illusion of learning. So the struggle stays in the material, and the system absorbs the logistics.", marks: ["Not to", "The biggest", "So the struggle"] },
	"f-two": { subtle: true, text: "We treat learning as two processes. Teaching installs understanding. Practice makes it usable, by broadening the cues that bring an idea to mind. Both depend on what you already know, and a right-or-wrong answer can't show that. Two people can get the same wrong answer for different reasons. So almost every question has a thinking field. You type or say your raw thinking, and Muse transcribes it live.", marks: ["Teaching installs", "Both depend", "Two people", "So almost"] },
	"f-demo": { subtle: true, text: "Teaching has three phases. Probe: multiple-choice questions binary-search the edge of what you know. Plan: the agent reasons out the minimal path to your goal, with sub-agents checking facts, and shows it to you as a graph. Teach: one step at a time, each landing as obviously true. You predict first, it explains, then it checks. Practice adapts the difficulty and gives the smallest hint when you stall. Everything you learn becomes a graph of propositions and reasoning chains.", marks: ["Probe", "Plan", "Teach", "Practice", "Everything"] },
	"f-close": { subtle: true, text: "That's Tie-sah: an agent harness for learning, running on Meta's Muse models. A coding harness acts on a computer. A research harness acts on the internet. Here, the system being acted on is your brain. We built the bench press for your mind. Thanks for watching.", marks: ["A coding", "Here,", "We built"] },
	// Version 3: the same story in plain engineer talk.
	"v3-cold": { subtle: true, text: "Since 2023, a lot of us have been handing our thinking to a model running in a data center in Virginia. There's now data on what that does. In a 2025 study of about a thousand high-school students, the ones who practiced math with ChatGPT scored 48% higher during practice. When the AI was taken away, they scored 17% lower on the exam than students who never used it.", marks: ["There's now", "In a 2025", "When the AI"] },
	"v3-goal": { subtle: true, text: "Here's the problem we wanted to solve. You get better at hard things by doing the hard part yourself. The struggle is the training signal. We already figured this out for the body: once machines did the physical work, we built gyms and turned exercise into a science. Reasoning is in the same spot now. So we didn't want to make learning feel easier. We wanted more real understanding for every hour you put in. That means cutting the busywork: hunting for resources, switching between notations, checking whether a source is right. Tie-sah handles that, so your time goes into the actual material.", marks: ["You get better", "We already", "So we didn't", "That means"] },
	"v3-harness": { subtle: true, text: "Technically, Tie-sah is an agent harness running on Meta's Muse models. A harness is the code around a model that lets it observe a system and act on it. For a coding agent, the system is a computer. For Tie-sah, the system is you. Normally you're the one driving the agent. Here, the agent is building a model of how you think, and working to improve it.", marks: ["A harness is", "For a coding", "Normally"] },
	"v3-install": { subtle: true, text: "We split learning into two parts. Following a derivation and remembering to use it on a new problem are different skills. Teaching gets the idea in. Practice makes it something you can pull up when you need it. We also learned that a right-or-wrong answer doesn't tell you much. Two people can get the same wrong answer for completely different reasons. So every question in Tie-sah has a thinking field. You type or say what you're thinking, Muse transcribes it live, and the agent uses it to work out where you actually are.", marks: ["Following", "Teaching gets", "We also", "Two people", "So every"] },
	"v3-demo": { subtle: true, text: "Here's how it works. First, it probes. Multiple-choice questions, a confidence slider and your reasoning let it find the edge of what you know in a few questions. Then it plans. Sub-agents read sources and PDFs, check the facts, and build a dependency map from what you already know to your goal. You review it before anything gets taught. Then it teaches, but you go first. At each step you predict what comes next, then it explains, sometimes with a diagram or a small interactive demo, and checks that it landed. In practice, it reads your work as you go and gives you the smallest hint that gets you unstuck. Everything you learn ends up in a knowledge graph: what you know and how it connects, across every subject.", marks: ["First, it probes", "Then it plans", "Then it teaches", "In practice", "Everything you"] },
	"v3-close": { subtle: true, text: "We're not building something that thinks for you. We built the bench press for your mind. This is Tie-sah. Thanks for watching.", marks: ["We built", "This is"] },
	"v2-close": { subtle: true, text: "We aren't building machines to think for you. We built the bench press for the human mind. This is Tie-sah. Thanks for watching.", marks: ["We built", "This is"] },
	demo: {
		text: "So we built TYSA, an agentic learning harness running on Meta's Muse models. In a coding harness, the AI acts on a computer. In a learning harness, the system being acted on is your brain. It doesn't remove the struggle. It removes the logistics: the fact-checking, the planning, the resource hunting, so all your effort goes into the material itself. First, it probes. Multiple-choice questions binary-search the edge of what you know, using your answer, how sure you are, and why. Then it plans: a dependency map from what you know to what you don't, which you check and confirm before anything is taught. Then it teaches, but you go first. You dump your messy thinking into the thinking field, typed or spoken and transcribed live by Muse, and predict the next step before it explains anything. In practice, it doesn't just grade your final answer. It reads your reasoning, gives the smallest hint that gets you unstuck, and shifts the problems between rounds to keep you right at the edge of your ability. Every concept you lock in becomes a graph of claims and reasoning chains: a live map of your brain that grows as you do. The future of AI isn't about making humans obsolete. It's about building the bench press for the human mind. Thanks for watching.",
		marks: ["First, it probes", "Then it plans", "Then it teaches", "In practice", "Every concept", "The future"],
	},
};

// Dry, deadpan delivery at a relaxed pace (the user asked to slow it down).
const SETTINGS = { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true, speed: 0.95 };
// Version 2: natural but understated. A little less stability keeps it from sounding robotic;
// very low style keeps it from over-acting.
const SUBTLE = { stability: 0.42, similarity_boost: 0.8, style: 0.06, use_speaker_boost: true, speed: 0.95 };

const [name, ...takes] = process.argv.slice(2);
fs.mkdirSync(path.join(here, "out", "vo"), { recursive: true });
for (const take of takes) {
	const { text, marks, subtle } = TAKES[take];
	const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[name]}/with-timestamps?output_format=mp3_44100_128`, {
		method: "POST",
		headers: { "xi-api-key": KEY, "content-type": "application/json" },
		body: JSON.stringify({
			text,
			model_id: "eleven_multilingual_v2",
			voice_settings: subtle ? SUBTLE : SETTINGS,
		}),
	});
	if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
	const d = await res.json();
	fs.writeFileSync(path.join(here, "out", "vo", `${take}-${name}.mp3`), Buffer.from(d.audio_base64, "base64"));
	const a = d.alignment;
	const chars = a.characters.join("");
	const at = marks.map((m) => `"${m}" ${a.character_start_times_seconds[chars.indexOf(m)].toFixed(2)}s`).join(" · ");
	console.log(`${take}-${name}: ${a.character_end_times_seconds.at(-1).toFixed(2)}s · ${at}`);
	fs.writeFileSync(path.join(here, "out", "vo", `${take}-${name}.json`), JSON.stringify(a));
}
