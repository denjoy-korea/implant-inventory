/**
 * holidayService — 대한민국 공휴일 조회 + 월별 진료일수 산출
 *
 * 데이터 소스: 공공데이터포털 한국천문연구원 특일 정보 API
 * - API 키: Edge Function(holiday-proxy) 서버 시크릿으로만 관리 (클라이언트 미노출)
 * - 캐싱: localStorage (당해 연도 30일 TTL, 과거 연도 영구)
 * - 호출 경로: Edge Function 프록시 전용 (직접 호출 제거 — SEC-H1)
 * - 최종 폴백: API 실패 시 고정 공휴일 상수로 대체
 */

const CACHE_PREFIX = 'holiday_kr_';
const CACHE_VERSION = 'v1';

/**
 * Edge Function 프록시 URL
 * CORS 차단 시 서버사이드 프록시로 폴백 (verify_jwt: false 배포)
 */
const EDGE_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/holiday-proxy`;

/** 고정 공휴일 (음력 기반 명절 제외) — API 장애 시 폴백용 */
const FIXED_HOLIDAYS_MMDD: Record<string, string> = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '크리스마스',
};

interface HolidayCacheEntry {
  version: string;
  year: number;
  dates: string[];     // YYYY-MM-DD 배열
  fetchedAt: string;   // ISO 타임스탬프
}

export const holidayService = {
  /**
   * 연도별 공휴일 날짜 목록 반환 (YYYY-MM-DD 배열)
   * 캐시 → API → 고정 공휴일 순으로 폴백
   */
  async getHolidays(year: number): Promise<string[]> {
    const cacheKey = `${CACHE_PREFIX}${year}`;

    // 1. localStorage 캐시 확인
    const cached = this._readCache(cacheKey, year);
    if (cached) return cached;

    // 2. 공공데이터포털 API 호출
    try {
      const dates = await this._fetchFromApi(year);
      this._writeCache(cacheKey, year, dates);
      return dates;
    } catch (err) {
      console.warn(`[holidayService] API 호출 실패 (${year}년), 고정 공휴일로 대체:`, err);
    }

    // 3. 폴백: 고정 공휴일만 반환 (설·추석 등 음력 명절은 포함 안 됨)
    const fallback = this._getFixedHolidays(year);
    this._writeCache(cacheKey, year, fallback);
    return fallback;
  },

  /**
   * 특정 월의 실제 진료일수 계산
   * @param year       연도
   * @param month      월 (1-12)
   * @param clinicDays 진료 요일 배열 [0=일, 1=월, ..., 6=토]
   */
  async calcWorkDays(
    year: number,
    month: number,
    clinicDays: number[]
  ): Promise<{ workDays: number; excludedHolidays: string[] }> {
    const holidays = await this.getHolidays(year);
    const holidaySet = new Set(holidays);

    let workDays = 0;
    const excludedHolidays: string[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dow = date.getDay(); // 0=일, 1=월, ..., 6=토
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (!clinicDays.includes(dow)) continue;   // 진료 요일 아님
      if (holidaySet.has(dateStr)) {
        excludedHolidays.push(dateStr);
        continue;                                  // 공휴일 제외
      }
      workDays++;
    }

    return { workDays, excludedHolidays };
  },

  /**
   * 여러 달의 진료일수 맵을 한 번에 계산
   * @param months     'YYYY-MM' 배열
   * @param clinicDays 진료 요일 배열
   * @returns          Record<'YYYY-MM', 진료일수>
   */
  async calcWorkDaysForMonths(
    months: string[],
    clinicDays: number[]
  ): Promise<Record<string, number>> {
    if (months.length === 0 || clinicDays.length === 0) return {};

    // 연도별 공휴일 병렬 프리페치
    const uniqueYears = [...new Set(months.map(m => parseInt(m.slice(0, 4), 10)))];
    await Promise.all(uniqueYears.map(y => this.getHolidays(y)));

    const result: Record<string, number> = {};
    for (const m of months) {
      const year = parseInt(m.slice(0, 4), 10);
      const month = parseInt(m.slice(5, 7), 10);
      const { workDays } = await this.calcWorkDays(year, month, clinicDays);
      result[m] = workDays;
    }
    return result;
  },

  // ── Private ───────────────────────────────────────────────

  _readCache(key: string, year: number): string[] | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const entry: HolidayCacheEntry = JSON.parse(raw);
      if (entry.version !== CACHE_VERSION) return null;

      // 당해 연도: 30일 TTL / 과거 연도: 영구 캐시
      const isCurrentYear = year === new Date().getFullYear();
      if (isCurrentYear) {
        const ageMs = Date.now() - new Date(entry.fetchedAt).getTime();
        if (ageMs > 30 * 24 * 60 * 60 * 1000) return null;
      }
      return entry.dates;
    } catch {
      return null;
    }
  },

  _writeCache(key: string, year: number, dates: string[]): void {
    try {
      const entry: HolidayCacheEntry = {
        version: CACHE_VERSION,
        year,
        dates,
        fetchedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // localStorage 용량 초과 등 무시
    }
  },

  /**
   * Edge Function 프록시를 통해 공휴일 데이터 조회 (SEC-H1: 클라이언트 API 키 노출 제거)
   * - API 키는 Edge Function 서버 시크릿으로만 관리
   * - 폴백: Edge Function 실패 시 getHolidays()에서 고정 공휴일로 처리
   */
  async _fetchFromApi(year: number): Promise<string[]> {
    try {
      const res = await fetch(`${EDGE_PROXY_URL}?year=${year}`);
      if (!res.ok) throw new Error(`Edge proxy HTTP ${res.status}`);
      const json = await res.json();
      if (json?.error) throw new Error(`Edge proxy error: ${json.error}`);
      if (Array.isArray(json?.dates)) {
        return json.dates as string[];
      }
      throw new Error('Edge proxy returned unexpected shape');
    } catch (proxyErr) {
      console.warn(`[holidayService] Edge proxy 호출 실패 (${year}년):`, proxyErr);
      throw proxyErr;
    }
  },

  _getFixedHolidays(year: number): string[] {
    return Object.keys(FIXED_HOLIDAYS_MMDD).map(mmdd => `${year}-${mmdd}`);
  },
};
