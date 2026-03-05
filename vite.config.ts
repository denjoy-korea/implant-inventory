import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const buildId = (
    process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.GITHUB_SHA
    || process.env.BUILD_ID
    || 'dev-local'
  ).trim();

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [tailwindcss(), react()],
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
    },
    // AI API keys must NOT be injected into the client bundle via define.
    // Call external AI APIs through a server-side route (e.g. Supabase Edge Function).
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // exceljs 번들은 업로드/분석 경로에서만 지연 로드되는 전용 청크라
      // 번들 경고 임계값을 실사용 경로 기준으로 조정한다.
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (!id.includes('node_modules')) return undefined;
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-is/') ||
              id.includes('/scheduler/') ||
              id.includes('/use-sync-external-store/') ||
              id.includes('/react-helmet-async/') ||
              id.includes('/qrcode.react/')
            ) return 'react-vendor';
            if (id.includes('@supabase')) return 'supabase-vendor';
            if (id.includes('exceljs')) return 'exceljs-vendor';
            return undefined;
          }
        },
      },
    },
  };
});
