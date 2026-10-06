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
};

export function setPrintSelection(next: PrintSectionsSelection) {
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
