
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Notice, NoticeCategory, NOTICE_CATEGORIES } from '../types';
import NoticeEditor from './NoticeEditor';
import { sanitizeRichHtml } from '../services/htmlSanitizer';

interface NoticeBoardProps {
    isAdmin: boolean;
    fullPage?: boolean;
}

const NoticeBoard: React.FC<NoticeBoardProps> = ({ isAdmin, fullPage = false }) => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isWriting, setIsWriting] = useState(false);
    const [filterCategory, setFilterCategory] = useState<NoticeCategory | 'all'>('all');
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [newNotice, setNewNotice] = useState<{ title: string; content: string; isImportant: boolean; category: NoticeCategory }>({
        title: '',
        content: '',
        isImportant: false,
        category: '업데이트'
    });

    useEffect(() => {
        const savedNotices = localStorage.getItem('app_notices');
        if (savedNotices) {
            try {
                const parsed = JSON.parse(savedNotices) as Notice[];
                const sanitized = parsed.map((notice) => ({
                    ...notice,
                    content: sanitizeRichHtml(String(notice.content || '')),
                }));
                setNotices(sanitized);
            } catch (e) {
                console.error('Failed to parse notices', e);
            }
        }
    }, []);

    const filteredNotices = useMemo(() => {
        if (filterCategory === 'all') return notices;
        return notices.filter(n => n.category === filterCategory);
    }, [notices, filterCategory]);

    const deleteTargetNotice = useMemo(() => {
        if (!deleteTarget) return null;
        return notices.find(n => n.id === deleteTarget) || null;
    }, [notices, deleteTarget]);

    const handleSave = () => {
        if (!newNotice.title.trim() || !newNotice.content.trim()) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }

        const safeContent = sanitizeRichHtml(newNotice.content);

        const notice: Notice = {
            id: `notice_${Date.now()}`,
            title: newNotice.title,
            content: safeContent,
            isImportant: newNotice.isImportant,
            category: newNotice.category,
            date: new Date().toISOString(),
            author: '관리자'
        };

        const updatedNotices = [notice, ...notices];
        setNotices(updatedNotices);
        localStorage.setItem('app_notices', JSON.stringify(updatedNotices));
        setNewNotice({ title: '', content: '', isImportant: false, category: '업데이트' });
        setIsWriting(false);
    };

    const confirmDelete = useCallback(() => {
        if (!deleteTarget) return;
        const updatedNotices = notices.filter(n => n.id !== deleteTarget);
        setNotices(updatedNotices);
        localStorage.setItem('app_notices', JSON.stringify(updatedNotices));
        setDeleteTarget(null);
    }, [deleteTarget, notices]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getMonth() + 1}. ${date.getDate()}.`;
    };

    const getCategoryStyle = (category?: NoticeCategory) => {
        const cat = NOTICE_CATEGORIES.find(c => c.value === category);
        if (!cat) return { color: 'text-slate-500', bg: 'bg-slate-100' };
        return { color: cat.color, bg: cat.bg };
    };

    return (
        <>
            <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col ${fullPage ? 'min-h-[400px]' : 'h-full max-h-[400px]'}`}>
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        업데이트 소식
                    </h3>
                    {isAdmin && !isWriting && (
                        <button
                            onClick={() => setIsWriting(true)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                        >
                            + 글쓰기
                        </button>
                    )}
                </div>

                {!isWriting && notices.length > 0 && (
                    <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setFilterCategory('all')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap ${filterCategory === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            전체
                        </button>
                        {NOTICE_CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setFilterCategory(cat.value)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap ${filterCategory === cat.value ? `${cat.bg} ${cat.color}` : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                    {isWriting ? (
                        <div className="p-4 space-y-3 bg-slate-50/50">
                            <div className="flex items-center gap-1.5">
                                {NOTICE_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.value}
                                        onClick={() => setNewNotice({ ...newNotice, category: cat.value })}
                                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${newNotice.category === cat.value ? `${cat.bg} ${cat.color} border-current` : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="제목을 입력하세요"
                                value={newNotice.title}
                                onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            />
                            <NoticeEditor
                                onChange={(html) => setNewNotice(prev => ({ ...prev, content: html }))}
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="important"
                                    checked={newNotice.isImportant}
                                    onChange={(e) => setNewNotice({ ...newNotice, isImportant: e.target.checked })}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <label htmlFor="important" className="text-xs text-slate-600 font-medium cursor-pointer">중요 공지</label>
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                                <button
                                    onClick={() => setIsWriting(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                                >
                                    등록
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredNotices.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    {filterCategory === 'all' ? '등록된 소식이 없습니다.' : `${filterCategory} 카테고리에 등록된 소식이 없습니다.`}
                                </div>
                            ) : (
                                filteredNotices.map((notice) => {
                                    const catStyle = getCategoryStyle(notice.category);
                                    return (
                                        <div key={notice.id} className={`p-4 hover:bg-slate-50 transition-colors ${notice.isImportant ? 'bg-indigo-50/30' : ''}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {notice.category && (
                                                        <span className={`px-1.5 py-0.5 ${catStyle.bg} ${catStyle.color} text-[10px] font-bold rounded flex-shrink-0`}>{notice.category}</span>
                                                    )}
                                                    {notice.isImportant && (
                                                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded flex-shrink-0">중요</span>
                                                    )}
                                                    <h4 className={`text-sm font-bold truncate ${notice.isImportant ? 'text-slate-800' : 'text-slate-700'}`}>{notice.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDate(notice.date)}</span>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => setDeleteTarget(notice.id)}
                                                            className="px-1.5 py-0.5 text-[10px] font-medium text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="notice-content text-xs text-slate-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(notice.content) }} />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">공지사항 삭제</h3>
                            <p className="text-sm text-slate-500 mb-1">이 글을 삭제하시겠습니까?</p>
                            {deleteTargetNotice && (
                                <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 mt-3 truncate">
                                    &ldquo;{deleteTargetNotice.title}&rdquo;
                                </p>
                            )}
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
                            >
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NoticeBoard;
