/**
 * GET /api/code/toolchains — which languages this machine can run, with
 * versions and install hints (core/code-runner.ts).
 */

import { detectToolchains } from "../../server/index.ts";

export async function GET() {
	return Response.json({ toolchains: detectToolchains() });
}
