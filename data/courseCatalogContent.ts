import type { CourseSeasonRow, CourseTopicRow } from '../types/courseCatalog';

export interface CourseDetailContent {
  slug: string;
  title: string;
  category: string;
  heroBadge: string;
  heroHeadline: string;
  heroSummary: string;
  shortDescription: string;
  instructorName: string;
  instructorRole: string;
  durationLabel: string;
  audience: string[];
  valueCards: Array<{ title: string; body: string; accent: string }>;
  curriculum: Array<{ step: string; title: string; body: string; points: string[] }>;
  outcomes: string[];
  reviews: Array<{ quote: string; author: string; role: string }>;
  faq: Array<{ question: string; answer: string }>;
}

export const DEFAULT_SEASONS_BY_SLUG: Record<string, CourseSeasonRow[]> = {
  'implant-inventory': [
    {
      id: 'fallback-season-4',
      topic_id: 'fallback-topic-implant-inventory',
      season_number: 4,
      season_label: '4기',
      start_date: '2026-05-12',
      end_date: '2026-06-02',
      price_krw: 99000,
      original_price_krw: 280000,
      status: 'open',
      capacity: 20,
      is_featured: true,
      created_at: '2026-04-04T00:00:00+09:00',
      updated_at: '2026-04-04T00:00:00+09:00',
    },
    {
      id: 'fallback-season-3',
      topic_id: 'fallback-topic-implant-inventory',
      season_number: 3,
      season_label: '3기',
      start_date: '2026-03-11',
      end_date: '2026-04-01',
      price_krw: 129000,
      original_price_krw: 280000,
      status: 'closed',
      capacity: 20,
      is_featured: false,
      created_at: '2026-04-04T00:00:00+09:00',
      updated_at: '2026-04-04T00:00:00+09:00',
    },
    {
      id: 'fallback-season-2',
      topic_id: 'fallback-topic-implant-inventory',
      season_number: 2,
      season_label: '2기',
      start_date: '2026-01-14',
      end_date: '2026-02-04',
      price_krw: 149000,
      original_price_krw: 280000,
      status: 'closed',
      capacity: 16,
      is_featured: false,
      created_at: '2026-04-04T00:00:00+09:00',
      updated_at: '2026-04-04T00:00:00+09:00',
    },
  ],
};

export const DEFAULT_TOPIC_BY_SLUG: Record<string, CourseTopicRow> = {
  'implant-inventory': {
    id: 'fallback-topic-implant-inventory',
    slug: 'implant-inventory',
    title: '덴트웹 임플란트 재고관리',
    category: '데이터 엔지니어링',
    short_description: '엑셀 정리 시간을 줄이고 덴트웹 입력 구조를 운영 데이터로 바꾸는 실전 강의입니다.',
    hero_badge: '프리미엄 클래스',
    hero_headline: '재고가 쌓여나는 건\n엑셀 탓이 아닙니다',
    hero_summary: '입력 구조부터 바꾸면 재고, 수술기록, 발주 판단이 같은 기준 위에서 움직이기 시작합니다.',
    instructor_name: '맹준호',
    instructor_role: 'DenJOY 데이터 전략 리드',
    is_published: true,
    sort_order: 1,
    created_at: '2026-04-04T00:00:00+09:00',
    updated_at: '2026-04-04T00:00:00+09:00',
  },
};

