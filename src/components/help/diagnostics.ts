import { CHANGELOG_ENTRIES } from '@/content/changelog/entries';
import { SUPPORT_EMAIL } from '@/content/product-facts';

export type MessageKind = 'problem' | 'idea' | 'other';

export const KIND_LABEL: Record<MessageKind, string> = { problem: 'Problem', idea: 'Idea', other: 'Other' };
export const MAX_MESSAGE = 2000;

export const appVersion = (): string => CHANGELOG_ENTRIES[0]?.version ?? '';

export interface Diagnostics {
  page: string;
  appVersion: string;
  userAgent: string;
}

/** Route and build only: never trade data, names or email. */
export function collectDiagnostics(): Diagnostics {
  return {
    page: typeof window !== 'undefined' ? window.location.pathname : '',
    appVersion: appVersion(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

/** `mailto:` for Contact support (and for feedback until the endpoint exists): subject and context prefilled. */
export function supportMailto(kind: 'support' | MessageKind, message: string, diag: Diagnostics | null): string {
  const subject = kind === 'support' ? 'TradeQut support request' : `TradeQut feedback: ${KIND_LABEL[kind]}`;
  const context = diag ? `\n\n---\nPage: ${diag.page}\nApp version: ${diag.appVersion}\nBrowser: ${diag.userAgent}` : '';
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${message.trim()}${context}`)}`;
}

/** Opens the user's mail client; a function of its own so tests can observe it. */
export function openMail(url: string): void {
  window.location.href = url;
}
