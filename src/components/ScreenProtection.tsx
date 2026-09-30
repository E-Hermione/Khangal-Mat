import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface ScreenProtectionProps {
  enabled?: boolean;
}

/**
 * Covers the whole screen in black while the page is not in focus (screenshot and recording
 * tools usually take focus) or when a screenshot shortcut is pressed.
 */
export const ScreenProtection: React.FC<ScreenProtectionProps> = ({ enabled = false }) => {
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
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
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