export const COURSE_DETAIL_CONTENT: Record<string, CourseDetailContent> = {
  'implant-inventory': {
    slug: 'implant-inventory',
    title: '덴트웹 임플란트 재고관리',
    category: '데이터 엔지니어링',
    heroBadge: 'PREMIUM CLASS',
    heroHeadline: '재고가 쌓여나는 건\n엑셀 탓이 아닙니다',
    heroSummary: '덴트웹에 이미 있는 데이터를 어떻게 입력하고 묶느냐에 따라 재고는 비용이 되기도 하고, 운영 지표가 되기도 합니다.',
    shortDescription: '덴트웹 입력 구조를 정리해서 수술기록, 재고, 발주 판단을 하나의 흐름으로 만드는 실전형 강의입니다.',
    instructorName: '맹준호',
    instructorRole: 'DenJOY 데이터 전략 리드',
    durationLabel: '4주 운영 · 주 1회 라이브',
    audience: [
      '덴트웹은 쓰고 있지만 재고 추적이 여전히 엑셀 중심인 병원',
      '실장과 스탭이 같은 데이터를 보는데 기준이 자꾸 달라지는 팀',
      '1회성 교육보다 실제 입력 구조와 운영 프로세스를 바꾸고 싶은 원장/실장',
    ],
    valueCards: [
      {
        title: '입력 기준 통일',
        body: '어디에 무엇을 입력해야 하는지 기준을 재설계해 중복 기록을 줄입니다.',
        accent: 'bg-rose-50 text-rose-700 border-rose-100',
      },
      {
        title: '수술-재고 연결',
        body: '수술기록이 재고 데이터와 자연스럽게 연결되도록 흐름을 정리합니다.',
        accent: 'bg-amber-50 text-amber-700 border-amber-100',
      },
      {
        title: '발주 판단 자동화',
        body: '실제 사용량과 누적 흐름을 기준으로 발주 타이밍을 읽는 습관을 만듭니다.',
        accent: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      },
      {
        title: '교육 시간 단축',
        body: '새로운 선생님이 들어와도 같은 방식으로 이해하도록 운영 언어를 표준화합니다.',
        accent: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      },
    ],
    curriculum: [
      {
        step: '01',
        title: '왜 덴트웹 데이터를 믿지 못하게 되는가',
        body: '현재 입력 흐름을 해부하면서 어디에서 데이터가 깨지고 있는지 먼저 찾습니다.',
        points: ['중복 입력이 생기는 순간', '품목명/규격 표기 흔들림', '엑셀 보정 습관의 원인'],
      },
      {
        step: '02',
        title: '입력 구조를 다시 짜는 기준',
        body: '실무자가 따라하기 쉬운 수준으로 입력 규칙, 책임 구간, 예외 처리를 다시 세웁니다.',
        points: ['입력 필드 우선순위', '담당자별 역할 분리', '예외 케이스 처리법'],
      },
      {
        step: '03',
        title: '수술기록과 재고 흐름 연결',
        body: '기록은 남는데 의사결정에는 안 쓰이는 문제를 끊고, 실제 운영 숫자로 연결합니다.',
        points: ['수술기록 분류 체계', '재고 사용량 읽기', '오류 탐지 체크포인트'],
      },
      {
        step: '04',
        title: '발주 기준과 팀 운영 루틴 만들기',
        body: '강의 후 바로 적용할 수 있게 병원 루틴과 체크리스트까지 맞춰 마무리합니다.',
        points: ['주간 점검 루틴', '발주 기준 세팅', '팀 공유 템플릿'],
      },
    ],
    outcomes: [
      '엑셀 없이도 재고 흐름을 이해할 수 있는 입력 기준을 확보합니다.',
      '누가 입력해도 같은 결과가 나오도록 실무 언어를 통일합니다.',
      '회차가 끝난 뒤에도 병원에서 바로 반복 적용할 수 있는 체크리스트를 가져갑니다.',
      '시즌별 운영으로 날짜와 금액만 조정해도 같은 주제를 계속 확장할 수 있는 구조를 갖춥니다.',
    ],
    reviews: [
      {
        quote: '엑셀을 잘하는 법이 아니라 덴트웹을 어떻게 설계해야 하는지 알게 됐습니다. 교육 이후 회의 언어가 달라졌어요.',
        author: '정○연',
        role: '치과 실장',
      },
      {
        quote: '재고가 왜 자꾸 맞지 않는지 처음으로 구조적으로 이해했습니다. 신입 교육 시간이 확 줄었습니다.',
        author: '김○호',
        role: '원장',
      },
      {
        quote: '수술기록을 남기는 목적이 분명해졌고, 발주 판단이 감이 아니라 숫자로 바뀌었습니다.',
        author: '박○정',
        role: '총괄실장',
      },
    ],
    faq: [
      {
        question: '덴트웹을 잘 모르는 스탭도 들을 수 있나요?',
        answer: '가능합니다. 다만 실제 적용은 원장/실장/핵심 스탭이 함께 같은 기준을 잡아야 효과가 큽니다.',
      },
      {
        question: '강의 후 바로 병원에 적용할 수 있나요?',
        answer: '시즌 운영형으로 구성해 각 회차 사이에 바로 적용해 보고 다음 회차에서 피드백을 받도록 설계했습니다.',
      },
      {
        question: '회차별 날짜와 가격만 달라지는 구조인가요?',
        answer: '현재는 같은 주제 안에서 시즌별 운영을 전제로 두고 있어, 핵심 커리큘럼은 유지하고 일정/금액/모집 상태만 조정합니다.',
      },
    ],
  },
};

export function getCourseDetailContent(slug: string): CourseDetailContent | null {
  return COURSE_DETAIL_CONTENT[slug] ?? null;
}
