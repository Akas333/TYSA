/**
 * The on-screen keyboard. Chrome on Android shrinks the page when it opens
 * (index.html's interactive-widget=resizes-content), so the h-dvh shell
 * already ends above it. Safari on iOS ignores that and slides the
 * keyboard over the page: this measures how much of the bottom it covers
 * into --lh-keyboard, which the app shell pads by (globals.css), so the
 * bottom-docked composers ride just above the keys.
 */
export function trackKeyboardInset(): void {
	const vv = window.visualViewport;
	if (!vv) return;
	const root = document.documentElement;
	let frame = 0;
	const editing = () => {
		const el = document.activeElement;
		return el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement || (el instanceof HTMLElement && el.isContentEditable);
	};
	const update = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			// Pinch-zoom shrinks the visual viewport too; only a keyboard
			// over a field being edited counts. Under 80px is browser chrome.
			const covered = Math.round(window.innerHeight - vv.height);
			const inset = editing() && Math.abs(vv.scale - 1) < 0.01 && covered > 80 ? covered : 0;
			root.style.setProperty("--lh-keyboard", `${inset}px`);
			if (inset > 0 && window.scrollY !== 0) {
				// iOS scrolled the page to reveal the field; the padded shell
				// already shows it, so put the page back and keep the field
				// in view inside its own scroller.
				window.scrollTo(0, 0);
				(document.activeElement as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
			}
		});
	};
	vv.addEventListener("resize", update);
	vv.addEventListener("scroll", update);
	document.addEventListener("focusin", update);
	document.addEventListener("focusout", update);
	update();
}
