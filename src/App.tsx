import { useEffect, useRef, useState } from "react";
import { openTxt, saveTxt, exitApp, isTauri, type FileRef } from "./files";
import { SHORTCUTS } from "./shortcuts";
import "./App.css";

type Tab = { id: number; text: string; file: FileRef | null };
const MAX_TABS = 9;
const FADE_MS = 150; // keep in sync with the textarea fade in App.css

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, text: "", file: null }]);
  const [activeId, setActiveId] = useState(1);
  const [navOpen, setNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");

  const area = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(2);
  const carets = useRef<Record<number, number>>({});
  const zHeld = useRef(false);
  const zSnapshot = useRef<string | null>(null);
  const closingRef = useRef(false);

  const active = tabs.find((t) => t.id === activeId)!;
  const locked = navOpen || helpOpen;

  function updateTab(id: number, patch: Partial<Tab>) {
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function addTab(text: string, file: FileRef | null) {
    if (tabs.length >= MAX_TABS) {
      setError("Maximum of 9 tabs open.");
      return;
    }
    const id = nextId.current++;
    setTabs((ts) => [...ts, { id, text, file }]);
    setActiveId(id);
  }

  function openInTab(text: string, file: FileRef) {
    // Reuse the current tab if it is still a blank, untitled one
    if (active.text === "" && !active.file) updateTab(active.id, { text, file });
    else addTab(text, file);
  }

  function goTo(n: number) {
    const target = tabs[n - 1];
    if (target) {
      setActiveId(target.id);
      setNavOpen(false);
    }
  }

  function closeActiveTab() {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const id = activeId;
    const snapshot = tabs;
    window.setTimeout(() => {
      const idx = snapshot.findIndex((t) => t.id === id);
      const rest = snapshot.filter((t) => t.id !== id);
      delete carets.current[id];
      if (rest.length === 0) {
        // Nothing left: fall back to a fresh blank file
        const blankId = nextId.current++;
        setTabs([{ id: blankId, text: "", file: null }]);
        setActiveId(blankId);
      } else {
        // Move to the next file (or the previous one if this was the last)
        setTabs(rest);
        setActiveId(rest[Math.min(idx, rest.length - 1)].id);
      }
      closingRef.current = false;
      setClosing(false);
    }, FADE_MS);
  }

  function report(err: any) {
    if (err?.name !== "AbortError") setError(err?.message ?? String(err));
  }

  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      // Stop the browser's own Save / Open / New dialogs
      if (mod && (k === "s" || k === "o" || k === "n")) e.preventDefault();

      // Exit the app, from anywhere
      if (mod && e.shiftKey && k === "w") {
        e.preventDefault();
        exitApp().catch(report);
        return;
      }

      // A tab is fading out: ignore keys until it is gone
      if (closingRef.current) {
        e.preventDefault();
        return;
      }

      // Help: hold Ctrl, press Z, then X
      if (mod && !e.shiftKey && k === "z" && !e.repeat) {
        zHeld.current = true;
        zSnapshot.current = area.current?.value ?? null;
      }
      if (mod && k === "x" && zHeld.current) {
        e.preventDefault();
        if (e.repeat) return;
        const ta = area.current;
        // The Ctrl+Z that came first may have undone a change: put it back
        if (!locked && ta && zSnapshot.current !== null && ta.value !== zSnapshot.current) {
          ta.focus();
          document.execCommand("redo");
        }
        setNavOpen(false);
        setHelpOpen((h) => !h);
        return;
      }

      // Help page is open: only Esc does anything
      if (helpOpen) {
        if (k === "escape") {
          e.preventDefault();
          setHelpOpen(false);
        }
        return;
      }

      // Open / close the tab list
      if (e.ctrlKey && (k === "tab" || k === " ")) {
        e.preventDefault();
        setNavOpen((o) => !o);
        return;
      }

      // Jump to a tab: Ctrl+1-9 (Alt+1-9 too), or just 1-9 while the list is open
      const digit = e.shiftKey ? undefined : /^(?:Digit|Numpad)([1-9])$/.exec(e.code)?.[1];
      if (digit && (mod || e.altKey || navOpen)) {
        e.preventDefault();
        goTo(Number(digit));
        return;
      }

      // Tab list is open: only Esc does anything
      if (navOpen) {
        if (k === "escape") {
          e.preventDefault();
          setNavOpen(false);
        }
        return;
      }

      if (!mod) {
        if (error) setError("");
        return;
      }

      if (k === "w") {
        e.preventDefault();
        closeActiveTab();
      } else if (k === "s") {
        const { id, text, file } = active;
        try {
          const r = await saveTxt(text, file);
          if (r) updateTab(id, { file: r });
          setError("");
        } catch (err) {
          report(err);
        }
      } else if (k === "o") {
        try {
          const r = await openTxt();
          if (r) openInTab(r.text, r.ref);
          setError("");
        } catch (err) {
          report(err);
        }
      } else if (k === "n") {
        addTab("", null);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === "z" || k === "control" || k === "meta") zHeld.current = false;
    }

    function onBlur() {
      zHeld.current = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  });

  // Keep the cursor in the editor whenever the tab list / help are closed
  useEffect(() => {
    if (locked) return;
    const ta = area.current;
    if (!ta) return;
    ta.focus();
    const pos = Math.min(carets.current[activeId] ?? 0, ta.value.length);
    ta.setSelectionRange(pos, pos);
  }, [locked, activeId]);

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

      <textarea
        key={activeId}
        ref={area}
        className={closing ? "closing" : undefined}
        readOnly={locked || closing}
        spellCheck={false}
        value={active.text}
        onChange={(e) => updateTab(activeId, { text: e.target.value })}
        onSelect={(e) => {
          carets.current[activeId] = e.currentTarget.selectionStart;
        }}
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

      {error && <div className="err">{error}</div>}
    </div>
  );
}