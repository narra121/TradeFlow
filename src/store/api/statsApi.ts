/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import { api } from './baseApi';
import type { AggregatedStats } from '@/types/stats';

interface StatsParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  includeEquityCurve?: boolean;
  totalCapital?: number;
}

export interface TaxBucket {
  trades: number;
  wins: number;
  losses: number;
  grossPnl: number;
  fees: number;
  netPnl: number;
}

/** `GET /reports/tax` (Pro): India charges and tax P&L for one financial year, amounts in the accounts' rupees. */
export interface TaxReportData {
  fy: string;
  period: { from: string; to: string };
  accountId: string | null;
  intradayEquity: TaxBucket;
  fno: TaxBucket & { turnover: number; auditThreshold: number; auditThresholdExceeded: boolean };
  commodity: TaxBucket;
  delivery: { shortTerm: TaxBucket; longTerm: TaxBucket };
  notCovered: { trades: number; netPnl: number };
  charges: { total: number; stt: number; exchange: number; sebi: number; stamp: number; brokerageGstAndOther: number };
  warnings: string[];
}

export const statsApi = api.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    getStats: builder.query<AggregatedStats, StatsParams | void>({
      query: (params) => ({
        url: '/stats',
        params: params || undefined,
      }),
      transformResponse: (response: any): AggregatedStats => {
        // baseApi already unwraps { success, data, message } envelope
        return response as AggregatedStats;
      },
      providesTags: (_result, _error, rawParams) => {
        const params = rawParams as StatsParams | undefined;
        return [
        { type: 'Stats' as const, id: `${params?.accountId}-${params?.startDate}-${params?.endDate}` },
        { type: 'Stats' as const, id: 'LIST' },
        ];
      },
    }),

    getTaxReport: builder.query<TaxReportData, { fy: string; accountId?: string }>({
      query: ({ fy, accountId }) => ({ url: '/reports/tax', params: { fy, accountId: accountId && accountId !== 'ALL' ? accountId : undefined } }),
      transformResponse: (response: any): TaxReportData => response.report,
      providesTags: [{ type: 'Stats' as const, id: 'TAX' }],
    }),
  }),
});

export const { useGetStatsQuery, useGetTaxReportQuery } = statsApi;
