export type CourseSeasonStatus = 'draft' | 'scheduled' | 'open' | 'closed';

export interface CourseTopicRow {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  short_description: string | null;
  hero_badge: string | null;
  hero_headline: string | null;
  hero_summary: string | null;
  instructor_name: string | null;
  instructor_role: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CourseSeasonRow {
  id: string;
  topic_id: string;
  season_number: number;
  season_label: string | null;
  start_date: string | null;
  end_date: string | null;
  price_krw: number;
  original_price_krw: number | null;
  status: CourseSeasonStatus;
  capacity: number | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseTopicForm {
  slug: string;
  title: string;
  category: string;
  short_description: string;
  hero_badge: string;
  hero_headline: string;
  hero_summary: string;
  instructor_name: string;
  instructor_role: string;
  is_published: boolean;
  sort_order: string;
}

export interface CourseSeasonForm {
  season_number: string;
  season_label: string;
  start_date: string;
  end_date: string;
  price_krw: string;
  original_price_krw: string;
  status: CourseSeasonStatus;
  capacity: string;
  is_featured: boolean;
}
