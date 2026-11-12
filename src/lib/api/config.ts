/** Backend base URL including the stage path (`.../v1`). The build refuses to run without it (see vite.config.ts). */
export const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

if (!API_BASE_URL && import.meta.env.MODE !== 'test') {
  throw new Error('VITE_API_URL is not set');
}
