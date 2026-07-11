/**
 * Nested-safe body scroll lock.
 * With `scrollbar-gutter: stable` on html the viewport width already stays
 * constant, so we only toggle overflow — no padding compensation needed.
 */
let lockCount = 0;
let previousOverflow = '';

export const lockBodyScroll = (): void => {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
};

export const unlockBodyScroll = (): void => {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
};
