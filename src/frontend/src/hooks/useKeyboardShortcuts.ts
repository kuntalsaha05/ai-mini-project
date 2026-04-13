import { useEffect, useState } from "react";

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      const shortcutKey = `${shift ? "shift+" : ""}${ctrl ? "ctrl+" : ""}${key}`;

      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
      if (shortcuts[shortcutKey]) {
        e.preventDefault();
        shortcuts[shortcutKey]();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export const KEYBOARD_SHORTCUTS = {
  play: "Space",
  pause: "Space",
  reset: "R",
  undo: "Ctrl+Z",
  redo: "Ctrl+Y",
  nextAlgorithm: "N",
  previousAlgorithm: "P",
  toggleSound: "S",
  toggleSpeed: "D",
};
