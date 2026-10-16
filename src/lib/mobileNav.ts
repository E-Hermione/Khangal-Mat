/**
 * Small shared state for phone-friendly navigation:
 * - a running exam asks before the student leaves it (back button, swipe, closing the page)
 * - the open lesson can take sideways swipes to move between its tabs
 * - scroll positions are remembered per page
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

// ---------- remembered places ----------
const safe = <T,>(f: () => T, fallback: T): T => {
  try {
    return f();
  } catch {
    return fallback;
  }
};
export const loadJSON = <T,>(key: string): T | null => safe(() => JSON.parse(localStorage.getItem(key) || 'null') as T | null, null);
export const saveJSON = (key: string, v: unknown) => safe(() => localStorage.setItem(key, JSON.stringify(v)), undefined);

const scrollKey = (place: string) => `alpha-scroll:${place}`;
let scrollPlace = '';
let scrollTimer: number | undefined;
/** Remember the scroll position for `place`, and go back to where the reader was in it */
export function enterScrollPlace(place: string) {
  if (place === scrollPlace) return;
  scrollPlace = place;
  const y = loadJSON<number>(scrollKey(place)) ?? 0;
  // wait for the page to render before scrolling
  let tries = 0;
  const go = () => {
    if (scrollPlace !== place) return;
    if (document.documentElement.scrollHeight - window.innerHeight >= y || tries > 20) window.scrollTo(0, y);
    else {
      tries++;
      window.setTimeout(go, 100);
    }
  };
  window.setTimeout(go, 50);
}
if (typeof window !== 'undefined') {
  window.addEventListener(
    'scroll',
    () => {
      window.clearTimeout(scrollTimer);
      const place = scrollPlace;
      scrollTimer = window.setTimeout(() => place && place === scrollPlace && saveJSON(scrollKey(place), Math.round(window.scrollY)), 250);
    },
    { passive: true }
  );
}
