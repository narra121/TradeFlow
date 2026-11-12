import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export type PaneMode = 'closed' | 'new' | 'view' | 'edit';

export interface TradeParam {
  /** `new`, a trade id, or null when the pane is closed. */
  trade: string | null;
  mode: PaneMode;
  expanded: boolean;
  date: string | null;
  from: string | null;
  /** A cited list (`&ids=a,b,c`): Prev / Next walk it instead of the Trades list; null when there is none. */
  ids: string[] | null;
  openTrade: (id: string, opts?: { replace?: boolean; ids?: string[] }) => void;
  openNew: (opts?: { date?: string; from?: string }) => void;
  /** Opens a trade straight in edit mode (row menu, `E` on a row). */
  openEdit: (id: string) => void;
  setEdit: (on: boolean) => void;
  setExpanded: (on: boolean) => void;
  /** Steps to another trade without adding a history entry. */
  stepTo: (id: string) => void;
  close: () => void;
}

const PANE_KEYS = ['trade', 'edit', 'pane', 'date', 'from', 'ids'];

/**
 * The trade pane's whole state lives in the URL (`?trade=<id>|new&edit=1&pane=full&date=&from=`) so Back closes it,
 * a reload restores it and a link opens it. History rules: open = push, step = replace, close = back when the
 * pane was opened in this session, otherwise replace without the parameters.
 */
export function useTradeParam(): TradeParam {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const trade = params.get('trade');
  const idsParam = params.get('ids');
  const ids = useMemo(() => (idsParam ? idsParam.split(',').filter(Boolean) : null), [idsParam]);
  const mode: PaneMode = !trade ? 'closed' : trade === 'new' ? 'new' : params.get('edit') === '1' ? 'edit' : 'view';
  const state = (location.state ?? {}) as { tqPane?: boolean; tqEdit?: boolean };

  const write = useCallback(
    (mutate: (p: URLSearchParams) => void, replace: boolean, markPane = false, extra: Record<string, unknown> = {}) => {
      const next = new URLSearchParams(params);
      mutate(next);
      const search = next.toString();
      navigate(
        { pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash },
        { replace, state: { ...state, ...(markPane ? { tqPane: true } : {}), ...extra } },
      );
    },
    [params, navigate, location.pathname, location.hash, state],
  );

  return useMemo<TradeParam>(
    () => ({
      trade,
      mode,
      expanded: params.get('pane') === 'full',
      date: params.get('date'),
      from: params.get('from'),
      ids,
      openTrade: (id, opts) =>
        write(
          (p) => {
            p.set('trade', id);
            p.delete('edit');
            p.delete('date');
            p.delete('from');
            if (opts?.ids?.length) p.set('ids', opts.ids.join(','));
            else p.delete('ids');
          },
          !!opts?.replace,
          !opts?.replace && !state.tqPane,
        ),
      openEdit: (id) =>
        write(
          (p) => {
            p.set('trade', id);
            p.set('edit', '1');
            p.delete('date');
            p.delete('from');
          },
          false,
          !state.tqPane,
          { tqEdit: true },
        ),
      openNew: (opts) =>
        write(
          (p) => {
            p.set('trade', 'new');
            p.delete('edit');
            if (opts?.date) p.set('date', opts.date);
            else p.delete('date');
            if (opts?.from) p.set('from', opts.from);
            else p.delete('from');
          },
          false,
          !state.tqPane,
        ),
      setEdit: (on) => {
        if (on) write((p) => p.set('edit', '1'), false, true, { tqEdit: true });
        else if (state.tqEdit) navigate(-1);
        else write((p) => p.delete('edit'), true);
      },
      setExpanded: (on) => write((p) => (on ? p.set('pane', 'full') : p.delete('pane')), true),
      stepTo: (id) =>
        write(
          (p) => {
            p.set('trade', id);
            p.delete('edit');
          },
          true,
          false,
          { tqEdit: false },
        ),
      close: () => {
        if (state.tqPane) {
          navigate(-1);
          return;
        }
        write((p) => PANE_KEYS.forEach((k) => p.delete(k)), true);
      },
    }),
    [trade, mode, ids, params, write, navigate, state.tqPane, state.tqEdit],
  );
}
