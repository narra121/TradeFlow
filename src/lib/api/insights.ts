import axios from 'axios';
import apiClient from './api';
import type { InsightsApiResponse, GenerateInsightsRequest } from '@/types/insights';

const GENERATE_INSIGHTS_URL = import.meta.env.VITE_GENERATE_INSIGHTS_URL;

export const insightsApi = {
  // Calls Lambda Function URL directly (bypasses API Gateway 30s timeout).
  // Auth: getUserId() decodes JWT from Authorization header — same as API Gateway path.
  generateInsights: async (payload: GenerateInsightsRequest): Promise<InsightsApiResponse> => {
    if (GENERATE_INSIGHTS_URL) {
      const token = localStorage.getItem('idToken');
      const res = await axios.post(GENERATE_INSIGHTS_URL, payload, {
        timeout: 90_000,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const body = res.data;
      if (body?.data !== undefined) return body;
      return body;
    }
    // Fallback: API Gateway route (30s limit)
    return apiClient.post('/insights', payload, { timeout: 90_000 });
  },

  chat: async (payload: {
    message: string;
    accountId?: string;
    startDate: string;
    endDate: string;
    history?: Array<{ role: string; content: string }>;
  }): Promise<{ data: { reply: string; suggestedQuestions?: string[] } }> => {
    return apiClient.post('/insights/chat', payload, { timeout: 30_000 });
  },
};
