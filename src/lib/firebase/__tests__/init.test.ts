import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock firebase modules
// ---------------------------------------------------------------------------
const mockInitializeApp = vi.fn().mockReturnValue({ name: 'test-app' });
const mockGetApps = vi.fn().mockReturnValue([]);
const mockGetAuth = vi.fn().mockReturnValue({ currentUser: null });
const mockGetFirestore = vi.fn().mockReturnValue({ type: 'firestore' });
const mockGetFunctions = vi.fn().mockReturnValue({ type: 'functions' });

vi.mock('firebase/app', () => ({
  initializeApp: (...args: any[]) => mockInitializeApp(...args),
  getApps: () => mockGetApps(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: (...args: any[]) => mockGetAuth(...args),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: (...args: any[]) => mockGetFirestore(...args),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: (...args: any[]) => mockGetFunctions(...args),
}));

describe('Firebase init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('initializes Firebase app with env config', async () => {
    mockGetApps.mockReturnValue([]);
    const mod = await import('../init');

    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockInitializeApp).toHaveBeenCalledWith({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    expect(mod.app).toBeDefined();
  });

  it('reuses existing app if already initialized', async () => {
    const existingApp = { name: 'existing-app' };
    mockGetApps.mockReturnValue([existingApp]);
    const mod = await import('../init');

    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mod.app).toBe(existingApp);
  });

  it('initializes Firebase Auth', async () => {
    mockGetApps.mockReturnValue([]);
    const mod = await import('../init');

    expect(mockGetAuth).toHaveBeenCalledTimes(1);
    expect(mod.auth).toBeDefined();
  });

  it('initializes Firestore', async () => {
    mockGetApps.mockReturnValue([]);
    const mod = await import('../init');

    expect(mockGetFirestore).toHaveBeenCalledTimes(1);
    expect(mod.db).toBeDefined();
  });

  it('initializes Cloud Functions with us-central1 region', async () => {
    mockGetApps.mockReturnValue([]);
    const mod = await import('../init');

    expect(mockGetFunctions).toHaveBeenCalledTimes(1);
    expect(mockGetFunctions).toHaveBeenCalledWith(expect.anything(), 'us-central1');
    expect(mod.functions).toBeDefined();
  });

  it('exports app, auth, db, and functions', async () => {
    mockGetApps.mockReturnValue([]);
    const mod = await import('../init');

    expect(mod).toHaveProperty('app');
    expect(mod).toHaveProperty('auth');
    expect(mod).toHaveProperty('db');
    expect(mod).toHaveProperty('functions');
  });
});
