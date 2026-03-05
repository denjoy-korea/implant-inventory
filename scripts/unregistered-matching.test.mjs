/**
 * Unit tests for services/unregisteredMatchingUtils.ts (pure functions)
 * Implements logic inline in JS — no TypeScript import chain needed.
 * (Same pattern as unit.test.mjs)
 * Run: node scripts/unregistered-matching.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ──────────────────────────────────────────────────────────────
// Re-implementation of detectSizePattern (keep in sync with source)
// services/unregisteredMatchingUtils.ts
// ──────────────────────────────────────────────────────────────
function detectSizePattern(size) {
  const s = size.trim();
  if (!s) return 'empty';
  if (/^C\d+\s*[Φφ]/i.test(s)) return 'cuff-phi';
  if (/[Φφ]\s*\d/.test(s)) return 'phi';
  if (/[Øø]\s*\d.*\/\s*L/i.test(s)) return 'oslash-l';
  if (/[Øø]\s*\d.*mm/i.test(s)) return 'oslash-mm';
  if (/D[:\s]*\d.*L[:\s]*\d/i.test(s)) return 'dl-cuff';
  if (/^\d{4,6}[a-zA-Z]*$/.test(s)) return 'numeric-code';
  if (/\d+\.?\d*\s*[×xX*]\s*\d/.test(s)) return 'bare-numeric';
  return 'other';
}

// ──────────────────────────────────────────────────────────────
// Re-implementation of pickDominantPattern
// ──────────────────────────────────────────────────────────────
function pickDominantPattern(patterns) {
  const counts = new Map();
  patterns.forEach(p => counts.set(p, (counts.get(p) ?? 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0]?.[0] ?? 'other';
}

// ──────────────────────────────────────────────────────────────
// detectSizePattern — all branches
// ──────────────────────────────────────────────────────────────
test('detectSizePattern: empty string → empty', () => {
  assert.equal(detectSizePattern(''), 'empty');
});

test('detectSizePattern: whitespace-only → empty', () => {
  assert.equal(detectSizePattern('   '), 'empty');
});

test('detectSizePattern: C3Φ3.5 → cuff-phi', () => {
  assert.equal(detectSizePattern('C3Φ3.5'), 'cuff-phi');
});

test('detectSizePattern: c2 φ4.0 (lowercase) → cuff-phi', () => {
  assert.equal(detectSizePattern('c2 φ4.0'), 'cuff-phi');
});

test('detectSizePattern: Φ4.0x10 → phi', () => {
  assert.equal(detectSizePattern('Φ4.0x10'), 'phi');
});

test('detectSizePattern: φ3.5 x 8.5 → phi', () => {
  assert.equal(detectSizePattern('φ3.5 x 8.5'), 'phi');
});

test('detectSizePattern: Ø4.2/L10 → oslash-l', () => {
  assert.equal(detectSizePattern('Ø4.2/L10'), 'oslash-l');
});

test('detectSizePattern: Ø 3.5 / L 8 (with spaces) → oslash-l', () => {
  assert.equal(detectSizePattern('Ø 3.5 / L 8'), 'oslash-l');
});

test('detectSizePattern: Ø4.0x10mm → oslash-mm', () => {
  assert.equal(detectSizePattern('Ø4.0x10mm'), 'oslash-mm');
});

test('detectSizePattern: ø3.5 12mm → oslash-mm', () => {
  assert.equal(detectSizePattern('ø3.5 12mm'), 'oslash-mm');
});

test('detectSizePattern: D:4.0 L:10 → dl-cuff', () => {
  assert.equal(detectSizePattern('D:4.0 L:10'), 'dl-cuff');
});

test('detectSizePattern: D 4 L 8 → dl-cuff', () => {
  assert.equal(detectSizePattern('D 4 L 8'), 'dl-cuff');
});

test('detectSizePattern: 123456 (6-digit) → numeric-code', () => {
  assert.equal(detectSizePattern('123456'), 'numeric-code');
});

test('detectSizePattern: 1234AB (4-digit + alpha) → numeric-code', () => {
  assert.equal(detectSizePattern('1234AB'), 'numeric-code');
});

test('detectSizePattern: 4.0x10 → bare-numeric', () => {
  assert.equal(detectSizePattern('4.0x10'), 'bare-numeric');
});

test('detectSizePattern: 3.5 × 8.5 (×) → bare-numeric', () => {
  assert.equal(detectSizePattern('3.5 × 8.5'), 'bare-numeric');
});

test('detectSizePattern: 4.0 X 10 (uppercase X) → bare-numeric', () => {
  assert.equal(detectSizePattern('4.0 X 10'), 'bare-numeric');
});

test('detectSizePattern: GS IV Regular → other', () => {
  assert.equal(detectSizePattern('GS IV Regular'), 'other');
});

// ──────────────────────────────────────────────────────────────
// pickDominantPattern
// ──────────────────────────────────────────────────────────────
test('pickDominantPattern: majority wins', () => {
  assert.equal(pickDominantPattern(['phi', 'phi', 'oslash-mm']), 'phi');
});

test('pickDominantPattern: majority wins (unordered input)', () => {
  assert.equal(pickDominantPattern(['other', 'phi', 'phi']), 'phi');
});

test('pickDominantPattern: tie → lexicographic — oslash-mm < phi', () => {
  assert.equal(pickDominantPattern(['phi', 'oslash-mm']), 'oslash-mm');
});

test('pickDominantPattern: tie → lexicographic — empty < other', () => {
  assert.equal(pickDominantPattern(['other', 'empty']), 'empty');
});

test('pickDominantPattern: empty array → other (fallback)', () => {
  assert.equal(pickDominantPattern([]), 'other');
});

test('pickDominantPattern: single element', () => {
  assert.equal(pickDominantPattern(['empty']), 'empty');
});
