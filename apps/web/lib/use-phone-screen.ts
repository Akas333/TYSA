import { useEffect, useState } from "react";

/** A phone: a touch-first device, or a phone-width screen (Tailwind's
 *  `max-sm`; the CSS twin is `max-sm:… pointer-coarse:…`). */
const QUERY = "(pointer: coarse), (max-width: 639px)";

export function isPhoneScreen(): boolean {
	return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

/** Live isPhoneScreen() for rendering. Phones get no keyboard-shortcut
 *  hints and no focus that pops the on-screen keyboard unasked. False
 *  during a server render. */
export function usePhoneScreen(): boolean {
	const [phone, setPhone] = useState(isPhoneScreen);
	useEffect(() => {
		const mq = window.matchMedia(QUERY);
		const onChange = () => setPhone(mq.matches);
		onChange();
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);
	return phone;
}
