import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * THE CODE RUNNER (learn-to-program, 2026-11-02): runs the learner's code
 * with the toolchains ALREADY INSTALLED on this machine — the app is local
 * only, so there is no sandbox service and no bundled runtime. A missing
 * toolchain is an honest "not installed" with an install hint; the teacher
 * walks the learner through setup the way a textbook's chapter 0 does.
 *
 * Each run gets a fresh temp directory (deleted after), a wall-clock limit,
 * and capped output — enough to stop an infinite loop or a print storm from
 * hanging the lesson. It is NOT a security boundary: the code is the
 * learner's own, running as the learner.
 */

export const CODE_LANGUAGES = ["python", "javascript", "typescript", "c", "cpp", "java", "go", "rust", "ruby", "bash"] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export function isCodeLanguage(value: unknown): value is CodeLanguage {
	return typeof value === "string" && (CODE_LANGUAGES as readonly string[]).includes(value);
}

interface LanguageSpec {
	label: string;
	file: string;
	/** Candidate executables, first found wins. */
	candidates: string[];
	/** Compile step (absent = interpreted). `bin` is the resolved compiler. */
	compile?: (bin: string, dir: string) => string[];
	/** The run command. `bin` is the resolved executable. */
	run: (bin: string, dir: string) => string[];
	/** A second executable the run needs (java: javac compiles, java runs). */
	runner?: string;
	install: string;
}

const SPECS: Record<CodeLanguage, LanguageSpec> = {
	python: {
		label: "Python",
		file: "main.py",
		candidates: ["python3", "python"],
		run: (bin) => [bin, "-u", "main.py"],
		install: "Install Python 3 from https://www.python.org/downloads/ (macOS: `brew install python`; Windows: the python.org installer with \"Add to PATH\" ticked; Linux: `sudo apt install python3`).",
	},
	javascript: {
		label: "JavaScript (Node.js)",
		file: "main.js",
		candidates: ["node"],
		run: (bin) => [bin, "main.js"],
		install: "Install Node.js LTS from https://nodejs.org/ (macOS: `brew install node`).",
	},
	typescript: {
		label: "TypeScript (Node.js)",
		file: "main.ts",
		candidates: ["node"],
		run: (bin) => [bin, "--experimental-strip-types", "--no-warnings", "main.ts"],
		install: "Install Node.js 22.6 or newer from https://nodejs.org/ — it runs TypeScript directly.",
	},
	c: {
		label: "C",
		file: "main.c",
		candidates: ["cc", "gcc", "clang"],
		compile: (bin) => [bin, "main.c", "-o", "main", "-lm"],
		run: (_bin, dir) => [path.join(dir, "main")],
		install: "Install a C compiler — macOS: `xcode-select --install`; Windows: MSYS2 (https://www.msys2.org/) then `pacman -S mingw-w64-ucrt-x86_64-gcc`; Linux: `sudo apt install build-essential`.",
	},
	cpp: {
		label: "C++",
		file: "main.cpp",
		candidates: ["c++", "g++", "clang++"],
		compile: (bin) => [bin, "-std=c++17", "main.cpp", "-o", "main"],
		run: (_bin, dir) => [path.join(dir, "main")],
		install: "Install a C++ compiler — macOS: `xcode-select --install`; Windows: MSYS2 (https://www.msys2.org/) then `pacman -S mingw-w64-ucrt-x86_64-gcc`; Linux: `sudo apt install build-essential`.",
	},
	java: {
		label: "Java",
		file: "Main.java",
		candidates: ["javac"],
		runner: "java",
		compile: (bin) => [bin, "Main.java"],
		run: (bin) => [bin, "-cp", ".", "Main"],
		install: "Install a JDK (Java 17+) from https://adoptium.net/ (macOS: `brew install openjdk`). The class must be `public class Main`.",
	},
	go: {
		label: "Go",
		file: "main.go",
		candidates: ["go"],
		run: (bin) => [bin, "run", "main.go"],
		install: "Install Go from https://go.dev/dl/ (macOS: `brew install go`).",
	},
	rust: {
		label: "Rust",
		file: "main.rs",
		candidates: ["rustc"],
		compile: (bin) => [bin, "main.rs", "-o", "main"],
		run: (_bin, dir) => [path.join(dir, "main")],
		install: "Install Rust with rustup from https://rustup.rs/ (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`).",
	},
	ruby: {
		label: "Ruby",
		file: "main.rb",
		candidates: ["ruby"],
		run: (bin) => [bin, "main.rb"],
		install: "Install Ruby from https://www.ruby-lang.org/en/documentation/installation/ (macOS: `brew install ruby`).",
	},
	bash: {
		label: "Bash",
		file: "main.sh",
		candidates: ["bash"],
		run: (bin) => [bin, "main.sh"],
		install: "Bash ships with macOS and Linux; on Windows install Git for Windows (https://git-scm.com/) or use WSL.",
	},
};

