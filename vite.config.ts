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
      port: 3001,
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
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'react-vendor';
              if (id.includes('@supabase')) return 'supabase-vendor';
              if (id.includes('lucide')) return 'lucide-icons';
              if (id.includes('framer-motion')) return 'framer-motion';
              if (id.includes('recharts')) return 'recharts';
              if (id.includes('date-fns')) return 'date-fns';
              if (id.includes('xlsx')) return 'xlsx-vendor';
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
