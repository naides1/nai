import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export const isTauri = "__TAURI_INTERNALS__" in window;
export type FileRef = { name: string; path?: string; handle?: any };

const isTxt = (n: string) => n.toLowerCase().endsWith(".txt");
const baseName = (p: string) => p.split(/[\\/]/).pop()!;
const types = [{ description: "Text", accept: { "text/plain": [".txt"] } }];

export async function openTxt() {
  if (isTauri) {
    const path = await open({ multiple: false, filters: [{ name: "Text", extensions: ["txt"] }] });
    if (!path) return null;
    if (!isTxt(path)) throw new Error("Only .txt files can be opened.");
    return { ref: { name: baseName(path), path } as FileRef, text: await readTextFile(path) };
  }
  const [handle] = await (window as any).showOpenFilePicker({ types, excludeAcceptAllOption: true });
  if (!isTxt(handle.name)) throw new Error("Only .txt files can be opened.");
  return { ref: { name: handle.name, handle } as FileRef, text: await (await handle.getFile()).text() };
}

export async function saveTxt(text: string, ref: FileRef | null): Promise<FileRef | null> {
  if (isTauri) {
    let path = ref?.path ?? (await save({ defaultPath: "untitled.txt", filters: [{ name: "Text", extensions: ["txt"] }] }));
    if (!path) return null;
    if (!isTxt(path)) path += ".txt";
    await writeTextFile(path, text);
    return { name: baseName(path), path };
  }
  const handle = ref?.handle ?? (await (window as any).showSaveFilePicker({ suggestedName: "untitled.txt", types, excludeAcceptAllOption: true }));
  const w = await handle.createWritable();
  await w.write(text);
  await w.close();
  return { name: handle.name, handle };
}