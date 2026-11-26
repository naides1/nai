import { useEffect, useRef, useState } from "react";
import type { Editor as TipEditor, JSONContent } from "@tiptap/react";
import { openTxt, saveTxt, exitApp, isTauri, type FileRef } from "./files";
import { SHORTCUTS } from "./shortcuts";
import { DEFAULT_PT, MIN_PT, MAX_PT, emptyDoc, fromText } from "./richtext";
import Editor, { type Sel } from "./Editor";
import SizeBox from "./SizeBox";
import "./App.css";

type Tab = { id: number; doc: JSONContent; text: string; file: FileRef | null; rev: number };
const MAX_TABS = 9, FADE_MS = 150; // FADE_MS matches the .editor fade in App.css
const sizeOf = (ed: TipEditor) => parseFloat(ed.getAttributes("textStyle").fontSize ?? "") || DEFAULT_PT;
const clamp = (n: number) => Math.min(MAX_PT, Math.max(MIN_PT, n));
const blank = (id: number): Tab => ({ id, doc: emptyDoc, text: "", file: null, rev: 0 });

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([blank(1)]);
  const [activeId, setActiveId] = useState(1);
  const [navOpen, setNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState<number | null>(null); // current size, shown as the placeholder
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const editorRef = useRef<TipEditor | null>(null);
  const nextId = useRef(2);
  const sels = useRef<Record<number, Sel>>({});
  const zHeld = useRef(false);
  const zSnap = useRef<TipEditor["state"]["doc"] | null>(null);
  const closingRef = useRef(false);
  const active = tabs.find((t) => t.id === activeId)!;
  const locked = navOpen || helpOpen;

  const updateTab = (id: number, patch: Partial<Tab>) => setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const applySize = (n: number) => editorRef.current?.chain().focus().setMark("textStyle", { fontSize: `${n}pt` }).run();
  const report = (err: any) => { if (err?.name !== "AbortError") setError(err?.message ?? String(err)); };

  function addTab(text: string, file: FileRef | null, doc?: JSONContent | null) {
    if (tabs.length >= MAX_TABS) return setError("Maximum of 9 tabs open.");
    const id = nextId.current++;
    setTabs((ts) => [...ts, { id, doc: doc ?? fromText(text), text, file, rev: 0 }]);
    setActiveId(id);
  }

  function openInTab(text: string, file: FileRef, doc?: JSONContent | null) {
    if (active.text !== "" || active.file) return addTab(text, file, doc); // reuse the current tab only if it is blank
    delete sels.current[active.id];
    setTabs((ts) => ts.map((t) => (t.id === active.id ? { ...t, doc: doc ?? fromText(text), text, file, rev: t.rev + 1 } : t)));
  }

  function goTo(n: number) {
    const target = tabs[n - 1];
    if (target) { setActiveId(target.id); setNavOpen(false); }
  }

  function closeActiveTab() {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const id = activeId, snapshot = tabs;
    window.setTimeout(() => {
      const idx = snapshot.findIndex((t) => t.id === id), rest = snapshot.filter((t) => t.id !== id);
      delete sels.current[id];
      if (rest.length === 0) { const b = nextId.current++; setTabs([blank(b)]); setActiveId(b); }
      else { setTabs(rest); setActiveId(rest[Math.min(idx, rest.length - 1)].id); }
      closingRef.current = false;
      setClosing(false);
    }, FADE_MS);
  }

  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase(), ed = editorRef.current;
      if (mod && (k === "s" || k === "o" || k === "n")) e.preventDefault();
      if (mod && e.shiftKey && k === "w") { e.preventDefault(); exitApp().catch(report); return; }
      if (closingRef.current) { e.preventDefault(); return; }
      if (sizeOpen !== null) { if (k === "escape") { e.preventDefault(); setSizeOpen(null); } return; }

      // Help: hold Ctrl, press Z, then X
      if (mod && !e.shiftKey && k === "z" && !e.repeat) { zHeld.current = true; zSnap.current = ed?.state.doc ?? null; }
      if (mod && !e.shiftKey && k === "x" && zHeld.current) {
        e.preventDefault();
        if (e.repeat) return;
        if (!locked && ed && zSnap.current && !ed.state.doc.eq(zSnap.current)) ed.commands.redo(); // undo the Ctrl+Z that came first
        setNavOpen(false);
        setHelpOpen((h) => !h);
        return;
      }
      if (helpOpen) { if (k === "escape") { e.preventDefault(); setHelpOpen(false); } return; }
      if (e.ctrlKey && (k === "tab" || k === " ")) { e.preventDefault(); setNavOpen((o) => !o); return; }
      const digit = e.shiftKey || e.getModifierState("AltGraph") ? undefined : /^(?:Digit|Numpad)([1-9])$/.exec(e.code)?.[1];
      if (digit && (mod || e.altKey || navOpen)) { e.preventDefault(); goTo(Number(digit)); return; }
      if (navOpen) { if (k === "escape") { e.preventDefault(); setNavOpen(false); } return; }
      if (!mod) { if (error) setError(""); return; }

      const step = e.altKey ? 0 : k === "<" || e.code === "Comma" ? -1 : k === ">" || e.code === "Period" ? 1 : 0;
      const sel = !!ed && !ed.state.selection.empty; // is any text highlighted?
      if (k === "w") { e.preventDefault(); closeActiveTab(); }
      else if (k === "s") {
        const { id, text, doc, file } = active;
        try { const r = await saveTxt(text, doc, file); if (r) updateTab(id, { file: r.ref }); setError(r?.warn ?? ""); } catch (err) { report(err); }
      } else if (k === "o") {
        try { const r = await openTxt(); if (r) openInTab(r.text, r.ref, r.doc); setError(""); } catch (err) { report(err); }
      } else if (k === "n") addTab("", null);
      else if (step) { e.preventDefault(); if (sel) applySize(clamp(sizeOf(ed!) + step)); }
      else if (e.shiftKey && k === "f") { e.preventDefault(); if (sel) setSizeOpen(sizeOf(ed!)); }
      else if (!e.altKey && (k === "b" || k === "i" || k === "u" || (e.shiftKey && k === "x"))) {
        e.preventDefault();
        if (sel) { const c = ed!.chain().focus(); (k === "b" ? c.toggleBold() : k === "i" ? c.toggleItalic() : k === "u" ? c.toggleUnderline() : c.toggleStrike()).run(); }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (k === "z" || k === "control" || k === "meta") zHeld.current = false; };
    const onBlur = () => { zHeld.current = false; };
    window.addEventListener("keydown", onKeyDown, true); // capture: runs before the editor's own key handling
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  });

  return (
    <div className="app">
      <nav className={`tabs ${navOpen ? "open" : ""}`} aria-hidden={!navOpen}>
        <ul>
          {tabs.map((t, i) => (
            <li key={t.id} className={t.id === activeId ? "current" : ""}>
              <span className="num">{i + 1}</span>
              <span className="name">{t.file?.name ?? "untitled"}</span>
            </li>
          ))}
        </ul>
      </nav>

      <Editor
        key={`${activeId}-${active.rev}`}
        doc={active.doc}
        sel={sels.current[activeId]}
        frozen={locked || sizeOpen !== null}
        closing={closing}
        onChange={(doc, text) => updateTab(activeId, { doc, text })}
        onSel={(s) => { sels.current[activeId] = s; }}
        onEditor={(e) => { editorRef.current = e; }}
      />

      <div className={`help ${helpOpen ? "open" : ""}`} aria-hidden={!helpOpen}>
        <div className="help-inner">
          <h1>Shortcuts</h1>
          <dl>
            {SHORTCUTS.map((s) => (
              <div className="row" key={s.keys}>
                <dt>{isTauri ? s.keys : s.browserKeys ?? s.keys}</dt>
                <dd>{s.action}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {sizeOpen !== null && <SizeBox current={sizeOpen} onDone={(n) => { setSizeOpen(null); if (n) applySize(n); }} />}
      {error && <div className="err">{error}</div>}
    </div>
  );
}