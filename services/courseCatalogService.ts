import { supabase } from './supabaseClient';
import type {
  CourseSeasonForm,
  CourseSeasonRow,
  CourseTopicForm,
  CourseTopicRow,
} from '../types/courseCatalog';

const PUBLIC_TOPIC_COLUMNS =
  'id, slug, title, category, short_description, hero_badge, hero_headline, hero_summary, instructor_name, instructor_role, is_published, sort_order, created_at, updated_at';

const PUBLIC_SEASON_COLUMNS =
  'id, topic_id, season_number, season_label, start_date, end_date, price_krw, original_price_krw, status, capacity, is_featured, created_at, updated_at';

function normalizeTopicPayload(form: CourseTopicForm) {
  return {
    slug: form.slug.trim(),
    title: form.title.trim(),
    category: form.category.trim() || null,
    short_description: form.short_description.trim() || null,
    hero_badge: form.hero_badge.trim() || null,
    hero_headline: form.hero_headline.trim() || null,
    hero_summary: form.hero_summary.trim() || null,
    instructor_name: form.instructor_name.trim() || null,
    instructor_role: form.instructor_role.trim() || null,
    is_published: form.is_published,
    sort_order: Number.parseInt(form.sort_order, 10) || 0,
  };
}

function normalizeSeasonPayload(form: CourseSeasonForm) {
  return {
    season_number: Math.max(1, Number.parseInt(form.season_number, 10) || 1),
    season_label: form.season_label.trim() || null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    price_krw: Math.max(0, Number.parseInt(form.price_krw, 10) || 0),
    original_price_krw: form.original_price_krw.trim()
      ? Math.max(0, Number.parseInt(form.original_price_krw, 10) || 0)
      : null,
    status: form.status,
    capacity: form.capacity.trim()
      ? Math.max(0, Number.parseInt(form.capacity, 10) || 0)
      : null,
    is_featured: form.is_featured,
  };
}

export const courseCatalogService = {
  async listPublicTopics(): Promise<CourseTopicRow[]> {
    const { data, error } = await supabase
      .from('course_topics')
      .select(PUBLIC_TOPIC_COLUMNS)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CourseTopicRow[];
  },

  async getPublicTopicBySlug(slug: string): Promise<CourseTopicRow | null> {
    const { data, error } = await supabase
      .from('course_topics')
      .select(PUBLIC_TOPIC_COLUMNS)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw error;
    return (data as CourseTopicRow | null) ?? null;
  },

  async listPublicSeasonsBySlug(slug: string): Promise<CourseSeasonRow[]> {
    const topic = await this.getPublicTopicBySlug(slug);
    if (!topic) return [];

    const { data, error } = await supabase
      .from('course_seasons')
      .select(PUBLIC_SEASON_COLUMNS)
      .eq('topic_id', topic.id)
      .order('season_number', { ascending: false });

    if (error) throw error;
    return (data ?? []) as CourseSeasonRow[];
  },

  async listAdminTopics(): Promise<CourseTopicRow[]> {
    const { data, error } = await supabase
      .from('course_topics')
      .select(PUBLIC_TOPIC_COLUMNS)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CourseTopicRow[];
  },

  async createTopic(form: CourseTopicForm): Promise<void> {
    const { error } = await supabase
      .from('course_topics')
      .insert(normalizeTopicPayload(form));

    if (error) throw error;
  },

  async updateTopic(id: string, form: CourseTopicForm): Promise<void> {
    const { error } = await supabase
      .from('course_topics')
      .update(normalizeTopicPayload(form))
      .eq('id', id);

    if (error) throw error;
  },

  async deleteTopic(id: string): Promise<void> {
    const { error } = await supabase.from('course_topics').delete().eq('id', id);
    if (error) throw error;
  },

  async listAdminSeasons(topicId: string): Promise<CourseSeasonRow[]> {
    const { data, error } = await supabase
      .from('course_seasons')
      .select(PUBLIC_SEASON_COLUMNS)
      .eq('topic_id', topicId)
      .order('season_number', { ascending: false });

    if (error) throw error;
    return (data ?? []) as CourseSeasonRow[];
  },

  async createSeason(topicId: string, form: CourseSeasonForm): Promise<void> {
    const { error } = await supabase
      .from('course_seasons')
      .insert({ topic_id: topicId, ...normalizeSeasonPayload(form) });

    if (error) throw error;
  },

  async updateSeason(id: string, form: CourseSeasonForm): Promise<void> {
    const { error } = await supabase
      .from('course_seasons')
      .update(normalizeSeasonPayload(form))
      .eq('id', id);

    if (error) throw error;
  },

  async deleteSeason(id: string): Promise<void> {
    const { error } = await supabase.from('course_seasons').delete().eq('id', id);
    if (error) throw error;
  },
};
