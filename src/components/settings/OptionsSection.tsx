import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { OptionList } from '@/components/settings/OptionList';
import { SectionHeading } from '@/components/settings/primitives';
import { MAIN_LISTS, MORE_LISTS, countUsage, hasValue, type ListDef } from '@/components/settings/optionLists';
import { useOptionLists } from '@/components/settings/useOptionLists';
import { useScopeTrades } from '@/hooks/useScopeTrades';

/** The pick lists of the trade form. Counts come from the trades loaded in the current scope; editing stays off until the saved lists load (M40). */
export function OptionsSection() {
  const o = useOptionLists();
  const { trades, isLoading: tradesLoading, truncated } = useScopeTrades(undefined, { skip: false });
  const [more, setMore] = useState(false);
  const usage = useMemo(
    () => (tradesLoading ? undefined : new Map([...MAIN_LISTS, ...MORE_LISTS].map((d) => [d.key, countUsage(d, trades)]))),
    [tradesLoading, trades],
  );

  if (o.isLoading && !o.loaded) return <Skeleton className="h-64" aria-busy="true" />;
  if (!o.loaded) {
    return <ErrorState title="Your trade options didn't load." description="Editing is off until they load, so nothing is overwritten." error={o.error} onRetry={o.refetch} />;
  }

  const render = (def: ListDef) => (
    <OptionList
      key={def.key}
      def={def}
      values={o.lists[def.key]}
      usage={usage?.get(def.key)}
      saving={o.saving === def.key}
      onAdd={(v) => o.update(def.key, (cur) => (hasValue(cur, v) ? cur : [...cur, v]))}
      onRemove={(v) => o.update(def.key, (cur) => cur.filter((x) => x !== v))}
      onReset={() => o.update(def.key, () => [...def.defaults])}
    />
  );

  return (
    <section aria-labelledby="opt-h">
      <SectionHeading
        id="opt-h"
        title="Trade options"
        hint={usage ? `Counts are for the ${trades.length.toLocaleString('en-US')} trades loaded${truncated ? ' (the newest 5,000)' : ''}.` : 'Counting trades…'}
      />
      {MAIN_LISTS.map(render)}
      <div className="border-t border-border pt-3">
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((m) => !m)}
          className="flex min-h-8 items-center gap-1 text-13 font-medium text-muted-foreground hover:text-foreground max-md:min-h-11"
        >
          <ChevronRight className={more ? 'h-4 w-4 rotate-90' : 'h-4 w-4'} aria-hidden="true" />
          More lists (Symbols, Timeframes)
        </button>
        {more && <div className="mt-2">{MORE_LISTS.map(render)}</div>}
      </div>
    </section>
  );
}
