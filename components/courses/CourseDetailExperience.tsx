import React, { useEffect, useMemo, useState } from 'react';
import { courseCatalogService } from '../../services/courseCatalogService';
import {
  DEFAULT_SEASONS_BY_SLUG,
  DEFAULT_TOPIC_BY_SLUG,
  getCourseDetailContent,
} from '../../data/courseCatalogContent';
import type { CourseSeasonRow, CourseTopicRow } from '../../types/courseCatalog';

interface CourseDetailExperienceProps {
  slug: string;
  onGoToCourseList: () => void;
  onGoToContact: () => void;
}

function formatDateLabel(value: string | null): string {
  if (!value) return '일정 조율 중';
  return new Date(value).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatSeasonWindow(season: CourseSeasonRow | null): string {
  if (!season) return '상시 문의';
  if (season.start_date && season.end_date) {
    return `${formatDateLabel(season.start_date)} - ${formatDateLabel(season.end_date)}`;
  }
  return formatDateLabel(season.start_date ?? season.end_date);
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return '문의';
  return `${price.toLocaleString('ko-KR')}원`;
}

function getSeasonTone(status: CourseSeasonRow['status']) {
  switch (status) {
    case 'open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'scheduled':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'closed':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

function getSeasonLabel(season: CourseSeasonRow): string {
  return season.season_label?.trim() || `${season.season_number}회차`;
}

function pickFeaturedSeason(seasons: CourseSeasonRow[]): CourseSeasonRow | null {
  return (
    seasons.find((season) => season.is_featured)
    ?? seasons.find((season) => season.status === 'open')
    ?? seasons.find((season) => season.status === 'scheduled')
    ?? seasons[0]
    ?? null
  );
}

const CourseDetailExperience: React.FC<CourseDetailExperienceProps> = ({
  slug,
  onGoToCourseList,
  onGoToContact,
}) => {
  const detail = getCourseDetailContent(slug);
  const fallbackTopic = DEFAULT_TOPIC_BY_SLUG[slug] ?? null;
  const fallbackSeasons = DEFAULT_SEASONS_BY_SLUG[slug] ?? [];

  const [topic, setTopic] = useState<CourseTopicRow | null>(fallbackTopic);
  const [seasons, setSeasons] = useState<CourseSeasonRow[]>(fallbackSeasons);
  const [isRemoteReady, setIsRemoteReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [remoteTopic, remoteSeasons] = await Promise.all([
          courseCatalogService.getPublicTopicBySlug(slug),
          courseCatalogService.listPublicSeasonsBySlug(slug),
        ]);

        if (cancelled) return;
        if (remoteTopic) setTopic(remoteTopic);
        if (remoteSeasons.length > 0) setSeasons(remoteSeasons);
      } catch (error) {
        console.warn('[CourseDetailExperience] public course load fallback:', error);
      } finally {
        if (!cancelled) setIsRemoteReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const featuredSeason = useMemo(() => pickFeaturedSeason(seasons), [seasons]);
  const headline = topic?.hero_headline || detail?.heroHeadline || fallbackTopic?.hero_headline || slug;
  const summary = topic?.hero_summary || detail?.heroSummary || fallbackTopic?.hero_summary || '';
  const title = topic?.title || detail?.title || fallbackTopic?.title || slug;
  const badge = topic?.hero_badge || detail?.heroBadge || fallbackTopic?.hero_badge || 'COURSE';
  const description = topic?.short_description || detail?.shortDescription || fallbackTopic?.short_description || '';
  const instructorName = topic?.instructor_name || detail?.instructorName || fallbackTopic?.instructor_name || 'DenJOY';
  const instructorRole = topic?.instructor_role || detail?.instructorRole || fallbackTopic?.instructor_role || 'Instructor';

  if (!detail && !fallbackTopic && !topic && !isRemoteReady) {
    return (
      <section className="py-32">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="card-premium p-12">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-5" />
            <h1 className="text-3xl font-black text-slate-900 mb-3">강의 정보를 불러오는 중입니다.</h1>
            <p className="text-slate-500 leading-relaxed">
              공개된 주제와 시즌을 확인하고 있습니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!detail && !fallbackTopic && !topic) {
    return (
      <section className="py-32">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="card-premium p-12">
            <p className="text-sm font-bold tracking-[0.3em] text-slate-400 mb-4">COURSE NOT READY</p>
            <h1 className="text-3xl font-black text-slate-900 mb-4">아직 공개되지 않은 강의입니다.</h1>
            <p className="text-slate-500 leading-relaxed mb-8">
              관리자 페이지에서 주제와 시즌을 공개하면 이 경로에 상세페이지가 연결됩니다.
            </p>
            <button onClick={onGoToCourseList} className="btn-primary">
              강의 목록으로 돌아가기
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="bg-[#f3f5fb]">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.24),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.14),transparent_28%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url(/noise.svg)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-18 md:pt-32 md:pb-24">
          <button
            type="button"
            onClick={onGoToCourseList}
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
            </svg>
            강의 목록으로
          </button>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-stretch">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7 md:p-10 backdrop-blur-sm shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="rounded-full bg-rose-500/85 px-3 py-1 text-[11px] font-black tracking-tight">
                  {featuredSeason?.status === 'open' ? '모집중 시즌' : '프리미엄 운영'}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-200">
                  {topic?.category || detail?.category || '실전 강의'}
                </span>
              </div>

              <p className="text-xs font-black tracking-[0.35em] text-slate-400 mb-4">{badge}</p>
              <h1 className="text-4xl md:text-6xl font-black leading-[1.08] tracking-tight whitespace-pre-line mb-5">
                {headline}
              </h1>
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl mb-6">
                {summary}
              </p>
              <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mb-10">
                {description}
              </p>

              <div className="grid gap-4 sm:grid-cols-3 mb-10">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-bold tracking-[0.24em] text-slate-500 mb-2">CURRENT SEASON</p>
                  <p className="text-2xl font-black">{featuredSeason ? getSeasonLabel(featuredSeason) : '오픈 예정'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-bold tracking-[0.24em] text-slate-500 mb-2">RUNNING WINDOW</p>
                  <p className="text-sm font-bold text-slate-100 leading-relaxed">{formatSeasonWindow(featuredSeason)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-bold tracking-[0.24em] text-slate-500 mb-2">FORMAT</p>
                  <p className="text-sm font-bold text-slate-100">{detail?.durationLabel || '시즌 운영형 클래스'}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-8 mb-10">
                <div>
                  <p className="text-xs font-bold tracking-[0.24em] text-slate-500 mb-1">정상가</p>
                  <p className="text-2xl font-semibold text-slate-500 line-through">
                    {formatPrice(featuredSeason?.original_price_krw)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold tracking-[0.24em] text-indigo-300 mb-1">현재 시즌가</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-black text-white">
                      {featuredSeason?.price_krw ? featuredSeason.price_krw.toLocaleString('ko-KR') : '문의'}
                    </span>
                    <span className="text-lg font-bold text-slate-300">
                      {featuredSeason?.price_krw ? '원' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onGoToContact}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-7 py-4 text-base font-black text-white transition-all hover:-translate-y-0.5 hover:bg-indigo-400 hover:shadow-[0_18px_40px_rgba(99,102,241,0.35)]"
                >
                  지금 수강 문의하기
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <a
                  href="#course-curriculum"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-7 py-4 text-base font-bold text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  커리큘럼 보기
                </a>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-7">
                <p className="text-xs font-black tracking-[0.3em] text-slate-500 mb-5">SEASON BOARD</p>
                <div className="space-y-3">
                  {seasons.slice(0, 3).map((season) => (
                    <div
                      key={season.id}
                      className="rounded-2xl border border-white/8 bg-slate-900/60 p-4 transition-transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-base font-black text-white">{getSeasonLabel(season)}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getSeasonTone(season.status)}`}>
                          {season.status === 'open'
                            ? '모집중'
                            : season.status === 'scheduled'
                              ? '오픈 예정'
                              : season.status === 'closed'
                                ? '마감'
                                : '초안'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{formatSeasonWindow(season)}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">시즌 금액</span>
                        <span className="font-black text-white">{formatPrice(season.price_krw)}</span>
                      </div>
                    </div>
                  ))}
                  {seasons.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                      시즌 데이터가 아직 없습니다. 관리자에서 회차를 추가하면 이 영역에 반영됩니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[#131b31] p-6 md:p-7">
                <p className="text-xs font-black tracking-[0.3em] text-slate-500 mb-5">FOR WHO</p>
                <div className="space-y-3">
                  {detail?.audience.map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[11px] font-black text-indigo-300">
                        •
                      </span>
                      <p className="text-sm leading-relaxed text-slate-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {detail?.valueCards.map((card) => (
              <article key={card.title} className={`rounded-[28px] border p-6 shadow-sm ${card.accent}`}>
                <p className="text-xs font-black tracking-[0.24em] mb-3">VALUE</p>
                <h2 className="text-xl font-black mb-3 text-slate-900">{card.title}</h2>
                <p className="text-sm leading-relaxed text-slate-700">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="course-curriculum" className="py-6 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-black tracking-[0.3em] text-slate-400 mb-3">CURRICULUM</p>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
              주제는 고정하고, 시즌은 민첩하게 운영합니다
            </h2>
            <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-3xl mx-auto mt-4">
              강의 본체는 흔들지 않고 회차별로 일정과 금액만 조정하는 구조를 전제로 설계했습니다.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {detail?.curriculum.map((item) => (
              <article key={item.step} className="rounded-[30px] bg-white border border-slate-200 p-6 md:p-7 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black tracking-[0.2em] text-white">
                    STEP {item.step}
                  </span>
                  <span className="text-xs font-bold tracking-[0.24em] text-slate-400">{title}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 mb-5">{item.body}</p>
                <div className="space-y-2.5">
                  {item.points.map((point) => (
                    <div key={point} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">
                        +
                      </span>
                      <span className="text-sm font-semibold text-slate-700">{point}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <article className="rounded-[34px] bg-slate-950 text-white p-7 md:p-8">
              <p className="text-xs font-black tracking-[0.3em] text-slate-500 mb-4">INSTRUCTOR</p>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white">
                  {instructorName.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-2xl font-black">{instructorName}</h3>
                  <p className="text-sm font-medium text-slate-300">{instructorRole}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-300 mb-6">
                병원이 실제로 쓰는 데이터를 기준으로 입력 흐름을 다시 설계하고, 현장에서 작동하는 운영 루틴까지 연결하는 방식으로 강의를 진행합니다.
              </p>
              <div className="grid gap-3">
                {detail?.outcomes.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <div className="grid gap-5 md:grid-cols-3">
              {detail?.reviews.map((review) => (
                <article key={review.quote} className="rounded-[30px] bg-white border border-slate-200 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span key={index} className="text-amber-400">★</span>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 mb-6">"{review.quote}"</p>
                  <div>
                    <p className="text-sm font-black text-slate-900">{review.author}</p>
                    <p className="text-xs font-medium text-slate-500">{review.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[36px] bg-white border border-slate-200 p-7 md:p-10 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col lg:flex-row gap-10 lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-black tracking-[0.3em] text-slate-400 mb-3">FAQ</p>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
                  시즌 운영 전제로 자주 받는 질문
                </h2>
                <p className="text-slate-500 leading-relaxed">
                  강의 자체는 주제 중심으로 고정하고, 시즌별로 일정과 금액, 모집 상태만 조정하는 구조를 기준으로 정리했습니다.
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                {!isRemoteReady && <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
                <span>{isRemoteReady ? '시즌 데이터 동기화 완료' : '시즌 데이터 확인 중'}</span>
              </div>
            </div>
            <div className="grid gap-4 mt-8">
              {detail?.faq.map((item) => (
                <article key={item.question} className="rounded-[24px] bg-slate-50 border border-slate-200 px-5 py-5">
                  <h3 className="text-base font-black text-slate-900 mb-2">{item.question}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[36px] bg-slate-950 text-white p-8 md:p-12 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <p className="text-xs font-black tracking-[0.3em] text-slate-500 mb-3">NEXT ACTION</p>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.08] mb-4">
                  {getSeasonLabel(featuredSeason ?? fallbackSeasons[0] ?? {
                    id: 'season-placeholder',
                    topic_id: '',
                    season_number: 1,
                    season_label: '다음 시즌',
                    start_date: null,
                    end_date: null,
                    price_krw: 0,
                    original_price_krw: null,
                    status: 'scheduled',
                    capacity: null,
                    is_featured: false,
                    created_at: '',
                    updated_at: '',
                  })} 오픈 전에
                  <br />
                  기준부터 먼저 맞춰 두세요
                </h2>
                <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl">
                  시즌 운영형 강의이기 때문에, 주제는 유지하고 회차만 갈아끼우는 구조로 계속 돌릴 수 있습니다. 지금 문의하시면 현재 회차 기준 안내를 바로 드립니다.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <p className="text-sm font-bold text-slate-400 mb-1">{title}</p>
                    <p className="text-2xl font-black text-white">{featuredSeason ? getSeasonLabel(featuredSeason) : '오픈 예정'}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getSeasonTone(featuredSeason?.status ?? 'scheduled')}`}>
                    {featuredSeason?.status === 'open' ? '모집중' : '시즌 준비중'}
                  </span>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">운영 일정</span>
                    <span className="font-bold text-slate-100">{formatSeasonWindow(featuredSeason)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">현재 시즌가</span>
                    <span className="font-black text-white">{formatPrice(featuredSeason?.price_krw)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">정상가</span>
                    <span className="font-semibold text-slate-400 line-through">{formatPrice(featuredSeason?.original_price_krw)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={onGoToContact}
                    className="rounded-2xl bg-indigo-500 px-5 py-4 text-base font-black text-white transition-all hover:bg-indigo-400"
                  >
                    시즌 문의하기
                  </button>
                  <button
                    type="button"
                    onClick={onGoToCourseList}
                    className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-4 text-base font-bold text-slate-200 transition-colors hover:bg-white/[0.08]"
                  >
                    다른 강의 보기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourseDetailExperience;
