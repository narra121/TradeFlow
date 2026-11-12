import { ScopeBarSlot } from '@/components/shell/chrome';

interface ScopeSlotProps {
  side: 'left' | 'right';
  /** On phones the scope bar has room for the account and little else, so the page's own controls sit above its content. */
  inline: boolean;
  children: React.ReactNode;
}

export function ScopeSlot({ side, inline, children }: ScopeSlotProps) {
  if (inline) return <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>;
  return <ScopeBarSlot side={side}>{children}</ScopeBarSlot>;
}
