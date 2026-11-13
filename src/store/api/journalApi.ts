import { api } from './baseApi';

export interface DayNote {
  date: string;
  /** null = the note belongs to the All accounts scope. */
  accountId: string | null;
  plan: string;
  review: string;
  updatedAt?: string;
}

export interface DayNotesArgs {
  from: string;
  to: string;
  /** The scope the notes are read for; `ALL` when no account is selected. */
  scope: string;
}

export const NOTE_MAX = 2000;

export const journalApi = api.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    getDayNotes: builder.query<DayNote[], DayNotesArgs>({
      query: ({ from, to, scope }) => ({ url: '/journal/days', params: { from, to, accountId: scope } }),
      transformResponse: (response: { days?: DayNote[] }) => response?.days ?? [],
    }),
    saveDayNote: builder.mutation<DayNote, { date: string; scope: string; plan?: string; review?: string; range: DayNotesArgs }>({
      query: ({ date, scope, plan, review }) => ({
        url: `/journal/days/${date}`,
        method: 'PUT',
        body: { accountId: scope === 'ALL' ? null : scope, ...(plan !== undefined ? { plan } : {}), ...(review !== undefined ? { review } : {}) },
      }),
      // The month's note list is patched in place so the cell mark and a reload agree without a refetch.
      async onQueryStarted({ range }, { dispatch, queryFulfilled }) {
        try {
          const { data: saved } = await queryFulfilled;
          dispatch(
            journalApi.util.updateQueryData('getDayNotes', range, (draft) => {
              const i = draft.findIndex((n) => n.date === saved.date);
              const empty = !saved.plan && !saved.review;
              if (i >= 0 && empty) draft.splice(i, 1);
              else if (i >= 0) draft[i] = saved;
              else if (!empty) draft.push(saved);
            }),
          );
        } catch {
          // the editor shows the failure under the field
        }
      },
    }),
  }),
});

export const { useGetDayNotesQuery, useSaveDayNoteMutation } = journalApi;

/** The notes endpoint answers 404 until the backend row is deployed; the note block is then not drawn. */
export function isNotesUnavailable(error: unknown): boolean {
  const status = (error as { status?: number } | undefined)?.status;
  return status === 404 || status === 403;
}
