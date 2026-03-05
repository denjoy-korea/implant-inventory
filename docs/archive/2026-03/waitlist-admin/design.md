# Design: waitlist-admin

## 수정 대상 파일
- `services/contactService.ts` — `getWaitlist()` 함수 추가
- `components/SystemAdminDashboard.tsx` — AdminTab 확장, state, 사이드바 버튼, 탭 콘텐츠

---

## 1. `services/contactService.ts` 수정

### 1-1. 플랜 레이블 상수 (파일 상단 exports에 추가)

```typescript
export const WAITLIST_PLAN_LABELS: Record<string, string> = {
  plan_waitlist_basic:    'Basic',
  plan_waitlist_plus:     'Plus',
  plan_waitlist_business: 'Business',
  plan_waitlist_ultimate: 'Ultimate',
};
```

### 1-2. `getWaitlist()` 함수

```typescript
/** 대기자 신청 목록 조회 (plan_waitlist_* 만) */
async getWaitlist(filter?: { plan?: string }): Promise<ContactInquiry[]> {
  let query = supabase
    .from('contact_inquiries')
    .select('*')
    .like('inquiry_type', 'plan_waitlist_%')
    .order('created_at', { ascending: false });

  if (filter?.plan) {
    query = query.eq('inquiry_type', `plan_waitlist_${filter.plan}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ContactInquiry[];
},
```

삽입 위치: `getAll()` 함수 바로 아래

---

## 2. `components/SystemAdminDashboard.tsx` 수정

### 2-1. AdminTab 타입 확장

```typescript
// 변경 전
type AdminTab = '...' | 'inquiries' | 'traffic';

// 변경 후
type AdminTab = '...' | 'inquiries' | 'waitlist' | 'traffic';
```

### 2-2. 대기자 state 추가 (기존 문의내역 state 아래에 삽입)

```typescript
// 대기자 관리 state
const [waitlist, setWaitlist] = useState<ContactInquiry[]>([]);
const [waitlistLoading, setWaitlistLoading] = useState(false);
const [waitlistFilter, setWaitlistFilter] = useState<string>('');      // '' = 전체
const [waitlistStatusUpdating, setWaitlistStatusUpdating] = useState<string | null>(null);
```

### 2-3. `handleTabChange()` 에 waitlist 로드 추가

```typescript
// 기존 inquiries 블록 바로 아래에 삽입
if (tab === 'waitlist' && waitlist.length === 0) {
  setWaitlistLoading(true);
  contactService.getWaitlist()
    .then(setWaitlist)
    .catch(() => showToast('대기자 목록을 불러오지 못했습니다.', 'error'))
    .finally(() => setWaitlistLoading(false));
}
```

### 2-4. 상태 변경 핸들러 추가

```typescript
const handleWaitlistStatusChange = async (id: string, status: InquiryStatus) => {
  setWaitlistStatusUpdating(id);
  try {
    await contactService.updateStatus(id, status);
    setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status } : w));
  } catch {
    showToast('상태 변경에 실패했습니다.', 'error');
  } finally {
    setWaitlistStatusUpdating(null);
  }
};
```

### 2-5. 사이드바 버튼 추가

삽입 위치: `inquiries` 버튼 바로 아래

```tsx
<button onClick={() => handleTabChange('waitlist')}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${
      activeTab === 'waitlist'
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}>
  {/* 큐/대기 아이콘 */}
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
  <span>대기자 관리</span>
  {waitlist.filter(w => w.status === 'pending').length > 0 && (
    <span className="ml-auto bg-rose-100 text-rose-700 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shrink-0">
      {waitlist.filter(w => w.status === 'pending').length}
    </span>
  )}
</button>
```

### 2-6. 탭 콘텐츠 — 대기자 관리 뷰

삽입 위치: `activeTab === 'inquiries'` 블록 바로 아래

#### 상수 (컴포넌트 외부 or 내부)

```typescript
const PLAN_FILTER_OPTIONS = [
  { value: '',         label: '전체' },
  { value: 'basic',    label: 'Basic' },
  { value: 'plus',     label: 'Plus' },
  { value: 'business', label: 'Business' },
  { value: 'ultimate', label: 'Ultimate' },
];

const WAITLIST_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending:     '대기 중',
  in_progress: '연락 완료',
  resolved:    '가입 완료',
};

