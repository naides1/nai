import { useRef, useState } from "react";
import { openTxt, saveTxt, FileRef } from "./files";
import "./app.css";

export default function App() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<FileRef | null>(null);
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  async function onKeyDown(e: React.KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) { setError(""); return; }
    const k = e.key.toLowerCase();
    if (k !== "s" && k !== "o") return;
    e.preventDefault();
    try {
      if (k === "s") { const r = await saveTxt(text, file); if (r) setFile(r); }
      else { const r = await openTxt(); if (r) { setText(r.text); setFile(r.ref); } }
      setError("");
    } catch (err: any) {
      if (err?.name !== "AbortError") setError(err?.message ?? String(err));
    }
    area.current?.focus();
  }

  return (
    <>
      <textarea ref={area} autoFocus spellCheck={false} value={text}
        onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} />
      {error && <div className="err">{error}</div>}
    </>
  );
}