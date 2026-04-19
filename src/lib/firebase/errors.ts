export function parseFirebaseError(err: unknown, defaultMessage: string): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const fbErr = err as { code: string; message: string };
    if (fbErr.code === 'functions/resource-exhausted') {
      return 'Rate limit exceeded. Please try again later.';
    }
    return fbErr.message || defaultMessage;
  }
  return err instanceof Error ? err.message : defaultMessage;
}
