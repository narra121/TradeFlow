import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock firebase/functions
// ---------------------------------------------------------------------------
const mockHttpsCallable = vi.fn().mockReturnValue(vi.fn());

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: any[]) => mockHttpsCallable(...args),
  getFunctions: vi.fn().mockReturnValue({ type: 'mock-functions' }),
}));

// Mock firebase init
vi.mock('../init', () => ({
  functions: { type: 'mock-functions' },
}));

describe('Cloud Functions callables', () => {
  it('creates generateInsightFn callable with correct function name', async () => {
    await import('../functions');

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      { type: 'mock-functions' },
      'generateInsight',
    );
  });

  it('creates startChatSessionFn callable with correct function name', async () => {
    await import('../functions');

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      { type: 'mock-functions' },
      'startChatSession',
    );
  });

  it('creates sendChatMessageFn callable with correct function name', async () => {
    await import('../functions');

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      { type: 'mock-functions' },
      'sendChatMessage',
    );
  });

  it('exports all three callable functions', async () => {
    const mod = await import('../functions');

    expect(mod.generateInsightFn).toBeDefined();
    expect(mod.startChatSessionFn).toBeDefined();
    expect(mod.sendChatMessageFn).toBeDefined();
  });

  it('creates exactly 3 callables', async () => {
    await import('../functions');

    expect(mockHttpsCallable).toHaveBeenCalledTimes(3);
  });
});
