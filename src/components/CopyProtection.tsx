import React, { useEffect } from 'react';

/**
 * Stops lesson text from being selected, copied or cut. Form fields (login, search, editors)
 * keep working normally.
 */
export const CopyProtection: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  useEffect(() => {
    if (!enabled) return;

    const isFormField = (target: EventTarget | null) =>
      target instanceof HTMLElement && !!target.closest('input, textarea, [contenteditable="true"]');

    const block = (e: Event) => {
      if (!isFormField(e.target)) e.preventDefault();
    };

    document.body.classList.add('copy-protected');
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('dragstart', block);
    document.addEventListener('selectstart', block);

    return () => {
      document.body.classList.remove('copy-protected');
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('dragstart', block);
      document.removeEventListener('selectstart', block);
    };
  }, [enabled]);

  return null;
};
