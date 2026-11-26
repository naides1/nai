import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor as TipEditor, type JSONContent } from "@tiptap/react";
import { extensions } from "./richtext";

export type Sel = { from: number; to: number };
type Props = {
  doc: JSONContent; sel?: Sel; frozen: boolean; closing: boolean;
  onChange: (doc: JSONContent, text: string) => void;
  onSel: (s: Sel) => void;
  onEditor: (e: TipEditor | null) => void;
};

export default function Editor(p: Props) {
  const cb = useRef(p);
  cb.current = p;
  const editor = useEditor({
    extensions,
    content: p.doc,
    editorProps: { attributes: { spellcheck: "false" } },
    onUpdate: ({ editor }) => cb.current.onChange(editor.getJSON(), editor.getText({ blockSeparator: "\n" })),
    onSelectionUpdate: ({ editor }) => cb.current.onSel({ from: editor.state.selection.from, to: editor.state.selection.to }),
  });

  useEffect(() => {
    if (!editor) return;
    cb.current.onEditor(editor);
    if (cb.current.sel) editor.commands.setTextSelection(cb.current.sel);
    return () => cb.current.onEditor(null);
  }, [editor]);

  const off = p.frozen || p.closing;
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!off, false);
    if (!off) editor.commands.focus();
  }, [editor, off]);

  return <EditorContent editor={editor} className={`editor${p.closing ? " closing" : ""}`} />;
}