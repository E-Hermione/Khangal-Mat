import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface ScreenProtectionProps {
  enabled?: boolean;
  // Shown faintly across the screen (user ID and phone) so a leaked photo or screenshot shows whose it is
  watermark?: string;
}

// Tiled, rotated text used as the watermark background
function watermarkImage(text: string): string {
  const safe = text.replace(/[<>&"']/g, '');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">` +
    `<text x="160" y="100" text-anchor="middle" transform="rotate(-25 160 100)" ` +
    `font-family="sans-serif" font-size="16" font-weight="700" fill="#000" fill-opacity="0.09">${safe}</text></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

/**
 * Covers the whole screen in black while the page is not in focus (screenshot and recording
 * tools usually take focus) or when a screenshot shortcut is pressed.
 */
export const ScreenProtection: React.FC<ScreenProtectionProps> = ({ enabled = false, watermark }) => {
  // Hooks must run on every render, before any early return
  const [isBlackout, setIsBlackout] = useState(false);
  const [blackoutReason, setBlackoutReason] = useState<string>('');

  useEffect(() => {
    if (!enabled) {
      setIsBlackout(false);
      setBlackoutReason('');
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const triggerBlackout = (reason: string, durationMs = 2500) => {
      setIsBlackout(true);
      setBlackoutReason(reason);

      // Attempt to clear clipboard if screenshot was attempted
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      } catch {
        // ignore
      }

      if (timeoutId) clearTimeout(timeoutId);
      if (durationMs > 0) {
        timeoutId = setTimeout(() => {
          setIsBlackout(false);
          setBlackoutReason('');
        }, durationMs);
      }
    };

    // Keydown detection for common screenshot shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Windows key / Cmd: the OS takes the rest of a screenshot shortcut (Win+Shift+S,
      // Cmd+Shift+4) before the page sees it, so cover the screen as soon as it goes down
      if (e.key === 'Meta' || e.key === 'OS') {
        triggerBlackout('Дэлгэц хамгаалагдсан байна.', 0);
        return;
      }

      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerBlackout('PrintScreen илэрсэн. Дэлгэц хамгаалагдлаа.', 3000);
        return;
      }

      // Windows Snipping Tool (Win + Shift + S) or Mac (Cmd + Shift + 3 / 4 / 5)
      const isShift = e.shiftKey;
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && isShift && ['3', '4', '5', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        triggerBlackout('Дэлгэцийн зураг авах үйлдэл хориглогдсон.', 3000);
        return;
      }

      // Windows Game Bar recording shortcut (Win + Alt + R)
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        triggerBlackout('Дэлгэцийн бичлэг хийх үйлдэл хориглогдсон.', 3000);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Windows only reports PrintScreen on release, after the image is on the clipboard:
      // clearing the clipboard (in triggerBlackout) throws it away
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        triggerBlackout('PrintScreen илэрсэн. Дэлгэц хамгаалагдлаа.', 3000);
        return;
      }
      if (e.key === 'Meta' || e.key === 'OS') {
        // Keep covered a moment longer so the snipping overlay never captures the page
        triggerBlackout('Дэлгэц хамгаалагдсан байна.', 1500);
      }
    };

    // Prevent right-click context menu inspection
    const handleContextMenu = (e: MouseEvent) => {
      // Allow context menu only on input and textarea
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    // Black out while the window is unfocused or hidden, until the user comes back
    const handleBlur = () => triggerBlackout('Дэлгэц хамгаалагдсан байна.', 0);
    const handleFocus = () => {
      setIsBlackout(false);
      setBlackoutReason('');
    };
    const handleVisibility = () => (document.hidden ? handleBlur() : handleFocus());

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {watermark && (
        <div
          className="fixed inset-0 pointer-events-none select-none z-[9999990]"
          style={{ backgroundImage: watermarkImage(watermark) }}
          aria-hidden="true"
          data-testid="watermark"
        />
      )}
      {isBlackout && (
        <div
          id="screen-protection-shield"
          onClick={() => {
            setIsBlackout(false);
            setBlackoutReason('');
          }}
          className="fixed inset-0 bg-black z-[9999999] flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer"
          style={{ backgroundColor: '#000000', color: '#000000' }}
          aria-hidden="true"
        >
          {/* Pure pitch-black overlay. Minimal subtle text to explain if returned to tab */}
          <div className="max-w-md text-stone-700 pointer-events-none opacity-40">
            <Shield className="w-10 h-10 mx-auto mb-2 text-stone-700" />
            <p className="text-xs font-semibold tracking-wider uppercase text-stone-700">
              Хамгаалагдсан дэлгэц
            </p>
            {blackoutReason && (
              <p className="text-[11px] text-stone-800 mt-1">
                {blackoutReason}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
