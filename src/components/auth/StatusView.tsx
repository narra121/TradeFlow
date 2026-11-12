import { useEffect, useRef } from 'react';
import { CircleAlert, CircleCheck, CircleX, Clock, LoaderCircle } from 'lucide-react';
import { useFade } from '@/components/auth/useFade';
import { cn } from '@/lib/utils';

export type StatusIcon = 'ok' | 'quiet-ok' | 'loading' | 'cancelled' | 'failed' | 'expired';

interface StatusViewProps {
  icon: StatusIcon;
  title: string;
  /** Sentence under the title. */
  lead?: React.ReactNode;
  /** Buttons and the centred link. */
  actions?: React.ReactNode;
  /** Last line, under the actions. */
  footnote?: React.ReactNode;
  /** The block is a live region (a transient state the user waits on). */
  live?: boolean;
}

const ICON = {
  ok: { Icon: CircleCheck, tone: 'ok' },
  'quiet-ok': { Icon: CircleCheck, tone: 'quiet' },
  loading: { Icon: LoaderCircle, tone: 'quiet' },
  cancelled: { Icon: CircleX, tone: 'quiet' },
  failed: { Icon: CircleAlert, tone: 'bad' },
  expired: { Icon: Clock, tone: 'quiet' },
} as const;

/** A view with no form (DESIGN-AUTH §4.9): status badge, `h1` that takes focus so the outcome is read first, lead, actions, last line. */
export function StatusView({ icon, title, lead, actions, footnote, live }: StatusViewProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const { Icon, tone } = ICON[icon];
  const fade = useFade();
  return (
    <div role={live ? 'status' : undefined} className={fade}>
      <span className={cn('status-badge', tone === 'quiet' && icon === 'quiet-ok' ? 'quiet-ok' : tone)}>
        <Icon className={cn('status-ico', icon === 'loading' && 'spin')} aria-hidden="true" />
      </span>
      <h1 ref={heading} tabIndex={-1} className="auth-h1 outline-none">
        {title}
      </h1>
      {lead && <p className="auth-lead">{lead}</p>}
      {actions && <div className="actions">{actions}</div>}
      {footnote && <div className="below">{footnote}</div>}
    </div>
  );
}
