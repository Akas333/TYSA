import { useEffect, useRef } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit, HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import type { CodeLanguage } from "@/components/code-run";

/**
 * The code editor (learn-to-program, 2026-11-02): a thin CodeMirror 6 view
 * themed from the app's own tokens. Uncontrolled after mount — `value` seeds
 * it, `onChange` reports every edit; a new `resetKey` re-seeds it (the
 * Reset button, a re-posed exercise). ⌘/Ctrl+Enter calls `onRun`.
 */

function languageExtension(language: CodeLanguage): Extension {
	switch (language) {
		case "python":
			return python();
		case "javascript":
			return javascript();
		case "typescript":
			return javascript({ typescript: true });
		case "c":
		case "cpp":
			return cpp();
		case "java":
			return java();
		case "rust":
			return rust();
		case "go":
			return go();
		case "ruby":
			return StreamLanguage.define(ruby);
		case "bash":
			return StreamLanguage.define(shell);
	}
}

const highlight = HighlightStyle.define([
	{ tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: "#c792ea" },
	{ tag: [t.string, t.special(t.string), t.regexp], color: "#c3e88d" },
	{ tag: [t.number, t.bool, t.null, t.atom], color: "#f78c6c" },
	{ tag: [t.comment, t.lineComment, t.blockComment], color: "var(--muted-foreground)", fontStyle: "italic" },
	{ tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#82aaff" },
	{ tag: [t.typeName, t.className, t.namespace], color: "#ffcb6b" },
	{ tag: [t.definition(t.variableName)], color: "#eeffff" },
	{ tag: [t.propertyName], color: "#89ddff" },
	{ tag: [t.operator, t.punctuation], color: "#89ddff" },
	{ tag: t.invalid, color: "#ff5370" },
]);

const theme = EditorView.theme(
	{
		"&": { backgroundColor: "transparent", color: "var(--foreground)", fontSize: "13px", height: "100%" },
		"&.cm-focused": { outline: "none" },
		".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.55" },
		".cm-content": { caretColor: "var(--foreground)", padding: "8px 0" },
		".cm-cursor": { borderLeftColor: "var(--foreground)" },
		".cm-gutters": { backgroundColor: "transparent", color: "var(--muted-foreground)", border: "none" },
		".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--foreground) 4%, transparent)" },
		".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
		"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
			backgroundColor: "color-mix(in oklab, var(--foreground) 18%, transparent) !important",
		},
		".cm-matchingBracket": { backgroundColor: "color-mix(in oklab, var(--foreground) 14%, transparent)", outline: "none" },
	},
	{ dark: true },
);

export interface CodeEditorProps {
	language: CodeLanguage;
	value: string;
	onChange: (value: string) => void;
	onRun?: () => void;
	/** Change it to re-seed the editor from `value`. */
	resetKey?: string | number;
	className?: string;
	autoFocus?: boolean;
}

export function CodeEditor({ language, value, onChange, onRun, resetKey, className, autoFocus }: CodeEditorProps) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const viewRef = useRef<EditorView | null>(null);
	// Callbacks through refs: the view is built once per seed, never per render.
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const onRunRef = useRef(onRun);
	onRunRef.current = onRun;

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		const unit = language === "go" ? "\t" : language === "python" || language === "java" || language === "rust" ? "    " : "  ";
		const view = new EditorView({
			parent: host,
			state: EditorState.create({
				doc: value,
				extensions: [
					lineNumbers(),
					highlightActiveLineGutter(),
					highlightActiveLine(),
					drawSelection(),
					history(),
					indentOnInput(),
					bracketMatching(),
					indentUnit.of(unit),
					EditorState.tabSize.of(4),
					keymap.of([
						{ key: "Mod-Enter", run: () => (onRunRef.current?.(), true) },
						// Esc must reach the page's layered-Esc chain, not stay in the editor.
						{ key: "Escape", run: (v) => (v.contentDOM.blur(), false) },
						indentWithTab,
						...defaultKeymap,
						...historyKeymap,
					]),
					languageExtension(language),
					syntaxHighlighting(highlight),
					theme,
					EditorView.updateListener.of((u) => {
						if (u.docChanged) onChangeRef.current(u.state.doc.toString());
					}),
				],
			}),
		});
		viewRef.current = view;
		if (autoFocus) view.focus();
		return () => {
			view.destroy();
			viewRef.current = null;
		};
		// value seeds only on (re)mount — the editor owns the text afterwards
	}, [language, resetKey]);

	return <div ref={hostRef} className={className} data-testid="code-editor" />;
}
