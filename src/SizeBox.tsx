import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MAX_PT } from "./richtext";

export default function SizeBox({ current, onDone }: { current: number; onDone: (n?: number) => void }) {
  const [val, setVal] = useState("");
  const [shake, setShake] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);

  function change(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 3);
    if (Number(d) > MAX_PT) { setVal(String(MAX_PT)); setShake(true); } else setVal(d);
  }
  function key(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    if (!val) onDone();
    else if (Number(val) < 1) { setVal(""); setShake(true); }
    else onDone(Number(val));
  }

  return (
    <div className="size-wrap">
      <div className={`size-box${shake ? " shake" : ""}`} onAnimationEnd={() => setShake(false)}>
        <input ref={input} value={val} placeholder={String(current)} inputMode="numeric" spellCheck={false} autoComplete="off" onChange={(e) => change(e.target.value)} onKeyDown={key} />
      </div>
    </div>
  );
}