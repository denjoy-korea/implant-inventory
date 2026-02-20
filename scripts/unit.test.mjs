/**
 * Runtime execution tests for extractLengthFromSize (services/sizeUtils.ts)
 *
 * sizeUtils.ts is TypeScript and cannot be directly imported by Node's test
 * runner. Per Option D in the task spec the logic is re-implemented here from
 * the source so the test file actually *executes* the function and asserts
 * real return values rather than just pattern-matching source code.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Re-implementation of extractLengthFromSize from services/sizeUtils.ts
// (kept in sync with the original – any logic drift will be caught by review)
// ---------------------------------------------------------------------------
function extractLengthFromSize(size) {
  if (size === undefined || size === null) return '';
  const s = String(size).trim();
  if (!s) return '';

  // e.g. "3x4x13" → captures the middle dimension (4)
  const doubleXMatch = s.match(/[xX×*]\s*(\d+(\.\d+)?)\s*[xX×*]/);
  if (doubleXMatch) return doubleXMatch[1];

  // e.g. "4.5x13" → captures 13 (the number after x)
  const singleXMatch = s.match(/[xX×*]\s*(\d+(\.\d+)?)/);
  if (singleXMatch) return singleXMatch[1];

  // e.g. "L10" → captures 10
  const lMatch = s.match(/[lL]\s*(\d+(\.\d+)?)/);
  if (lMatch) return lMatch[1];

  // e.g. "410016" (6-digit code) → last 2 chars "16"
  const digitWithAlphaMatch = s.match(/\b(\d{4}|\d{6})[a-zA-Z]*\b/);
  if (digitWithAlphaMatch) {
    const fullDigits = digitWithAlphaMatch[1];
    return fullDigits.substring(fullDigits.length - 2);
  }

  // e.g. "1234" (4-digit code) → last 2 chars
  const simpleDigits = s.match(/\b(\d{4}|\d{6})\b/);
  if (simpleDigits) {
    const d = simpleDigits[0];
    return d.substring(d.length - 2);
  }

  return '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('extractLengthFromSize: "4.5x13" returns the number after x ("13")', () => {
  assert.equal(extractLengthFromSize('4.5x13'), '13');
});

test('extractLengthFromSize: "L10" returns "10" via L-prefix match', () => {
  assert.equal(extractLengthFromSize('L10'), '10');
});

test('extractLengthFromSize: "l10" (lowercase l) returns "10"', () => {
  assert.equal(extractLengthFromSize('l10'), '10');
});

test('extractLengthFromSize: "410016" returns last-2-digits of 6-digit code ("16")', () => {
  assert.equal(extractLengthFromSize('410016'), '16');
});

test('extractLengthFromSize: null returns empty string', () => {
  assert.equal(extractLengthFromSize(null), '');
});

test('extractLengthFromSize: undefined returns empty string', () => {
  assert.equal(extractLengthFromSize(undefined), '');
});

test('extractLengthFromSize: "" (empty string) returns empty string', () => {
  assert.equal(extractLengthFromSize(''), '');
});

test('extractLengthFromSize: "13" (2-digit, no prefix) returns empty string', () => {
  // 2-digit number does not match 4 or 6-digit code patterns; no x or L prefix
  assert.equal(extractLengthFromSize('13'), '');
});

test('extractLengthFromSize: numeric 42 returns empty string', () => {
  // Coerced to "42" – 2-digit, no matching pattern
  assert.equal(extractLengthFromSize(42), '');
});

test('extractLengthFromSize: "3x4x13" returns middle dimension "4" via double-x match', () => {
  assert.equal(extractLengthFromSize('3x4x13'), '4');
});

test('extractLengthFromSize: "X8.5" returns "8.5" (decimal after x)', () => {
  assert.equal(extractLengthFromSize('X8.5'), '8.5');
});

test('extractLengthFromSize: 4-digit code "1234" returns last 2 chars "34"', () => {
  assert.equal(extractLengthFromSize('1234'), '34');
});

test('extractLengthFromSize: whitespace-only string returns empty string', () => {
  assert.equal(extractLengthFromSize('   '), '');
});
