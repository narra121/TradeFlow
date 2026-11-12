import { beforeEach, describe, expect, it } from 'vitest';
import { batchFile, groupBatches, rememberBatchFile } from '../batches';

describe('groupBatches', () => {
  it('groups trades by importBatchId with count, span and earliest import time, newest import first', () => {
    const out = groupBatches([
      { importBatchId: 'b1', accountId: 'a1', importSource: 'zerodha', createdAt: '2026-10-05T10:00:00.000Z', openDate: '2026-10-01T04:00:00.000Z', closeDate: '2026-10-01T06:00:00.000Z' },
      { importBatchId: 'b1', accountId: 'a1', importSource: 'zerodha', createdAt: '2026-10-05T10:00:01.000Z', openDate: '2026-09-28T04:00:00.000Z', closeDate: '2026-10-03T06:00:00.000Z' },
      { importBatchId: 'b2', accountId: 'a2', importSource: 'ai_screenshot', createdAt: '2026-11-01T10:00:00.000Z', openDate: '2026-10-30T04:00:00.000Z' },
      { accountId: 'a1', openDate: '2026-10-02T04:00:00.000Z' },
    ]);
    expect(out.map((b) => b.batchId)).toEqual(['b2', 'b1']);
    expect(out[1]).toMatchObject({ count: 2, accountId: 'a1', source: 'zerodha', importedAt: '2026-10-05T10:00:00.000Z', from: '2026-09-28T04:00:00.000Z', to: '2026-10-03T06:00:00.000Z' });
  });

  it('skips deleted trades and trades without an account, and marks several sources as mixed', () => {
    const out = groupBatches([
      { importBatchId: 'b1', accountId: 'a1', importSource: 'zerodha', createdAt: '2026-10-05T10:00:00.000Z', openDate: '2026-10-01T00:00:00.000Z' },
      { importBatchId: 'b1', accountId: 'a1', importSource: 'dhan', createdAt: '2026-10-05T10:00:00.000Z', openDate: '2026-10-01T00:00:00.000Z' },
      { importBatchId: 'b1', accountId: 'a1', importSource: 'dhan', deletedAt: '2026-10-06T00:00:00.000Z' },
      { importBatchId: 'b9', openDate: '2026-10-01T00:00:00.000Z' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ count: 2, source: 'mixed' });
  });
});

describe('batch file names', () => {
  beforeEach(() => localStorage.clear());

  it('remembers the file name per batch and returns null for an unknown batch', () => {
    rememberBatchFile('b1', 'tradebook-oct.csv');
    expect(batchFile('b1')).toBe('tradebook-oct.csv');
    expect(batchFile('nope')).toBeNull();
  });

  it('keeps the newest hundred', () => {
    for (let i = 0; i < 105; i++) rememberBatchFile(`b${i}`, `f${i}`);
    expect(batchFile('b104')).toBe('f104');
    expect(batchFile('b0')).toBeNull();
  });
});
