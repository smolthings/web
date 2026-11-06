import { useEffect, useState } from 'react';

export const SAYINGS = [
  'tiny but mighty',
  "size doesn't matter to us",
  'little guy collectors',
  "big changes are vague, let's start smaller",
  'the big picture',
  'one popcorn big',
  'banana for scale',
  'build small, dream big'
];

const TYPE_MS = 45;
const ERASE_MS = 22;
const HOLD_MS = 3200;

// Picks a random saying that isn't the one we just showed.
const pick = prev => {
  let i;
  do i = Math.floor(Math.random() * SAYINGS.length);
  while (SAYINGS.length > 1 && i === prev);
  return i;
};

// Types a random saying, holds it, erases it, then types another random one.
export default function Sayings() {
  const [index, setIndex] = useState(() => pick(-1));
  const [shown, setShown] = useState(0);
  const [erasing, setErasing] = useState(false);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const text = SAYINGS[index];

  useEffect(() => {
    if (reduce) return;
    let id;
    if (!erasing && shown < text.length) id = setTimeout(() => setShown(s => s + 1), TYPE_MS);
    else if (!erasing) id = setTimeout(() => setErasing(true), HOLD_MS);
    else if (shown > 0) id = setTimeout(() => setShown(s => s - 1), ERASE_MS);
    else
      id = setTimeout(() => {
        setErasing(false);
        setIndex(pick);
      }, 300);
    return () => clearTimeout(id);
  }, [shown, erasing, text, reduce]);

  return (
    <p className="saying" aria-live="polite">
      <span className="hl">{reduce ? text : text.slice(0, shown) || ' '}</span>
    </p>
  );
}
