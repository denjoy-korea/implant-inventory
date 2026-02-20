import { supabase } from './supabaseClient';
import type { FixtureReferenceRow } from './fixtureReferenceBase';

export type { FixtureReferenceRow };

interface DbFixtureReferenceRow {
  manufacturer: string | null;
  brand: string | null;
  size: string | null;
}

const TABLE_NAME = 'fixture_reference_defaults';
const STORAGE_KEY = 'fixture_reference_defaults_cache_v1';
const STORAGE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SUPABASE_TIMEOUT_MS = 1200;

let cachedRows: FixtureReferenceRow[] | null = null;
let inflightPromise: Promise<FixtureReferenceRow[]> | null = null;
let refreshPromise: Promise<void> | null = null;
let hasLoggedSupabaseFallback = false;

interface FixtureReferenceCachePayload {
  savedAt: number;
  rows: FixtureReferenceRow[];
}

function sanitizeRows(rows: Array<Partial<DbFixtureReferenceRow> | Partial<FixtureReferenceRow>>): FixtureReferenceRow[] {
  const dedup = new Set<string>();
  const normalized: FixtureReferenceRow[] = [];

  rows.forEach(row => {
    const manufacturer = String(row.manufacturer ?? '').trim();
    const brand = String(row.brand ?? '').trim();
    const size = String(row.size ?? '').trim();
    if (!manufacturer || !brand || !size) return;

    const key = `${manufacturer}|${brand}|${size}`;
    if (dedup.has(key)) return;
    dedup.add(key);
    normalized.push({ manufacturer, brand, size });
  });

  return normalized;
}

async function fetchFromSupabase(): Promise<FixtureReferenceRow[]> {
  const hasSupabaseEnv = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  if (!hasSupabaseEnv) return [];

  const queryPromise = supabase
    .from(TABLE_NAME)
    .select('manufacturer, brand, size')
    .eq('is_active', true);

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), SUPABASE_TIMEOUT_MS);
  });

  const queryResult = await Promise.race([queryPromise, timeoutPromise]);
  if (queryResult === null) {
    if (!hasLoggedSupabaseFallback) {
      console.warn('[fixtureReferenceService] Supabase fixture reference 조회 timeout. 로컬 참조값 fallback 사용');
      hasLoggedSupabaseFallback = true;
    }
    return [];
  }

  const { data, error } = queryResult;

  if (error) {
    if (!hasLoggedSupabaseFallback) {
      console.warn(
        '[fixtureReferenceService] Supabase fixture reference 조회 실패, 로컬 참조값으로 fallback 합니다:',
        error.message
      );
      hasLoggedSupabaseFallback = true;
    }
    return [];
  }

  return sanitizeRows((data ?? []) as DbFixtureReferenceRow[]);
}

async function fetchFromLocalFallback(): Promise<FixtureReferenceRow[]> {
  const module = await import('./fixtureReferenceBase');
  return sanitizeRows(module.FIXTURE_REFERENCE_BASE);
}

function readStorageCache(): FixtureReferenceRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<FixtureReferenceCachePayload>;
    if (!parsed || typeof parsed.savedAt !== 'number' || !Array.isArray(parsed.rows)) return [];
    if ((Date.now() - parsed.savedAt) > STORAGE_TTL_MS) return [];
    return sanitizeRows(parsed.rows);
  } catch {
    return [];
  }
}

function writeStorageCache(rows: FixtureReferenceRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: FixtureReferenceCachePayload = {
      savedAt: Date.now(),
      rows,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota/json errors
  }
}

function refreshFromSupabaseInBackground(): void {
  if (refreshPromise) return;
  refreshPromise = fetchFromSupabase()
    .then(rows => {
      if (rows.length === 0) return;
      cachedRows = rows;
      writeStorageCache(rows);
    })
    .finally(() => {
      refreshPromise = null;
    });
}

export async function loadFixtureReferenceBase(): Promise<FixtureReferenceRow[]> {
  if (cachedRows) return cachedRows;
  if (inflightPromise) return inflightPromise;

  const storageRows = readStorageCache();
  if (storageRows.length > 0) {
    cachedRows = storageRows;
    refreshFromSupabaseInBackground();
    return storageRows;
  }

  inflightPromise = (async () => {
    // Fast path: local fallback 먼저 로드하고, Supabase는 백그라운드에서 최신화
    const fallbackRows = await fetchFromLocalFallback();
    cachedRows = fallbackRows;
    writeStorageCache(fallbackRows);
    refreshFromSupabaseInBackground();
    return fallbackRows;
  })();

  try {
    return await inflightPromise;
  } finally {
    inflightPromise = null;
  }
}

export function clearFixtureReferenceCache(): void {
  cachedRows = null;
  inflightPromise = null;
  refreshPromise = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
