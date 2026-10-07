import { useEffect } from 'react';

/**
 * While `active`, Ctrl+S (Cmd+S on Mac) presses the save button marked with `data-ctrl-s` instead of
 * the browser's "save page". By the physical key, so it also works with the Mongolian keyboard layout.
 */
export function useCtrlS(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.code !== 'KeyS') return;
      e.preventDefault();
      const buttons = document.querySelectorAll<HTMLButtonElement>('[data-ctrl-s]');
      buttons[buttons.length - 1]?.click();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}
