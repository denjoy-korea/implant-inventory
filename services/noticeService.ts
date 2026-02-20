import { supabase } from './supabaseClient';
import { DbNotice, Notice, NoticeCategory } from '../types';

interface CreateNoticeInput {
  title: string;
  content: string;
  category: NoticeCategory;
  isImportant: boolean;
  author?: string;
}

const VALID_CATEGORIES: NoticeCategory[] = ['공지', '업데이트', '오류수정', '이벤트'];

function normalizeCategory(value: string | null | undefined): NoticeCategory {
  if (value && VALID_CATEGORIES.includes(value as NoticeCategory)) {
    return value as NoticeCategory;
  }
  return '업데이트';
}

function dbToNotice(row: DbNotice): Notice {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: normalizeCategory(row.category),
    isImportant: row.is_important,
    author: row.author || '관리자',
    date: row.created_at,
  };
}

export const noticeService = {
  async listNotices(): Promise<Notice[]> {
    const { data, error } = await supabase
      .from('public_notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[noticeService] listNotices failed:', error);
      return [];
    }

    return (data as DbNotice[]).map(dbToNotice);
  },

  async createNotice(input: CreateNoticeInput): Promise<Notice | null> {
    const author = input.author?.trim() || '관리자';

    const { data, error } = await supabase
      .from('public_notices')
      .insert({
        title: input.title,
        content: input.content,
        category: input.category,
        is_important: input.isImportant,
        author,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[noticeService] createNotice failed:', error);
      return null;
    }

    return dbToNotice(data as DbNotice);
  },

  async deleteNotice(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('public_notices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[noticeService] deleteNotice failed:', error);
      return false;
    }

    return true;
  },
};
