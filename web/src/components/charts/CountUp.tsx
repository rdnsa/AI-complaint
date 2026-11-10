import { useCountUp, useCountProgress } from './motion';

/** A number that counts up to its value. */
export default function CountUp({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const v = useCountUp(value);
  return (
    <span className={`tabular-nums ${className ?? ''}`} style={style}>
      {Math.round(v)}
    </span>
  );
}

/**
 * A text whose numbers count up together from 0: "24/29", "14 h 57 min", "31%".
 * The words stay put; only the digits run, all finishing at the same moment.
 * A plain number works too. Use it for values shown on arrival, not for readouts
 * that change under the pointer, which should answer at once.
 */
export function CountText({ value, className, style }: { value: string | number; className?: string; style?: React.CSSProperties }) {
  const text = String(value);
  const p = useCountProgress(text);
  // Whole numbers only: a decimal point or thousands separator would be counted as two numbers.
  const parts = text.split(/(\d+)/);
  return (
    <span className={`tabular-nums ${className ?? ''}`} style={style}>
      {parts.map((part, i) => (i % 2 ? Math.round(Number(part) * p) : part)).join('')}
    </span>
  );
}
