import type React from 'react';

/**
 * Props for a modal's dimmed backdrop so clicking it (outside the dialog) closes the modal.
 * The press must also start on the backdrop, so selecting text inside the dialog and releasing
 * the mouse outside does not close it. With confirmMessage the user is asked first (for editors
 * where closing would lose unsaved work).
 */
export function backdropClose(onClose: () => void, confirmMessage?: string) {
  let pressedOnBackdrop = false;
  return {
    onMouseDown: (e: React.MouseEvent) => {
      pressedOnBackdrop = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent) => {
      if (pressedOnBackdrop && e.target === e.currentTarget) {
        if (!confirmMessage || window.confirm(confirmMessage)) onClose();
      }
      pressedOnBackdrop = false;
    },
  };
}