const WAITLIST_STATUS_COLORS: Record<InquiryStatus, string> = {
  pending:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-emerald-100 text-emerald-700',
};
```

#### 요약 카드 (플랜별 pending 카운트)

```tsx
{/* 플랜별 요약 카드 */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
  {(['basic', 'plus', 'business', 'ultimate'] as const).map(plan => {
    const count = waitlist.filter(
      w => w.inquiry_type === `plan_waitlist_${plan}` && w.status === 'pending'
    ).length;
    return (
      <button
        key={plan}
        onClick={() => setWaitlistFilter(waitlistFilter === plan ? '' : plan)}
        className={`rounded-xl p-4 text-left border-2 transition-all ${
          waitlistFilter === plan
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-200 bg-white hover:border-indigo-200'
        }`}
      >
        <p className="text-xs font-bold text-slate-400 uppercase mb-1">
          {WAITLIST_PLAN_LABELS[`plan_waitlist_${plan}`]}
        </p>
        <p className="text-2xl font-black text-slate-800">{count}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">대기 중</p>
      </button>
    );
  })}
</div>
```

#### 필터 탭 바

```tsx
<div className="flex gap-1.5 flex-wrap mb-4">
  {PLAN_FILTER_OPTIONS.map(opt => (
    <button
      key={opt.value}
      onClick={() => setWaitlistFilter(opt.value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
        waitlistFilter === opt.value
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      {opt.label}
      {opt.value && (
        <span className="ml-1 text-[10px] opacity-70">
          {waitlist.filter(w => w.inquiry_type === `plan_waitlist_${opt.value}`).length}
        </span>
      )}
    </button>
  ))}
</div>
```

#### 목록 테이블

```tsx
<div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
  <table className="w-full text-sm">
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">접수일시</th>
        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">플랜</th>
        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">이름</th>
        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">이메일</th>
        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">상태</th>
        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">변경</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {filteredWaitlist.map(w => (
        <tr key={w.id} className="hover:bg-slate-50 transition-colors">
          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
            {new Date(w.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </td>
          <td className="px-4 py-3">
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
              {WAITLIST_PLAN_LABELS[w.inquiry_type] ?? w.inquiry_type}
            </span>
          </td>
          <td className="px-4 py-3 text-slate-800 font-medium">{w.contact_name || '—'}</td>
          <td className="px-4 py-3 text-slate-600 text-xs">{w.email}</td>
          <td className="px-4 py-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${WAITLIST_STATUS_COLORS[w.status]}`}>
              {WAITLIST_STATUS_LABELS[w.status]}
            </span>
          </td>
          <td className="px-4 py-3">
            <select
              disabled={waitlistStatusUpdating === w.id}
              value={w.status}
              onChange={e => handleWaitlistStatusChange(w.id, e.target.value as InquiryStatus)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 disabled:opacity-50 focus:outline-none focus:border-indigo-400"
            >
              <option value="pending">대기 중</option>
              <option value="in_progress">연락 완료</option>
              <option value="resolved">가입 완료</option>
            </select>
          </td>
        </tr>
      ))}
      {filteredWaitlist.length === 0 && (
        <tr>
          <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
            {waitlistFilter ? `${PLAN_FILTER_OPTIONS.find(o => o.value === waitlistFilter)?.label} 플랜 대기자가 없습니다.` : '대기자 신청이 없습니다.'}
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
```

#### filteredWaitlist 파생 변수

```typescript
const filteredWaitlist = waitlistFilter
  ? waitlist.filter(w => w.inquiry_type === `plan_waitlist_${waitlistFilter}`)
  : waitlist;
```

이 변수는 탭 콘텐츠 JSX 바로 위 또는 컴포넌트 내 useMemo 없이 단순 선언으로 사용.

#### 전체 탭 래퍼 구조

```tsx
{activeTab === 'waitlist' && (
  <div className="p-6">
    {/* 헤더 */}
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">대기자 관리</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          플랜 대기 신청자를 관리합니다. 총 {waitlist.length}명
        </p>
      </div>
      <button
        onClick={() => {
          setWaitlistLoading(true);
          contactService.getWaitlist()
            .then(setWaitlist)
            .catch(() => showToast('불러오기 실패', 'error'))
            .finally(() => setWaitlistLoading(false));
        }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        새로고침
      </button>
    </div>

    {waitlistLoading ? (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    ) : (
      <>
        {/* 플랜별 요약 카드 */}
        {/* 필터 탭 바 */}
        {/* 목록 테이블 */}
      </>
    )}
  </div>
)}
```

---

## 3. import 추가

`SystemAdminDashboard.tsx` 상단에서 `WAITLIST_PLAN_LABELS` import:

```typescript
import { contactService, ContactInquiry, InquiryStatus, WAITLIST_PLAN_LABELS } from '../services/contactService';
```

---

## 4. 구현 순서

1. `contactService.ts` — `WAITLIST_PLAN_LABELS` 상수 + `getWaitlist()` 함수 추가
2. `SystemAdminDashboard.tsx`
   - AdminTab 타입에 `'waitlist'` 추가
   - state 4개 추가
   - `handleTabChange()` 에 waitlist 로드 추가
   - `handleWaitlistStatusChange()` 핸들러 추가
   - `filteredWaitlist` 파생 변수 선언
   - 사이드바 버튼 추가 (inquiries 아래)
   - 탭 콘텐츠 JSX 추가 (inquiries 블록 아래)
3. `npm run build` 검증

---

## 5. 검증 기준

- [ ] `npm run build` 타입 에러 없음
- [ ] 사이드바 "대기자 관리" 버튼 표시 + pending 카운트 배지
- [ ] 탭 진입 시 `plan_waitlist_%` 데이터만 표시 (일반 문의 제외)
- [ ] 플랜별 요약 카드 클릭 → 해당 필터 적용
- [ ] 필터 탭 클릭 → 목록 즉시 갱신
- [ ] 상태 드롭다운 변경 → DB 업데이트 + 목록 즉시 반영
- [ ] 빈 목록일 때 안내 문구 표시
