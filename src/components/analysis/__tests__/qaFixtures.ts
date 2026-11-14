import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Analysis } from '@/types/analysis';

// GET /v1/analysis answers produced by JournalAWSSetup src/features/analysis (routes + buildAnalysis) on its QA fixture
// (__tests__/fixtures/qa-trades.json), accounts FTMO 100K (USD) and Zerodha F&O (INR), 2026-08-01..2026-11-13, Asia/Kolkata.
const here = dirname(fileURLToPath(import.meta.url));
const load = (name: string): Analysis => JSON.parse(readFileSync(resolve(here, 'fixtures', name), 'utf8')) as Analysis;

export const QA_USD = load('qa-analysis-usd.json');
export const QA_INR = load('qa-analysis-inr.json');
export const QA_SCOPE = { from: '2026-08-01', to: '2026-11-13' };
export const QA_USD_ACCOUNT = '4d75d547-823f-4084-ba83-ae2ad36edd96';
export const QA_INR_ACCOUNT = '82be0a11-fb86-41c9-b9f7-c36862cd35e9';
