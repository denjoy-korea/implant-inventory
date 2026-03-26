import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // 순수 유틸리티 서비스만 커버리지 측정 (Supabase 의존 없는 파일)
      include: [
        'services/normalizationService.ts',
        'services/sizeNormalizer.ts',
        'services/appUtils.ts',
        'services/dateUtils.ts',
        'services/surgeryParser.ts',
        'services/unregisteredMatchingUtils.ts',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
