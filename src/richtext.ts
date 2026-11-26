import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import History from "@tiptap/extension-history";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import type { JSONContent } from "@tiptap/react";

export const DEFAULT_PT = 11, MIN_PT = 1, MAX_PT = 96;
export const emptyDoc: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// one paragraph per line of the .txt file
export const fromText = (t: string): JSONContent => ({
  type: "doc",
  content: t.split(/\r?\n/).map((l) => (l ? { type: "paragraph", content: [{ type: "text", text: l }] } : { type: "paragraph" })),
});

// plain text of a doc (lines joined with \n): used to check a saved style still matches its .txt
export const docText = (d: JSONContent) => (d.content ?? []).map((p) => (p.content ?? []).map((n) => n.text ?? "").join("")).join("\n");
export const hasMarks = (d: JSONContent) => (d.content ?? []).some((p) => (p.content ?? []).some((n) => n.marks?.length));

// formatting only through our own shortcuts: no markdown-style auto formatting
const plain = (m: any) => m.extend({ addInputRules: () => [], addPasteRules: () => [], addKeyboardShortcuts: () => ({}) });

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize || null,
        renderHTML: (a: { fontSize?: string | null }) => (a.fontSize ? { style: `font-size: ${a.fontSize}` } : {}),
      },
    };
  },
});

export const extensions = [Document, Paragraph, Text, History, plain(Bold), plain(Italic), plain(Strike), plain(Underline), FontSize];