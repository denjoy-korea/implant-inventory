import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('vite exposes NEXT_PUBLIC_ env vars for legacy Toss client key configs', () => {
  const viteConfig = readFileSync('vite.config.ts', 'utf8');
  assert.match(
    viteConfig,
    /envPrefix:\s*\[\s*'VITE_'\s*,\s*'NEXT_PUBLIC_'\s*\]/,
    'vite.config.ts must expose NEXT_PUBLIC_ env vars for compatibility',
  );
});

test('toss payment service falls back to NEXT_PUBLIC_TOSS_CLIENT_KEY', () => {
  const paymentService = readFileSync('services/tossPaymentService.ts', 'utf8');
  assert.match(
    paymentService,
    /VITE_TOSS_CLIENT_KEY\s*\|\|\s*env\.NEXT_PUBLIC_TOSS_CLIENT_KEY/,
    'tossPaymentService must support the legacy NEXT_PUBLIC_TOSS_CLIENT_KEY env name',
  );
});
