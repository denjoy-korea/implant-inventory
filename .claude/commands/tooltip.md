# 커스텀 툴팁 구현 가이드

UI 요소에 설명글(툴팁)을 달 때 사용하는 패턴입니다.

## ❌ 사용하지 말 것: HTML `title` 속성

```tsx
<p title="설명 내용">텍스트</p>
```

**이유**: 브라우저가 딜레이(500~1000ms)를 제어하므로 사용자 경험이 나쁩니다.

## ✅ 사용할 것: Tailwind CSS `group-hover` 커스텀 툴팁

```tsx
<div className="relative group/UNIQUE_NAME">
  {/* 툴팁을 띄울 트리거 요소 */}
  <p className="cursor-help underline decoration-dashed decoration-slate-300 underline-offset-2">
    라벨 텍스트 ⓘ
  </p>

  {/* 툴팁 본체: 마우스 올리면 즉시 표시 (아래 방향 기본값) */}
  <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/UNIQUE_NAME:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
    <p>첫 번째 설명 줄</p>
    <p className="mt-1">두 번째 설명 줄</p>
    <p className="mt-1 text-slate-400">보조 설명 (흐린 색)</p>
  </div>
</div>
```

## 위치 규칙

**기본값: 아래 방향** (`top-full` + `mt-2`)
- 화면 상단 근처 요소 → 아래로 열어야 잘림 없음

| 방향 | 클래스 |
|------|--------|
| 아래 (기본) | `top-full right-0 mt-2` |
| 위 | `bottom-full right-0 mb-2` |
| 왼쪽 정렬 | `top-full left-0 mt-2` |

> ⚠️ **위치 선택 기준**: 트리거 요소가 화면 상단에 있으면 `top-full`(아래), 하단에 있으면 `bottom-full`(위) 사용.

## 공통 규칙

- `group/UNIQUE_NAME`과 `group-hover/UNIQUE_NAME:` 은 반드시 동일한 고유 이름 사용 (다른 group과 충돌 방지)
- `duration-75`: 75ms 페이드인 → 사실상 즉시 표시
- `pointer-events-none`: 툴팁 자체에 마우스 이벤트 없음 (hover 유지)
- `z-50`: 다른 요소 위에 표시

## 트리거 스타일 (상황에 따라 선택)

| 상황 | 클래스 |
|------|--------|
| 점선 밑줄 + 물음표 커서 | `cursor-help underline decoration-dashed decoration-slate-300 underline-offset-2` |
| 아이콘만 | `cursor-help` (트리거에 `ⓘ` 또는 `?` 아이콘) |
| 버튼/배지 | `cursor-help` |
