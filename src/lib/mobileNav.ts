/**
 * Small shared state for phone-friendly navigation:
 * - a running exam asks before the student leaves it (back button, swipe, closing the page)
 * - the open lesson can take sideways swipes to move between its tabs
 */

// ---------- running exam ----------
let examLeave: (() => void) | null = null;
export const isExamActive = () => examLeave !== null;
/** Mark an exam as running; `leave` closes it when the student confirms leaving. Returns the cleanup. */
export function setExamActive(leave: () => void): () => void {
  examLeave = leave;
  window.dispatchEvent(new Event('alpha-exam-change'));
  return () => {
    if (examLeave === leave) examLeave = null;
    window.dispatchEvent(new Event('alpha-exam-change'));
  };
}
export function leaveExam() {
  const f = examLeave;
  examLeave = null;
  f?.();
}
export const EXAM_LEAVE_TEXT = 'Сорилоос гарах уу? Таны хариултууд хадгалагдахгүй.';

// ---------- sideways swipes inside the open lesson ----------
type SwipeHandler = (dir: 'prev' | 'next') => boolean;
let swipeHandler: SwipeHandler | null = null;
/** The lesson registers a handler; it returns true when it used the swipe */
export function setSwipeHandler(h: SwipeHandler | null) {
  swipeHandler = h;
}
export const handleSwipe = (dir: 'prev' | 'next') => (swipeHandler ? swipeHandler(dir) : false);

// ---------- leaving the page during an exam ----------
export const EXAM_FOCUS_RULE =
  'Сорил эхэлсний дараа өөр таб, апп эсвэл дэлгэц рүү шилжвэл сорил шууд зогсож, өгөөгүйд тооцогдоно.';
export const EXAM_STOPPED_TEXT = 'Та сорилын үеэр өөр дэлгэц рүү шилжсэн тул сорил зогсож, өгөөгүйд тооцогдлоо.';
/** Calls `stop` as soon as the page is hidden (another tab, another app, the home screen). Returns the cleanup. */
export function stopWhenHidden(stop: () => void): () => void {
  let done = false;
  const onHide = () => {
    if (done || document.visibilityState !== 'hidden') return;
    done = true;
    stop();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onHide);
  return () => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', onHide);
  };
}
