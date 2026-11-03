// The web app's own Vite config, pointed at the recording API (port 8877) and served on 5188,
// so a recording can run beside another dev server without touching the app's config.
import base from "../../apps/web/vite.config.ts";

export default {
	...base,
	server: { ...base.server, port: 5188, proxy: { "/api": { target: "http://127.0.0.1:8877", changeOrigin: false, ws: true } } },
};
