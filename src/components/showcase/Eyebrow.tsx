import type { ReactNode } from 'react';
import './showcase.css';

/** Forma's eyebrow (DESIGN-SHARED S2.4): mono caps label after a round --primary dot. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`tq-eyebrow ${className}`}>{children}</p>;
}
