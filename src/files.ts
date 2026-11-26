import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile, remove } from "@tauri-apps/plugin-fs";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { JSONContent } from "@tiptap/react";
import { docText, hasMarks } from "./richtext";

export const isTauri = "__TAURI_INTERNALS__" in window;
export type FileRef = { name: string; path?: string; handle?: any };

const isTxt = (n: string) => n.toLowerCase().endsWith(".txt");
const baseName = (p: string) => p.split(/[\\/]/).pop()!;
const types = [{ description: "Text", accept: { "text/plain": [".txt"] } }];
const styleKey = (name: string) => `nai:style:${name}`;

// Formatting lives beside the .txt as "<file>.txt.nai" (desktop), or in browser storage (web, which can't write beside a picked file).
async function loadStyle(ref: FileRef, text: string): Promise<JSONContent | null> {
  try {
    const raw = ref.path ? await readTextFile(ref.path + ".nai") : localStorage.getItem(styleKey(ref.name));
    const c = raw && JSON.parse(raw);
    return c?.v === 1 && c.doc && docText(c.doc) === text.replace(/\r\n/g, "\n") ? c.doc : null; // stale or missing: plain text
  } catch { return null; }
}

async function writeStyle(ref: FileRef, doc: JSONContent) {
  const data = JSON.stringify({ v: 1, doc }), styled = hasMarks(doc);
  if (ref.path) {
    if (styled) await writeTextFile(ref.path + ".nai", data);
    else await remove(ref.path + ".nai").catch(() => {});
  } else if (styled) localStorage.setItem(styleKey(ref.name), data);
  else localStorage.removeItem(styleKey(ref.name));
}

export async function openTxt(): Promise<{ ref: FileRef; text: string; doc: JSONContent | null } | null> {
  let ref: FileRef, text: string;
  if (isTauri) {
    const path = await open({ multiple: false, filters: [{ name: "Text", extensions: ["txt"] }] });
    if (!path) return null;
    if (!isTxt(path)) throw new Error("Only .txt files can be opened.");
    ref = { name: baseName(path), path };
    text = await readTextFile(path);
  } else {
    const [handle] = await (window as any).showOpenFilePicker({ types, excludeAcceptAllOption: true });
    if (!isTxt(handle.name)) throw new Error("Only .txt files can be opened.");
    ref = { name: handle.name, handle };
    text = await (await handle.getFile()).text();
  }
  return { ref, text, doc: await loadStyle(ref, text) };
}

export async function saveTxt(text: string, doc: JSONContent, ref: FileRef | null): Promise<{ ref: FileRef; warn?: string } | null> {
  let out: FileRef;
  if (isTauri) {
    let path = ref?.path ?? (await save({ defaultPath: "untitled.txt", filters: [{ name: "Text", extensions: ["txt"] }] }));
    if (!path) return null;
    if (!isTxt(path)) path += ".txt";
    await writeTextFile(path, text);
    out = { name: baseName(path), path };
  } else {
    const handle = ref?.handle ?? (await (window as any).showSaveFilePicker({ suggestedName: "untitled.txt", types, excludeAcceptAllOption: true }));
    const w = await handle.createWritable();
    await w.write(text);
    await w.close();
    out = { name: handle.name, handle };
  }
  try { await writeStyle(out, doc); return { ref: out }; }
  catch { return { ref: out, warn: "Text saved, but the formatting couldn't be stored." }; }
}

export async function exitApp() {
  if (isTauri) await getCurrentWindow().close();
  else window.close();
}