/** Dirs a GUI-launched app (the desktop build) often misses from PATH. */
function searchPath(): string[] {
	const home = os.homedir();
	const extra = [
		"/opt/homebrew/bin",
		"/usr/local/bin",
		"/usr/local/go/bin",
		path.join(home, ".cargo", "bin"),
		path.join(home, "go", "bin"),
		path.join(home, ".local", "bin"),
		path.join(home, ".pyenv", "shims"),
		path.join(home, ".rbenv", "shims"),
		path.join(home, ".volta", "bin"),
		"/usr/bin",
		"/bin",
	];
	const own = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
	return [...new Set([...own, ...extra])];
}

function childEnv(): NodeJS.ProcessEnv {
	return { ...process.env, PATH: searchPath().join(path.delimiter), PYTHONIOENCODING: "utf-8" };
}

const WINDOWS_EXTS = [".exe", ".cmd", ".bat", ""];

function which(cmd: string): string | null {
	const exts = process.platform === "win32" ? WINDOWS_EXTS : [""];
	for (const dir of searchPath()) {
		for (const ext of exts) {
			const full = path.join(dir, cmd + ext);
			try {
				fs.accessSync(full, fs.constants.X_OK);
				if (fs.statSync(full).isFile()) return full;
			} catch {
				// not here
			}
		}
	}
	return null;
}

/** macOS ships /usr/bin shims for the Command Line Tools: running one with
 *  the CLT missing pops an install dialog. Treat them as absent instead. */
const CLT_SHIMS = new Set(["python3", "cc", "gcc", "clang", "c++", "g++", "clang++", "ruby"]);
let cltInstalled: boolean | null = null;
function isMissingCltShim(cmd: string, resolved: string): boolean {
	if (process.platform !== "darwin" || !CLT_SHIMS.has(cmd) || path.dirname(resolved) !== "/usr/bin") return false;
	if (cltInstalled === null) cltInstalled = spawnSync("xcode-select", ["-p"], { stdio: "ignore" }).status === 0;
	return !cltInstalled;
}

function versionOf(bin: string): string | null {
	const name = path.basename(bin, path.extname(bin));
	const flag = name === "javac" || name === "java" ? "-version" : name === "go" ? "version" : "--version";
	const res = spawnSync(bin, [flag], { encoding: "utf8", timeout: 5_000, env: childEnv() });
	if (res.status !== 0) return null;
	const line = `${res.stdout}${res.stderr}`.split("\n").find((l) => l.trim().length > 0);
	return line?.trim() ?? "";
}

export interface Toolchain {
	language: CodeLanguage;
	label: string;
	installed: boolean;
	/** The resolved executable (absent when not installed). */
	command?: string;
	version?: string;
	/** How to install it (always present — the teacher quotes it). */
	install: string;
}

function resolveBin(cmd: string): { bin: string; version: string } | null {
	const resolved = which(cmd);
	if (!resolved || isMissingCltShim(cmd, resolved)) return null;
	const version = versionOf(resolved);
	return version === null ? null : { bin: resolved, version };
}

/** The desktop build's server runs inside Electron: its own binary acts as
 *  Node with ELECTRON_RUN_AS_NODE, so JavaScript works with no Node install. */
function embeddedNode(): { bin: string; version: string } | null {
	if (!process.versions.electron) return null;
	return { bin: process.execPath, version: `v${process.versions.node} (built into the app)` };
}

const toolchainCache = new Map<CodeLanguage, { at: number; value: Toolchain; bins?: { main: string; runner?: string } }>();
/** Re-detect after a minute — the learner may have just installed it. */
const TOOLCHAIN_TTL_MS = 60_000;

function detect(language: CodeLanguage): { value: Toolchain; bins?: { main: string; runner?: string } } {
	const cached = toolchainCache.get(language);
	if (cached && Date.now() - cached.at < TOOLCHAIN_TTL_MS) return cached;
	const spec = SPECS[language];
	let found: { bin: string; version: string } | null = null;
	for (const cmd of spec.candidates) {
		found = resolveBin(cmd);
		if (found) break;
	}
	if (!found && (language === "javascript" || language === "typescript")) found = embeddedNode();
	const runner = found && spec.runner ? resolveBin(spec.runner) : null;
	const installed = found !== null && (!spec.runner || runner !== null);
	const entry = {
		at: Date.now(),
		value: {
			language,
			label: spec.label,
			installed,
			...(installed ? { command: found!.bin, version: found!.version } : {}),
			install: spec.install,
		},
		...(installed ? { bins: { main: found!.bin, ...(runner ? { runner: runner.bin } : {}) } } : {}),
	};
	toolchainCache.set(language, entry);
	return entry;
}

export function detectToolchain(language: CodeLanguage): Toolchain {
	return detect(language).value;
}

export function detectToolchains(): Toolchain[] {
	return CODE_LANGUAGES.map((l) => detectToolchain(l));
}

// ─── running ────────────────────────────────────────────────────────────────

export const RUN_TIMEOUT_MS = 10_000;
const COMPILE_TIMEOUT_MS = 30_000;
const OUTPUT_CAP = 64 * 1024;

export interface ProcessResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	timedOut: boolean;
	truncated: boolean;
	durationMs: number;
}

