import { forwardRef } from 'react';
import { useFade } from '@/components/auth/useFade';
import { CircleAlert, CircleCheck, Clock, Info, WifiOff } from 'lucide-react';

export type NoticeTone = 'info' | 'success' | 'warning' | 'error';
export type NoticeIcon = 'info' | 'clock' | 'wifi';

interface AuthNoticeProps {
  tone: NoticeTone;
  icon?: NoticeIcon;
  title?: string;
  children?: React.ReactNode;
  /** Takes focus after a failed submit; a plain notice does not. */
  focusable?: boolean;
}

const ICONS = { info: Info, clock: Clock, wifi: WifiOff } as const;

/** One box for every message that is not tied to a single field (DESIGN-AUTH §4.6). The live region around it lives in the page. */
export const AuthNotice = forwardRef<HTMLDivElement, AuthNoticeProps>(({ tone, icon, title, children, focusable }, ref) => {
  const fade = useFade();
  const Icon = tone === 'error' ? (icon === 'clock' ? Clock : CircleAlert) : tone === 'success' ? CircleCheck : tone === 'warning' ? WifiOff : ICONS[icon ?? 'info'];
  return (
    <div ref={ref} tabIndex={focusable ? -1 : undefined} className={`notice ${fade ?? ''} ${tone === 'info' ? '' : tone} outline-none`.replace(/\s+/g, ' ').trim()}>
      <Icon className="ico" aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
});
AuthNotice.displayName = 'AuthNotice';
