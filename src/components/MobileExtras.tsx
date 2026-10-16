import React, { useEffect, useState } from 'react';
import { ArrowUp, Minus, Plus, X } from 'lucide-react';

/**
 * Phone helpers that sit over every page:
 * - a "back to top" button once the page is scrolled down
 * - the top bar slides away while scrolling down on small screens and comes back on scrolling up
 * - tapping a display formula opens it full screen, where it can be enlarged
 */
export function MobileExtras({ menuOpen }: { menuOpen: boolean }) {
  const [showTop, setShowTop] = useState(false);
  const [zoom, setZoom] = useState<{ html: string; scale: number } | null>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setShowTop(y > 600);
      const root = document.documentElement;
      if (y < 80 || y < lastY - 4) root.classList.remove('hdr-hidden');
      else if (y > lastY + 4) root.classList.add('hdr-hidden');
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // The open menu keeps the top bar in place
  useEffect(() => {
    if (menuOpen) document.documentElement.classList.remove('hdr-hidden');
  }, [menuOpen]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (window.innerWidth >= 768) return;
      const t = e.target as HTMLElement;
      if (t.closest('button, a, input, textarea, select, label, [contenteditable="true"], .modal-backdrop, [data-no-zoom]')) return;
      const f = t.closest('.katex-display, .co-wrap') as HTMLElement | null;
      if (!f || f.closest('.formula-zoom')) return;
      setZoom({ html: f.outerHTML, scale: 1.4 });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [!!zoom]);

  return (
    <>
      {showTop && !zoom && (
        <button
          type="button"
          aria-label="Дээш буцах"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-5 right-4 z-40 w-11 h-11 rounded-full bg-stone-900/90 text-white shadow-lg flex items-center justify-center no-print cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
      {zoom && (
        <div className="formula-zoom fixed inset-0 z-[80] bg-white flex flex-col no-print" role="dialog" aria-label="Томьёо томруулах">
          <div className="flex items-center justify-end gap-2 p-3 border-b border-stone-200">
            <button type="button" aria-label="Жижигрүүлэх" onClick={() => setZoom((z) => z && { ...z, scale: Math.max(0.6, z.scale / 1.25) })} className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center cursor-pointer">
              <Minus className="w-5 h-5" />
            </button>
            <button type="button" aria-label="Томруулах" onClick={() => setZoom((z) => z && { ...z, scale: Math.min(5, z.scale * 1.25) })} className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center cursor-pointer">
              <Plus className="w-5 h-5" />
            </button>
            <button type="button" aria-label="Хаах" onClick={() => setZoom(null)} className="w-10 h-10 rounded-lg bg-stone-900 text-white flex items-center justify-center cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div style={{ zoom: zoom.scale } as React.CSSProperties} className="w-max min-w-full" dangerouslySetInnerHTML={{ __html: zoom.html }} />
          </div>
        </div>
      )}
    </>
  );
}

/** Dark mode: the page colours turned around, pictures kept as they are */
export function useDarkMode(active: boolean): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('alpha-dark') === '1';
    } catch {
      return false;
    }
  });
  // Only the signed-in pages turn dark (the hook lives there); the sign-in page keeps its colours
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark && active);
    return () => document.documentElement.classList.remove('dark');
  }, [dark, active]);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem('alpha-dark', next ? '1' : '0');
    } catch {
      /* private mode */
    }
  };
  return [dark, toggle];
}
