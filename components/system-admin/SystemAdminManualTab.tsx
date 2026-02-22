import React from 'react';
import NoticeEditor from '../NoticeEditor';
import { sanitizeRichHtml } from '../../services/htmlSanitizer';

export interface SystemAdminManualEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  updated_at: string;
  created_at: string;
}

interface SystemAdminManualForm {
  title: string;
  content: string;
  category: string;
}

interface SystemAdminManualTabProps {
  entries: SystemAdminManualEntry[];
  selectedId: string | null;
  editingEntry: SystemAdminManualEntry | null;
  form: SystemAdminManualForm;
  categories: string[];
  isSaving: boolean;
  onCreateNew: () => void;
  onSelectEntry: (entryId: string) => void;
  onCategoryChange: (category: string) => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onStartEdit: (entry: SystemAdminManualEntry) => void;
  onDelete: (entryId: string) => void;
}

const SystemAdminManualTab: React.FC<SystemAdminManualTabProps> = ({
  entries,
  selectedId,
  editingEntry,
  form,
  categories,
  isSaving,
  onCreateNew,
  onSelectEntry,
  onCategoryChange,
  onTitleChange,
  onContentChange,
  onCancelEdit,
  onSave,
  onStartEdit,
  onDelete,
}) => {
  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <div className="w-72 flex-shrink-0 flex flex-col">
        <button
          onClick={onCreateNew}
          className="w-full mb-3 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          새 문서 작성
        </button>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {entries.length === 0 && selectedId !== '__new__' && (
            <p className="text-xs text-slate-400 text-center py-8">작성된 매뉴얼이 없습니다.</p>
          )}
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${selectedId === entry.id
                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{entry.category}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">{entry.title}</p>
              <p className="text-[10px] text-slate-400 mt-1">{new Date(entry.updated_at || entry.created_at).toLocaleDateString('ko-KR')}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {!selectedId && !editingEntry && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 h-full flex flex-col items-center justify-center text-slate-400">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <p className="text-sm font-bold">문서를 선택하거나 새로 작성하세요</p>
            <p className="text-xs mt-1">시스템 구축 시 대화 내용을 정리하여 기록할 수 있습니다</p>
          </div>
        )}

        {(selectedId === '__new__' || editingEntry) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 h-full flex flex-col">
            <div className="flex items-center gap-1.5 mb-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${form.category === category
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <input
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 mb-3"
            />
            <div className="flex-1 min-h-0">
              <NoticeEditor
                key={editingEntry ? editingEntry.id : '__new__'}
                onChange={onContentChange}
                initialValue={editingEntry ? editingEntry.content : ''}
              />
            </div>
            <div className="flex gap-2 justify-end pt-3">
              <button
                onClick={onCancelEdit}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={onSave}
                disabled={isSaving || !form.title.trim() || !form.content.trim()}
                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : editingEntry ? '수정 완료' : '등록'}
              </button>
            </div>
          </div>
        )}

        {selectedId && selectedId !== '__new__' && !editingEntry && (() => {
          const selected = entries.find((entry) => entry.id === selectedId);
          if (!selected) return null;
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">{selected.category}</span>
                    <span className="text-[10px] text-slate-400">
                      최종 수정: {new Date(selected.updated_at || selected.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">{selected.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onStartEdit(selected)}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(selected.id)}
                    className="px-3 py-1.5 text-xs font-bold text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto text-sm text-slate-700 leading-relaxed notice-content" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(selected.content) }} />
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SystemAdminManualTab;
