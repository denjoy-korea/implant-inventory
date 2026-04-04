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
  const normalizeId = (id: string) => id.split(path.sep).join('/').split(path.win32.sep).join('/');

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    server: {
      port: 3000,
      host: '0.0.0.0',
      // SPA fallback for brand/solution pathname routes (/about, /inventory/**, etc.)
      // is handled by Vite's built-in historyApiFallback in dev and
      // by vercel.json "/(.*) → /index.html" rewrite in production.
      watch: {
        // Exclude agent worktrees and bkit internal directories from file watching
        ignored: ['**/.claude/worktrees/**', '**/.bkit/snapshots/**'],
      },
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
      // xlsx(SheetJS) 번들은 업로드/분석 경로에서만 지연 로드되는 전용 청크라
      // 번들 경고 임계값을 실사용 경로 기준으로 조정한다.
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        onwarn(warning, warn) {
          const message = warning?.message ?? '';
          if (message.includes("didn't resolve at build time")) {
            const loc = warning.loc
              ? `${warning.loc.file ?? 'unknown'}:${warning.loc.line ?? 0}:${warning.loc.column ?? 0}`
              : 'unknown';
            console.warn(
              [
                '[build-resolve-trace]',
                `code=${warning.code ?? 'unknown'}`,
                `id=${(warning as { id?: string }).id ?? 'unknown'}`,
                `importer=${(warning as { importer?: string }).importer ?? 'unknown'}`,
                `loc=${loc}`,
              ].join(' ')
            );
          }
          warn(warning);
        },
        output: {
          manualChunks: (rawId) => {
            const id = normalizeId(rawId);

            if (id.includes('/node_modules/')) {
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
              if (id.includes('xlsx')) return 'xlsx-vendor';
              return undefined;
            }

            // First-party feature code should split at actual lazy boundaries.
            // Broad manual chunks created circular graphs across dashboard/public modules.
            return undefined;
          }
        },
      },
    },
  };
});
