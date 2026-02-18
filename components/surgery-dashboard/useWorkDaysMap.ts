import { useState, useEffect } from 'react';
import { holidayService } from '../../services/holidayService';

/**
 * 월별 실제 진료일수 맵을 비동기로 계산하는 hook
 *
 * @param months     'YYYY-MM' 형식 배열 (useSurgeryStats의 monthlyData.map(d => d.month))
 * @param clinicDays 진료 요일 배열 [0=일, 1=월, ..., 6=토]
 * @returns          Record<'YYYY-MM', 진료일수> | undefined (로딩 중)
 *
 * - undefined: 아직 계산 중 → 상위에서 기본값 25 사용
 * - Record<...>: 계산 완료 → 실제 진료일수 사용
 */
export function useWorkDaysMap(
  months: string[],
  clinicDays: number[]
): Record<string, number> | undefined {
  const [workDaysMap, setWorkDaysMap] = useState<Record<string, number> | undefined>(undefined);

  // months/clinicDays 배열을 문자열로 직렬화해 의존성 안정화
  const monthsKey = months.join(',');
  const clinicDaysKey = clinicDays.slice().sort((a, b) => a - b).join(',');

  useEffect(() => {
    if (months.length === 0 || clinicDays.length === 0) {
      setWorkDaysMap({});
      return;
    }

    let cancelled = false;

    holidayService
      .calcWorkDaysForMonths(months, clinicDays)
      .then(map => {
        if (!cancelled) setWorkDaysMap(map);
      })
      .catch(err => {
        console.warn('[useWorkDaysMap] 진료일수 계산 실패, 기본값 사용:', err);
        if (!cancelled) setWorkDaysMap(undefined); // 실패 시 상위에서 25일 폴백
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsKey, clinicDaysKey]);

  return workDaysMap;
}
