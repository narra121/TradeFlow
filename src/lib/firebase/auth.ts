import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './init';
import apiClient from '@/lib/api/api';

let firebaseAuthPromise: Promise<void> | null = null;

export function initFirebaseAuth(): Promise<void> {
  if (firebaseAuthPromise) return firebaseAuthPromise;
  firebaseAuthPromise = doFirebaseAuth().finally(() => {
    firebaseAuthPromise = null;
  });
  return firebaseAuthPromise;
}

async function doFirebaseAuth(): Promise<void> {
  try {
    const response = await apiClient.post('/auth/firebase-token');
    const token = (response as any)?.firebaseToken;
    if (!token) throw new Error('No firebaseToken in response');
    await signInWithCustomToken(auth, token);
  } catch (e) {
    console.warn('Firebase auth failed:', e);
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Non-critical
  }
}
