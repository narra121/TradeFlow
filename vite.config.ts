import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(({ mode, command, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // `vite preview` (used by scripts/prerender-routes.js in every build) defaults to production mode and only serves dist/.
  for (const name of isPreview ? [] : ['VITE_API_URL', 'VITE_COGNITO_USER_POOL_ID', 'VITE_COGNITO_CLIENT_ID']) {
    if (!env[name]) throw new Error(`${name} is not set for mode "${mode}". Copy .env.example to .env.${mode}.local and fill it in.`);
  }
  // The dev API only allows its own CORS origins, so `vite` (development mode) talks to it through a same-origin proxy.
  const proxyDevApi = command === 'serve' && mode === 'development';
  const apiOrigin = proxyDevApi ? new URL(env.VITE_API_URL).origin : '';
  return {
  base: '/',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false,
    },
    proxy: proxyDevApi ? { '/v1': { target: apiOrigin, changeOrigin: true, secure: true } } : mode === 'localdev' ? {
      '/v1': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    } : undefined,
  },
  define: proxyDevApi ? { 'import.meta.env.VITE_API_URL': JSON.stringify('/v1') } : undefined,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'date-vendor': ['date-fns'],
          // Shared by every page through cn(); on its own it stays out of the recharts chunk, which public pages must not load.
          'ui-vendor': ['recharts'],
          'cn-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
  },
};
});
