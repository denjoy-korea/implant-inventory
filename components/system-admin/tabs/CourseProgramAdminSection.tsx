import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmModal from '../../ConfirmModal';
import { useToast } from '../../../hooks/useToast';
import { courseCatalogService } from '../../../services/courseCatalogService';
import type {
  CourseSeasonForm,
  CourseSeasonRow,
  CourseTopicForm,
  CourseTopicRow,
} from '../../../types/courseCatalog';

const EMPTY_TOPIC_FORM: CourseTopicForm = {
  slug: '',
  title: '',
  category: '',
  short_description: '',
  hero_badge: '',
  hero_headline: '',
  hero_summary: '',
  instructor_name: '',
  instructor_role: '',
  is_published: true,
  sort_order: '0',
};

const EMPTY_SEASON_FORM: CourseSeasonForm = {
  season_number: '1',
  season_label: '',
  start_date: '',
  end_date: '',
  price_krw: '0',
  original_price_krw: '',
  status: 'scheduled',
  capacity: '',
  is_featured: false,
};

function getCourseCatalogErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';

  if (code === 'PGRST205' || code === '42P01') {
    return '강의 카탈로그 테이블이 아직 DB에 없습니다. `supabase/migrations/20260404133000_create_course_topics_and_seasons.sql` 을 적용해야 합니다.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '강의 카탈로그를 불러오지 못했습니다.';
}

type PendingDelete =
  | { type: 'topic'; row: CourseTopicRow }
  | { type: 'season'; row: CourseSeasonRow };

function topicToForm(row: CourseTopicRow): CourseTopicForm {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category ?? '',
    short_description: row.short_description ?? '',
    hero_badge: row.hero_badge ?? '',
    hero_headline: row.hero_headline ?? '',
    hero_summary: row.hero_summary ?? '',
    instructor_name: row.instructor_name ?? '',
    instructor_role: row.instructor_role ?? '',
    is_published: row.is_published,
    sort_order: String(row.sort_order),
  };
}

function seasonToForm(row: CourseSeasonRow): CourseSeasonForm {
  return {
    season_number: String(row.season_number),
    season_label: row.season_label ?? '',
    start_date: row.start_date ?? '',
    end_date: row.end_date ?? '',
    price_krw: String(row.price_krw),
    original_price_krw: row.original_price_krw ? String(row.original_price_krw) : '',
    status: row.status,
    capacity: row.capacity ? String(row.capacity) : '',
    is_featured: row.is_featured,
  };
}

function formatDateRange(start: string | null, end: string | null): string {
  const toLabel = (value: string | null) => (
    value
      ? new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
      : '미정'
  );
  if (!start && !end) return '일정 미정';
  return `${toLabel(start)} - ${toLabel(end)}`;
}

function formatMoney(value: number | null): string {
  if (!value) return '미정';
  return `${value.toLocaleString('ko-KR')}원`;
}

