/**
 * GET /api/code/toolchains — which languages this machine can run, with
 * versions and install hints (core/code-runner.ts).
 */

import { detectToolchains } from "../../core/code-runner.ts";

export async function GET() {
	return Response.json({ toolchains: detectToolchains() });
}
