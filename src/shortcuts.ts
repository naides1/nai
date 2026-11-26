export type Shortcut = { keys: string; action: string; browserKeys?: string }; // browserKeys: shown instead of keys in a browser

export const SHORTCUTS: Shortcut[] = [
  { keys: "Ctrl + Z + X", action: "Open / close this help page" },
  { keys: "Ctrl + S", action: "Save file" },
  { keys: "Ctrl + O", action: "Open a .txt file in a new tab" },
  { keys: "Ctrl + N", action: "New blank tab", browserKeys: "Ctrl + Alt + N" },
  { keys: "Ctrl + W", action: "Close the current tab", browserKeys: "Ctrl + Alt + W" },
  { keys: "Ctrl + 1 – 9", action: "Jump straight to that tab", browserKeys: "Alt + 1 – 9" },
  { keys: "Ctrl + Tab", action: "Show the tab list", browserKeys: "Ctrl + Space" },
  { keys: "Ctrl + B", action: "Bold: selection or next text" },
  { keys: "Ctrl + I", action: "Italic: selection or next text" },
  { keys: "Ctrl + U", action: "Underline: selection or next text" },
  { keys: "Ctrl + Shift + X", action: "Strikethrough: selection or next text" },
  { keys: "Ctrl + < / >", action: "Size −1 / +1: selection or next text" },
  { keys: "Ctrl + Shift + F", action: "Set an exact font size, 1 – 96" },
  { keys: "Ctrl + Shift + W", action: "Exit the app" },
  { keys: "Esc", action: "Close the tab list, help page or size box" },
];