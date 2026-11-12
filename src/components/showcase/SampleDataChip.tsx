import './showcase.css';

/** The one `Sample data` label every showcase visual carries (amber, 20 px, radius 2). */
export function SampleDataChip({ className = '' }: { className?: string }) {
  return <span className={`tq-sample-chip ${className}`}>Sample data</span>;
}