function getSeasonStatusTone(status: CourseSeasonRow['status']) {
  switch (status) {
    case 'open':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'scheduled':
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    case 'closed':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

const CourseProgramAdminSection: React.FC = () => {
  const { showToast } = useToast();
  const [topics, setTopics] = useState<CourseTopicRow[]>([]);
  const [seasons, setSeasons] = useState<CourseSeasonRow[]>([]);
  const [topicLoading, setTopicLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [topicSaving, setTopicSaving] = useState(false);
  const [seasonSaving, setSeasonSaving] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<CourseTopicRow | null>(null);
  const [editingSeason, setEditingSeason] = useState<CourseSeasonRow | null>(null);
  const [topicForm, setTopicForm] = useState<CourseTopicForm>(EMPTY_TOPIC_FORM);
  const [seasonForm, setSeasonForm] = useState<CourseSeasonForm>(EMPTY_SEASON_FORM);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    setTopicLoading(true);
    try {
      const rows = await courseCatalogService.listAdminTopics();
      setCatalogError(null);
      setTopics(rows);
      setSelectedTopicId((prev) => {
        if (prev && rows.some((row) => row.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (error) {
      console.error('[CourseProgramAdminSection] loadTopics failed:', error);
      const message = getCourseCatalogErrorMessage(error);
      setCatalogError(message);
      showToast(message, 'error');
    } finally {
      setTopicLoading(false);
    }
  }, [showToast]);

  const loadSeasons = useCallback(async (topicId: string | null) => {
    if (!topicId) {
      setSeasons([]);
      return;
    }

    setSeasonLoading(true);
    try {
      const rows = await courseCatalogService.listAdminSeasons(topicId);
      setCatalogError(null);
      setSeasons(rows);
    } catch (error) {
      console.error('[CourseProgramAdminSection] loadSeasons failed:', error);
      const message = getCourseCatalogErrorMessage(error);
      setCatalogError(message);
      showToast(message, 'error');
    } finally {
      setSeasonLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    void loadSeasons(selectedTopicId);
  }, [loadSeasons, selectedTopicId]);

  const selectedTopic = useMemo(
    () => topics.find((row) => row.id === selectedTopicId) ?? null,
    [selectedTopicId, topics],
  );

  const openTopicCreate = () => {
    setEditingTopic(null);
    setTopicForm(EMPTY_TOPIC_FORM);
  };

  const openTopicEdit = (row: CourseTopicRow) => {
    setEditingTopic(row);
    setTopicForm(topicToForm(row));
    setSelectedTopicId(row.id);
  };

  const openSeasonCreate = () => {
    setEditingSeason(null);
    setSeasonForm({
      ...EMPTY_SEASON_FORM,
      season_number: String((seasons[0]?.season_number ?? 0) + 1),
    });
  };

  const openSeasonEdit = (row: CourseSeasonRow) => {
    setEditingSeason(row);
    setSeasonForm(seasonToForm(row));
  };

  const saveTopic = async () => {
    if (!topicForm.slug.trim() || !topicForm.title.trim()) {
      showToast('슬러그와 주제명은 필수입니다.', 'error');
      return;
    }

    setTopicSaving(true);
    try {
      if (editingTopic) {
        await courseCatalogService.updateTopic(editingTopic.id, topicForm);
        showToast('강의 주제가 수정되었습니다.', 'success');
      } else {
        await courseCatalogService.createTopic(topicForm);
        showToast('강의 주제가 추가되었습니다.', 'success');
      }

      openTopicCreate();
      await loadTopics();
    } catch (error) {
      console.error('[CourseProgramAdminSection] saveTopic failed:', error);
      showToast('강의 주제 저장에 실패했습니다.', 'error');
    } finally {
      setTopicSaving(false);
    }
  };

  const saveSeason = async () => {
    if (!selectedTopicId) {
      showToast('먼저 강의 주제를 선택하세요.', 'error');
      return;
    }
    if (!seasonForm.season_number.trim()) {
      showToast('회차 번호를 입력하세요.', 'error');
      return;
    }

    setSeasonSaving(true);
    try {
      if (editingSeason) {
        await courseCatalogService.updateSeason(editingSeason.id, seasonForm);
        showToast('회차 정보가 수정되었습니다.', 'success');
      } else {
        await courseCatalogService.createSeason(selectedTopicId, seasonForm);
        showToast('회차가 추가되었습니다.', 'success');
      }

      openSeasonCreate();
      await loadSeasons(selectedTopicId);
    } catch (error) {
      console.error('[CourseProgramAdminSection] saveSeason failed:', error);
      showToast('회차 저장에 실패했습니다.', 'error');
    } finally {
      setSeasonSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      if (pendingDelete.type === 'topic') {
        await courseCatalogService.deleteTopic(pendingDelete.row.id);
        showToast('강의 주제가 삭제되었습니다.', 'success');
        if (editingTopic?.id === pendingDelete.row.id) {
          openTopicCreate();
        }
        await loadTopics();
      } else {
        await courseCatalogService.deleteSeason(pendingDelete.row.id);
        showToast('회차가 삭제되었습니다.', 'success');
        if (editingSeason?.id === pendingDelete.row.id) {
          openSeasonCreate();
        }
        await loadSeasons(selectedTopicId);
      }
    } catch (error) {
      console.error('[CourseProgramAdminSection] delete failed:', error);
      showToast('삭제에 실패했습니다.', 'error');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      {catalogError && (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v4m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.65 18h16.7a1 1 0 00.86-1.5l-7.5-13a1 1 0 00-1.72 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-amber-900 mb-1">강의 카탈로그 DB가 아직 준비되지 않았습니다.</p>
              <p className="text-sm leading-relaxed text-amber-800">{catalogError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[32px] border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.3em] text-slate-400 mb-2">COURSE PROGRAM</p>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">강의 주제 + 시즌 운영 관리</h2>
            <p className="text-sm text-slate-500 leading-relaxed mt-3 max-w-3xl">
              이제 강의는 단일 상품이 아니라 주제(topic)와 회차(season)로 분리합니다. 주제는 상세페이지의 본체가 되고,
              시즌은 날짜와 금액, 모집 상태만 바꿔 1회차, 2회차, 3회차처럼 반복 운영합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 min-w-[280px]">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-black tracking-[0.24em] text-slate-400 mb-1">TOPICS</p>
              <p className="text-2xl font-black text-slate-900">{topics.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-black tracking-[0.24em] text-slate-400 mb-1">SEASONS</p>
              <p className="text-2xl font-black text-slate-900">{seasons.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-black tracking-[0.24em] text-slate-400 mb-1">PUBLIC</p>
              <p className="text-2xl font-black text-slate-900">{topics.filter((row) => row.is_published).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-black tracking-[0.28em] text-slate-400 mb-2">TOPIC EDITOR</p>
                <h3 className="text-xl font-black text-slate-900">
                  {editingTopic ? '강의 주제 수정' : '새 강의 주제 추가'}
                </h3>
              </div>
              <button
                type="button"
                onClick={openTopicCreate}
                className="rounded-2xl bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-200"
              >
                새로 작성
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">슬러그 *</label>
                  <input
                    type="text"
                    value={topicForm.slug}
                    onChange={(event) => setTopicForm((prev) => ({ ...prev, slug: event.target.value.trim().toLowerCase() }))}
                    placeholder="implant-inventory"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">주제명 *</label>
                  <input
                    type="text"
                    value={topicForm.title}
                    onChange={(event) => setTopicForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">카테고리</label>
                  <input
                    type="text"
                    value={topicForm.category}
                    onChange={(event) => setTopicForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">정렬 순서</label>
                  <input
                    type="number"
                    value={topicForm.sort_order}
                    onChange={(event) => setTopicForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-black text-slate-400">짧은 설명</label>
                <textarea
                  value={topicForm.short_description}
                  onChange={(event) => setTopicForm((prev) => ({ ...prev, short_description: event.target.value }))}
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">히어로 배지</label>
                  <input
                    type="text"
                    value={topicForm.hero_badge}
                    onChange={(event) => setTopicForm((prev) => ({ ...prev, hero_badge: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    id="course-topic-published"
                    type="checkbox"
                    checked={topicForm.is_published}
                    onChange={(event) => setTopicForm((prev) => ({ ...prev, is_published: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <label htmlFor="course-topic-published" className="text-sm font-bold text-slate-700">
                    공개 상태로 운영
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-black text-slate-400">히어로 헤드라인</label>
                <textarea
                  value={topicForm.hero_headline}
                  onChange={(event) => setTopicForm((prev) => ({ ...prev, hero_headline: event.target.value }))}
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-black text-slate-400">히어로 설명</label>
                <textarea
                  value={topicForm.hero_summary}
                  onChange={(event) => setTopicForm((prev) => ({ ...prev, hero_summary: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">강사명</label>
                  <input
                    type="text"
                    value={topicForm.instructor_name}
                    onChange={(event) => setTopicForm((prev) => ({ ...prev, instructor_name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">강사 역할</label>
                  <input
                    type="text"
                    value={topicForm.instructor_role}
                    onChange={(event) => setTopicForm((prev) => ({ ...prev, instructor_role: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => void saveTopic()}
                disabled={topicSaving}
                className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {topicSaving ? '저장 중...' : editingTopic ? '주제 수정 저장' : '주제 추가'}
              </button>
              {editingTopic && (
                <button
                  type="button"
                  onClick={openTopicCreate}
                  className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-200"
                >
                  취소
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-black tracking-[0.28em] text-slate-400 mb-2">TOPIC LIST</p>
                <h3 className="text-xl font-black text-slate-900">강의 주제 목록</h3>
              </div>
              <button
                type="button"
                onClick={() => void loadTopics()}
                className="rounded-2xl bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-200"
              >
                새로고침
              </button>
            </div>

            {topicLoading ? (
              <div className="py-12 text-center text-sm text-slate-400">주제 목록을 불러오는 중...</div>
            ) : topics.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">아직 등록된 강의 주제가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {topics.map((row) => {
                  const isSelected = row.id === selectedTopicId;
                  return (
                    <div
                      key={row.id}
                      className={`rounded-[24px] border p-4 transition-all ${isSelected ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setSelectedTopicId(row.id)}
                          className="text-left flex-1"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${row.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                              {row.is_published ? '공개' : '비공개'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">/{row.slug}</span>
                          </div>
                          <h4 className="text-base font-black text-slate-900 mb-1">{row.title}</h4>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {row.short_description || row.hero_summary || '설명 없음'}
                          </p>
                        </button>
                        <div className="flex gap-2 shrink-0">
                          <a
                            href={`/courses/${row.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-white px-3 py-2 text-[11px] font-black text-slate-600 border border-slate-200 hover:border-indigo-200 hover:text-indigo-700"
                          >
                            미리보기
                          </a>
                          <button
                            type="button"
                            onClick={() => openTopicEdit(row)}
                            className="rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-black text-indigo-700 hover:bg-indigo-100"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete({ type: 'topic', row })}
                            className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700 hover:bg-rose-100"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-black tracking-[0.28em] text-slate-400 mb-2">SEASON EDITOR</p>
                <h3 className="text-xl font-black text-slate-900">
                  {editingSeason ? '회차 수정' : '새 회차 추가'}
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  {selectedTopic ? `${selectedTopic.title} / ${selectedTopic.slug}` : '먼저 왼쪽에서 강의 주제를 선택하세요.'}
                </p>
              </div>
              <button
                type="button"
                onClick={openSeasonCreate}
                className="rounded-2xl bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-200"
              >
                새 회차
              </button>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">회차 번호 *</label>
                  <input
                    type="number"
                    value={seasonForm.season_number}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, season_number: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">회차 라벨</label>
                  <input
                    type="text"
                    value={seasonForm.season_label}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, season_label: event.target.value }))}
                    placeholder="비우면 1회차 형식으로 노출"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">시작일</label>
                  <input
                    type="date"
                    value={seasonForm.start_date}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, start_date: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">종료일</label>
                  <input
                    type="date"
                    value={seasonForm.end_date}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, end_date: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">시즌가</label>
                  <input
                    type="number"
                    value={seasonForm.price_krw}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, price_krw: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">정상가</label>
                  <input
                    type="number"
                    value={seasonForm.original_price_krw}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, original_price_krw: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">정원</label>
                  <input
                    type="number"
                    value={seasonForm.capacity}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, capacity: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <div>
                  <label className="mb-1 block text-[11px] font-black text-slate-400">모집 상태</label>
                  <select
                    value={seasonForm.status}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, status: event.target.value as CourseSeasonRow['status'] }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  >
                    <option value="draft">초안</option>
                    <option value="scheduled">오픈 예정</option>
                    <option value="open">모집중</option>
                    <option value="closed">마감</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 mt-5 md:mt-0">
                  <input
                    type="checkbox"
                    checked={seasonForm.is_featured}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, is_featured: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="text-sm font-bold text-slate-700">대표 시즌으로 노출</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => void saveSeason()}
                disabled={seasonSaving || !selectedTopicId}
                className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {seasonSaving ? '저장 중...' : editingSeason ? '회차 수정 저장' : '회차 추가'}
              </button>
              {editingSeason && (
                <button
                  type="button"
                  onClick={openSeasonCreate}
                  className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-200"
                >
                  취소
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-black tracking-[0.28em] text-slate-400 mb-2">SEASON LIST</p>
                <h3 className="text-xl font-black text-slate-900">선택된 주제의 회차</h3>
              </div>
              {selectedTopic && (
                <button
                  type="button"
                  onClick={() => void loadSeasons(selectedTopic.id)}
                  className="rounded-2xl bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-200"
                >
                  새로고침
                </button>
              )}
            </div>

            {!selectedTopic ? (
              <div className="py-12 text-center text-sm text-slate-400">왼쪽 목록에서 강의 주제를 선택하세요.</div>
            ) : seasonLoading ? (
              <div className="py-12 text-center text-sm text-slate-400">회차 목록을 불러오는 중...</div>
            ) : seasons.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">아직 등록된 회차가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {seasons.map((row) => (
                  <div key={row.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getSeasonStatusTone(row.status)}`}>
                            {row.status === 'open' ? '모집중' : row.status === 'scheduled' ? '오픈 예정' : row.status === 'closed' ? '마감' : '초안'}
                          </span>
                          {row.is_featured && (
                            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black text-white">
                              대표 시즌
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-black text-slate-900 mb-1">
                          {row.season_label || `${row.season_number}회차`}
                        </h4>
                        <div className="grid gap-1 text-sm text-slate-600">
                          <p>운영 기간: {formatDateRange(row.start_date, row.end_date)}</p>
                          <p>시즌가: {formatMoney(row.price_krw)} / 정상가: {formatMoney(row.original_price_krw)}</p>
                          <p>정원: {row.capacity ? `${row.capacity}명` : '미설정'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openSeasonEdit(row)}
                          className="rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-black text-indigo-700 hover:bg-indigo-100"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete({ type: 'season', row })}
                          className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700 hover:bg-rose-100"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmModal
          title={pendingDelete.type === 'topic' ? '강의 주제 삭제' : '회차 삭제'}
          message={
            pendingDelete.type === 'topic'
              ? `"${pendingDelete.row.title}" 주제를 삭제하시겠습니까? 연결된 회차도 함께 삭제됩니다.`
              : `"${pendingDelete.row.season_label || `${pendingDelete.row.season_number}회차`}" 회차를 삭제하시겠습니까?`
          }
          tip={
            pendingDelete.type === 'topic'
              ? '상세페이지 진입 경로도 함께 비게 됩니다.'
              : '해당 시즌 정보만 제거되고 주제 본체는 유지됩니다.'
          }
          confirmLabel="삭제"
          confirmColor="rose"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
};

export default CourseProgramAdminSection;
