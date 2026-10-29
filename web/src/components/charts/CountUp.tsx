import { useCountUp } from './motion';

/** A number that counts up to its value. */
export default function CountUp({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const v = useCountUp(value);
  return (
    <span className={`tabular-nums ${className ?? ''}`} style={style}>
      {Math.round(v)}
    </span>
  );
}
