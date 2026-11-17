import { useEffect } from 'react';
import { ImportCenter } from '@/components/import/ImportCenter';
import { usePageChrome } from '@/components/shell/chrome';
import { useEntitlements } from '@/hooks/useEntitlements';
import { formatDayText } from '@/lib/format';
import { importFlow, useImportFlow } from '@/lib/importFlowStore';
import { SCREENSHOT_SOURCE } from '@/types/import';

/** `1 Dec`: a date in running text (DESIGN-ENTERPRISE D.3: no leading zero outside tables), never split across lines. */
function proseDate(value: string): string {
  return formatDayText(value).replace(' ', '\u00a0');
}

/** Import page: one progressive screen for broker files and screenshots; its state outlives the route. */
export function ImportView() {
  const flow = useImportFlow();
  const ent = useEntitlements();
  const screenshots = flow.detected === SCREENSHOT_SOURCE;
  const quota = ent.usage.find((u) => u.feature === (screenshots ? 'ai_extract' : 'broker_import'));
  const noun = screenshots ? 'AI extractions' : 'Broker imports';
  const statement = !quota
    ? 'Import trades from a broker file or screenshots'
    : quota.limit === null
      ? `${noun} this month: ${quota.used} used`
      : `${noun} this month: ${quota.used} of ${quota.limit}${ent.periodResetsAt ? ` · resets ${proseDate(ent.periodResetsAt)}` : ''}`;
  usePageChrome({ statement });

  // Reviewed rows live in memory only, so closing the tab with rows in review asks first.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (importFlow.hasUnsavedReview()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  return <ImportCenter />;
}
