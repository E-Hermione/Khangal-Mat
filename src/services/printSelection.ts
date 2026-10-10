import { useEffect, useState } from 'react';
import { PrintSectionsSelection } from '../types';

// Which lesson parts the admin prints (chosen in the header's print menu, used by the topic page)
let selection: PrintSectionsSelection = {
  theory: true,
  examples: true,
  practice: true,
  test1: false,
  test2: false,
  test3: false,
  answers: false,
  pageHeaders: false,
};

// Without the browser's lines the page margin is 0 (they live in it) and the content keeps its
// margin through padding repeated on every printed page instead
const BARE = `@media print {
  @page { margin: 0 !important; }
  #root { padding: 14mm 12mm; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
}`;
function applyPageHeaders(on: boolean) {
  let el = document.getElementById('print-page-headers');
  if (on) return el?.remove();
  if (!el) {
    el = document.createElement('style');
    el.id = 'print-page-headers';
    document.head.appendChild(el);
  }
  el.textContent = BARE;
}
if (typeof document !== 'undefined') applyPageHeaders(false);

export function setPrintSelection(next: PrintSectionsSelection) {
  if (!!next.pageHeaders !== !!selection.pageHeaders && typeof document !== 'undefined') applyPageHeaders(!!next.pageHeaders);
  selection = next;
  window.dispatchEvent(new Event('print-selection-updated'));
}

export function usePrintSelection(): [PrintSectionsSelection, (next: PrintSectionsSelection) => void] {
  const [value, setValue] = useState(selection);
  useEffect(() => {
    const update = () => setValue(selection);
    window.addEventListener('print-selection-updated', update);
    return () => window.removeEventListener('print-selection-updated', update);
  }, []);
  return [value, setPrintSelection];
}
