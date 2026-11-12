import { toast } from 'sonner';

const tradeQuery = (id: string) => `${window.location.pathname}?trade=${encodeURIComponent(id)}`;

export function copyTradeLink(id: string): void {
  void navigator.clipboard?.writeText(`${window.location.origin}${tradeQuery(id)}`).then(() => toast.success('Link copied'));
}

export function openTradeInNewTab(id: string): void {
  window.open(tradeQuery(id), '_blank', 'noopener');
}
