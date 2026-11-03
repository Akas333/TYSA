/**
 * Prepares everything the desktop app ships, in apps/desktop/build:
 *
 *   build/server/index.mjs   the API server, bundled into one file
 *   build/server/src/agent/  the prompts, where the engine reads them
 *   build/web/               the built web app
 *
 * The server bundle leaves out the few packages that load native code or
 * their own data files at runtime; those ship as ordinary dependencies of
 * this package (see package.json).
 */

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const DESKTOP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(DESKTOP, "../..");
const OUT = path.join(DESKTOP, "build");
const require = createRequire(import.meta.url);

/** Loaded at runtime from node_modules: native code or package data files. */
export const RUNTIME_PACKAGES = ["@resvg/resvg-js", "@napi-rs/canvas", "pdfjs-dist", "puppeteer-core"];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

console.log("Building the web app…");
const vite = path.join(path.dirname(require.resolve("vite/package.json", { paths: [path.join(ROOT, "apps/web")] })), "bin/vite.js");
const web = spawnSync(process.execPath, [vite, "build", "--logLevel", "warn", "--outDir", path.join(OUT, "web"), "--emptyOutDir"], {
	cwd: path.join(ROOT, "apps/web"),
	stdio: "inherit",
});
if (web.status !== 0) process.exit(web.status ?? 1);

console.log("Bundling the server…");
await build({
	// Pi loads each OAuth sign-in flow (GitHub Copilot, Grok, …) through a
	// variable import() that a bundle can't resolve, so register its statically
	// bundled flows, as its Bun binary does.
	//
	// pdfjs only takes its Node path (in-process worker, fs font data) when
	// process.type is unset or "browser"; Electron's utility process sets it
	// to "utility", so every PDF failed with 'No "GlobalWorkerOptions.workerSrc"
	// specified.' Load pdfjs and its worker once with process.type hidden:
	// both read it only while they load, and the engine's later imports get
	// these same modules.
	stdin: {
		contents: [
			'import { registerBunOAuthFlows } from "@earendil-works/pi-ai/bun-oauth";',
			'import "./apps/server/src/index.ts";',
			"registerBunOAuthFlows();",
			'const processType = Object.getOwnPropertyDescriptor(process, "type");',
			'Object.defineProperty(process, "type", { value: undefined, configurable: true });',
			"try {",
			'	await import("pdfjs-dist/legacy/build/pdf.mjs");',
			'	globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");',
			"} finally {",
			'	if (processType) Object.defineProperty(process, "type", processType);',
			'	else delete process.type;',
			"}",
		].join("\n"),
		resolveDir: ROOT,
		sourcefile: "desktop-server.ts",
		loader: "ts",
	},
	outfile: path.join(OUT, "server/index.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	external: RUNTIME_PACKAGES,
	// Bundled CommonJS dependencies still call require().
	banner: { js: "import { createRequire as __kapanyRequire } from 'node:module'; const require = __kapanyRequire(import.meta.url);" },
	logLevel: "warning",
});

// The engine reads its prompts relative to its own location (config.ts ROOT),
// which in the bundle is build/server.
const agent = path.join(ROOT, "packages/engine/src/agent");
cpSync(path.join(agent, "system-prompt.md"), path.join(OUT, "server/src/agent/system-prompt.md"));
cpSync(path.join(agent, "prompts"), path.join(OUT, "server/src/agent/prompts"), { recursive: true });

if (!existsSync(path.join(OUT, "web/index.html"))) throw new Error("web build missing");
console.log(`Done: ${path.relative(ROOT, OUT)}`);
