import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface ScreenProtectionProps {
  enabled?: boolean;
}

export const ScreenProtection: React.FC<ScreenProtectionProps> = ({ enabled = false }) => {
  if (!enabled) return null;

  const [isBlackout, setIsBlackout] = useState(false);
  const [blackoutReason, setBlackoutReason] = useState<string>('');

  useEffect(() => {
    if (!enabled) return;

    let timeoutId: NodeJS.Timeout | null = null;

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

    // 1. Detect Window Blur (triggers when Snipping Tool, Mac screenshot tool, or recording overlay grabs focus)
    const handleBlur = () => {
      // Immediate pitch black when window loses focus to capture tool
      setIsBlackout(true);
      setBlackoutReason('Төхөөрөмж дэлгэцийн зураг эсвэл бичлэг авах оролдлого хийх үед хамгаалагдсан.');
    };

    const handleFocus = () => {
      // Re-enable content once user is safely focused back inside the app
      setIsBlackout(false);
      setBlackoutReason('');
    };

    // 2. Visibility change (when tab is backgrounded or captured)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlackout(true);
      } else {
        setIsBlackout(false);
      }
    };

    // 3. Keydown detection for common screenshot shortcuts
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

    // 4. Prevent right-click context menu inspection
    const handleContextMenu = (e: MouseEvent) => {
      // Allow context menu only on input and textarea
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled]);

  if (!isBlackout) return null;

  return (
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
  );
};
