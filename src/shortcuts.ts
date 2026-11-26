export type Shortcut = {
  keys: string;
  action: string;
  browserKeys?: string; // shown instead of `keys` when running in a browser
};

export const SHORTCUTS: Shortcut[] = [
  { keys: "Ctrl + Z + X", action: "Open / close this help page" },
  { keys: "Ctrl + S", action: "Save file" },
  { keys: "Ctrl + O", action: "Open a .txt file in a new tab" },
  { keys: "Ctrl + N", action: "New blank tab", browserKeys: "Ctrl + Alt + N" },
  { keys: "Ctrl + W", action: "Close the current tab", browserKeys: "Ctrl + Alt + W" },
  { keys: "Ctrl + 1 – 9", action: "Jump straight to that tab", browserKeys: "Alt + 1 – 9" },
  { keys: "Ctrl + Tab", action: "Show the tab list", browserKeys: "Ctrl + Space" },
  { keys: "Ctrl + Shift + W", action: "Exit the app" },
  { keys: "Esc", action: "Close the tab list or this page" },
];