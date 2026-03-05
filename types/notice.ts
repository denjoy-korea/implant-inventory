export type NoticeCategory = '공지' | '업데이트' | '오류수정' | '이벤트';

export const NOTICE_CATEGORIES: { value: NoticeCategory; label: string; color: string; bg: string }[] = [
  { value: '공지', label: '공지', color: 'text-rose-600', bg: 'bg-rose-100' },
  { value: '업데이트', label: '업데이트', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { value: '오류수정', label: '오류수정', color: 'text-amber-600', bg: 'bg-amber-100' },
  { value: '이벤트', label: '이벤트', color: 'text-emerald-600', bg: 'bg-emerald-100' },
];

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string; // ISO String
  author: string;
  isImportant?: boolean;
  category?: NoticeCategory;
}

/** Supabase public_notices 테이블 Row */
export interface DbNotice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  is_important: boolean;
  author: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