function runProcess(
	argv: string[],
	opts: { cwd: string; stdin?: string; timeoutMs: number; env: NodeJS.ProcessEnv; signal?: AbortSignal },
): Promise<ProcessResult> {
	return new Promise((resolve) => {
		const started = Date.now();
		let stdout = "";
		let stderr = "";
		let truncated = false;
		let timedOut = false;
		const child = spawn(argv[0]!, argv.slice(1), { cwd: opts.cwd, env: opts.env, stdio: ["pipe", "pipe", "pipe"] });
		const kill = () => {
			try {
				child.kill("SIGKILL");
			} catch {
				// already gone
			}
		};
		const timer = setTimeout(() => {
			timedOut = true;
			kill();
		}, opts.timeoutMs);
		opts.signal?.addEventListener("abort", kill, { once: true });
		const take = (which: "out" | "err") => (chunk: Buffer) => {
			const text = chunk.toString("utf8");
			const current = which === "out" ? stdout : stderr;
			if (current.length >= OUTPUT_CAP) {
				truncated = true;
				kill();
				return;
			}
			const next = (current + text).slice(0, OUTPUT_CAP);
			if (next.length < current.length + text.length) truncated = true;
			if (which === "out") stdout = next;
			else stderr = next;
		};
		child.stdout.on("data", take("out"));
		child.stderr.on("data", take("err"));
		child.stdin.on("error", () => {
			// the program exited without reading stdin
		});
		child.stdin.end(opts.stdin ?? "");
		const finish = (exitCode: number | null) => {
			clearTimeout(timer);
			opts.signal?.removeEventListener("abort", kill);
			resolve({ stdout, stderr, exitCode, timedOut, truncated, durationMs: Date.now() - started });
		};
		child.on("error", (err) => {
			stderr += `${err.message}\n`;
			finish(null);
		});
		child.on("close", (code) => finish(code));
	});
}

export interface TestCase {
	name: string;
	stdin?: string;
	expected: string;
	hidden?: boolean;
}

export interface TestResult {
	name: string;
	hidden: boolean;
	passed: boolean;
	/** Visible tests only: what the program printed and what was expected. */
	stdin?: string;
	expected?: string;
	actual?: string;
	stderr?: string;
	timedOut?: boolean;
}

export type RunResponse =
	| { ok: false; reason: "not-installed"; toolchain: Toolchain }
	| { ok: false; reason: "compile-error"; compile: ProcessResult }
	| { ok: true; run?: ProcessResult; tests?: TestResult[] };

/** Output comparison: line endings and trailing whitespace never fail a test. */
export function outputsMatch(actual: string, expected: string): boolean {
	const norm = (s: string) =>
		s
			.replace(/\r\n/g, "\n")
			.split("\n")
			.map((l) => l.trimEnd())
			.join("\n")
			.trim();
	return norm(actual) === norm(expected);
}

/**
 * Run code once (with `stdin`) and/or against `tests`. Compiled languages
 * compile once per call. The temp directory is always removed.
 */
export async function runCode(req: {
	language: CodeLanguage;
	code: string;
	stdin?: string;
	tests?: TestCase[];
	signal?: AbortSignal;
}): Promise<RunResponse> {
	const { value: toolchain, bins } = detect(req.language);
	if (!toolchain.installed || !bins) return { ok: false, reason: "not-installed", toolchain };
	const spec = SPECS[req.language];
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-code-"));
	const env = childEnv();
	if (bins.main === process.execPath && process.versions.electron) env.ELECTRON_RUN_AS_NODE = "1";
	if (req.language === "go") env.GOCACHE = env.GOCACHE ?? path.join(os.tmpdir(), "axiom-go-cache");
	try {
		fs.writeFileSync(path.join(dir, spec.file), req.code);
		if (spec.compile) {
			const compile = await runProcess(spec.compile(bins.main, dir), { cwd: dir, timeoutMs: COMPILE_TIMEOUT_MS, env, signal: req.signal });
			if (compile.exitCode !== 0) return { ok: false, reason: "compile-error", compile };
		}
		const argv = spec.run(spec.runner ? bins.runner! : bins.main, dir);
		const exec = (stdin?: string) => runProcess(argv, { cwd: dir, stdin, timeoutMs: RUN_TIMEOUT_MS, env, signal: req.signal });
		const out: { ok: true; run?: ProcessResult; tests?: TestResult[] } = { ok: true };
		if (!req.tests || req.tests.length === 0 || req.stdin !== undefined) out.run = await exec(req.stdin);
		if (req.tests && req.tests.length > 0) {
			out.tests = [];
			for (const t of req.tests) {
				const r = await exec(t.stdin);
				const passed = !r.timedOut && r.exitCode === 0 && outputsMatch(r.stdout, t.expected);
				out.tests.push(
					t.hidden
						? { name: t.name, hidden: true, passed }
						: {
								name: t.name,
								hidden: false,
								passed,
								...(t.stdin ? { stdin: t.stdin } : {}),
								expected: t.expected,
								actual: r.stdout,
								...(r.stderr ? { stderr: r.stderr } : {}),
								...(r.timedOut ? { timedOut: true } : {}),
							},
				);
			}
		}
		return out;
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}
