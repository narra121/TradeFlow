import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/auth
const mockSignInWithCustomToken = vi.fn();
const mockSignOut = vi.fn();
vi.mock('firebase/auth', () => ({
  signInWithCustomToken: (...args: any[]) => mockSignInWithCustomToken(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  getAuth: vi.fn(() => ({ name: 'mock-auth' })),
}));

// Mock firebase/app
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getApps: vi.fn(() => []),
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'mock-firestore' })),
}));

// Mock firebase/functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({ type: 'mock-functions' })),
}));

// Mock apiClient
const mockPost = vi.fn();
vi.mock('@/lib/api/api', () => ({
  default: { post: (...args: any[]) => mockPost(...args) },
}));

describe('Firebase auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module to clear the singleton promise between tests
    vi.resetModules();
  });

  async function loadModule() {
    return import('../auth');
  }

  describe('initFirebaseAuth', () => {
    it('calls apiClient.post and signInWithCustomToken on success', async () => {
      mockPost.mockResolvedValueOnce({ firebaseToken: 'custom-token-123' });
      mockSignInWithCustomToken.mockResolvedValueOnce({ user: { uid: 'u1' } });

      const { initFirebaseAuth } = await loadModule();
      await initFirebaseAuth();

      expect(mockPost).toHaveBeenCalledWith('/auth/firebase-token');
      expect(mockSignInWithCustomToken).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'mock-auth' }),
        'custom-token-123',
      );
    });

    it('warns and does not throw when apiClient.post fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockPost.mockRejectedValueOnce(new Error('Network fail'));

      const { initFirebaseAuth } = await loadModule();
      // Should not throw
      await initFirebaseAuth();

      expect(warnSpy).toHaveBeenCalledWith('Firebase auth failed:', expect.any(Error));
      expect(mockSignInWithCustomToken).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns when response has no firebaseToken', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockPost.mockResolvedValueOnce({ something: 'else' });

      const { initFirebaseAuth } = await loadModule();
      await initFirebaseAuth();

      expect(warnSpy).toHaveBeenCalledWith(
        'Firebase auth failed:',
        expect.objectContaining({ message: 'No firebaseToken in response' }),
      );
      expect(mockSignInWithCustomToken).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('deduplicates concurrent calls (singleton promise)', async () => {
      let resolvePost!: (val: any) => void;
      mockPost.mockReturnValueOnce(
        new Promise((r) => {
          resolvePost = r;
        }),
      );
      mockSignInWithCustomToken.mockResolvedValue({ user: { uid: 'u1' } });

      const { initFirebaseAuth } = await loadModule();

      // Start two concurrent calls
      const p1 = initFirebaseAuth();
      const p2 = initFirebaseAuth();

      // Both should be the same promise
      expect(p1).toBe(p2);

      resolvePost({ firebaseToken: 'tok' });
      await p1;
      await p2;

      // Only one API call should have been made
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('resets singleton after completion, allowing retry', async () => {
      mockPost
        .mockResolvedValueOnce({ firebaseToken: 'tok-1' })
        .mockResolvedValueOnce({ firebaseToken: 'tok-2' });
      mockSignInWithCustomToken.mockResolvedValue({ user: { uid: 'u1' } });

      const { initFirebaseAuth } = await loadModule();

      await initFirebaseAuth();
      expect(mockPost).toHaveBeenCalledTimes(1);

      // After completion, a new call should make a new request
      await initFirebaseAuth();
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  describe('signOutFirebase', () => {
    it('calls signOut on auth instance', async () => {
      mockSignOut.mockResolvedValueOnce(undefined);

      const { signOutFirebase } = await loadModule();
      await signOutFirebase();

      expect(mockSignOut).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'mock-auth' }),
      );
    });

    it('does not throw when signOut fails', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('sign out error'));

      const { signOutFirebase } = await loadModule();
      // Should not throw
      await signOutFirebase();

      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
