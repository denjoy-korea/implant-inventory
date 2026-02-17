
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { sanitizeRichHtml } from '../services/htmlSanitizer';

interface NoticeEditorProps {
  onChange: (html: string) => void;
  initialValue?: string;
}

const TEXT_COLORS = [
  { label: '기본', value: '#37352f' },
  { label: '회색', value: '#9b9a97' },
  { label: '갈색', value: '#64473a' },
  { label: '주황색', value: '#d9730d' },
  { label: '노란색', value: '#dfab01' },
  { label: '초록색', value: '#0f7b6c' },
  { label: '파란색', value: '#0b6e99' },
  { label: '보라색', value: '#6940a5' },
  { label: '분홍색', value: '#ad1a72' },
  { label: '빨간색', value: '#e03e3e' },
];

const BG_COLORS = [
  { label: '기본', value: 'transparent' },
  { label: '회색', value: '#f1f1ef' },
  { label: '갈색', value: '#f4eeee' },
  { label: '주황색', value: '#fbecdd' },
  { label: '노란색', value: '#fbf3db' },
  { label: '초록색', value: '#edf3ec' },
  { label: '파란색', value: '#e7f3f8' },
  { label: '보라색', value: '#f6f3f9' },
  { label: '분홍색', value: '#faf1f5' },
  { label: '빨간색', value: '#fdebec' },
];

const NoticeEditor: React.FC<NoticeEditorProps> = ({ onChange, initialValue = '' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const textColorRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && initialValue) {
      editorRef.current.innerHTML = sanitizeRichHtml(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textColorRef.current && !textColorRef.current.contains(e.target as Node)) {
        setShowTextColor(false);
      }
      if (bgColorRef.current && !bgColorRef.current.contains(e.target as Node)) {
        setShowBgColor(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      onChange(sanitizeRichHtml(editorRef.current.innerHTML));
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(sanitizeRichHtml(editorRef.current.innerHTML));
    }
  }, [onChange]);

  const preventBlur = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const insertCallout = useCallback(() => {
    exec('insertHTML', '<div class="notice-callout"><span>💡</span><span>여기에 내용을 입력하세요</span></div><p><br></p>');
  }, [exec]);

  const insertHr = useCallback(() => {
    exec('insertHTML', '<hr><p><br></p>');
  }, [exec]);

  const insertImage = useCallback(() => {
    if (!imageUrl.trim()) return;
    const safeHtml = sanitizeRichHtml(`<img src="${imageUrl.replace(/"/g, '&quot;')}" alt="이미지"><p><br></p>`);
    exec('insertHTML', safeHtml);
    setImageUrl('');
    setShowImageModal(false);
  }, [imageUrl, exec]);

  const ToolbarButton: React.FC<{ onClick: () => void; title: string; active?: boolean; children: React.ReactNode }> = ({ onClick, title, active, children }) => (
    <button
      onMouseDown={preventBlur}
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
    >
      {children}
    </button>
  );

  const Separator = () => <div className="w-px h-5 bg-slate-200 mx-1" />;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50/80 flex-wrap">
        {/* Block format */}
        <ToolbarButton onClick={() => exec('formatBlock', 'h2')} title="제목 2">H2</ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'h3')} title="제목 3">H3</ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'p')} title="본문">P</ToolbarButton>

        <Separator />

        {/* Text format */}
        <ToolbarButton onClick={() => exec('bold')} title="굵게">
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="기울임">
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="밑줄">
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('strikeThrough')} title="취소선">
          <span className="line-through">S</span>
        </ToolbarButton>

        <Separator />

        {/* Lists */}
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="글머리 목록">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /><circle cx="1" cy="6" r="1" fill="currentColor" /><circle cx="1" cy="12" r="1" fill="currentColor" /><circle cx="1" cy="18" r="1" fill="currentColor" /></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="번호 목록">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13" /><text x="1" y="8" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">1</text><text x="1" y="14" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">2</text><text x="1" y="20" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">3</text></svg>
        </ToolbarButton>

        <Separator />

        {/* Text color dropdown */}
        <div className="relative" ref={textColorRef}>
          <button
            onMouseDown={preventBlur}
            onClick={() => { setShowTextColor(!showTextColor); setShowBgColor(false); }}
            title="텍스트 색상"
            className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors text-slate-600 hover:bg-slate-100"
          >
            <span className="border-b-2 border-current">A</span>
          </button>
          {showTextColor && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-50 w-[180px]">
              <p className="text-[10px] text-slate-400 font-medium mb-1.5 px-1">텍스트 색상</p>
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map(c => (
                  <button
                    key={c.value}
                    onMouseDown={preventBlur}
                    onClick={() => { exec('foreColor', c.value); setShowTextColor(false); }}
                    title={c.label}
                    className="w-7 h-7 rounded-md border border-slate-200 hover:scale-110 transition-transform flex items-center justify-center"
                  >
                    <span className="text-xs font-bold" style={{ color: c.value }}>A</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Background color dropdown */}
        <div className="relative" ref={bgColorRef}>
          <button
            onMouseDown={preventBlur}
            onClick={() => { setShowBgColor(!showBgColor); setShowTextColor(false); }}
            title="배경 색상"
            className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors text-slate-600 hover:bg-slate-100"
          >
            <span className="bg-yellow-200 px-1 rounded-sm">A</span>
          </button>
          {showBgColor && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-50 w-[180px]">
              <p className="text-[10px] text-slate-400 font-medium mb-1.5 px-1">배경 색상</p>
              <div className="grid grid-cols-5 gap-1">
                {BG_COLORS.map(c => (
                  <button
                    key={c.value}
                    onMouseDown={preventBlur}
                    onClick={() => { exec('hiliteColor', c.value); setShowBgColor(false); }}
                    title={c.label}
                    className="w-7 h-7 rounded-md border border-slate-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.value === 'transparent' ? '#ffffff' : c.value }}
                  >
                    {c.value === 'transparent' && <span className="text-[10px] text-slate-400">∅</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Block elements */}
        <ToolbarButton onClick={insertCallout} title="콜아웃">
          <span className="text-[13px]">💡</span>
        </ToolbarButton>
        <ToolbarButton onClick={insertHr} title="구분선">—</ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'blockquote')} title="인용">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowImageModal(true)} title="이미지">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder="내용을 입력하세요..."
        className="min-h-[200px] max-h-[400px] overflow-y-auto px-4 py-3 text-sm text-slate-700 leading-relaxed focus:outline-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-slate-300 [&:empty]:before:pointer-events-none notice-content"
      />

      {/* Image URL modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowImageModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3">이미지 URL 삽입</h3>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') insertImage(); }}
              />
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button
                onClick={() => { setShowImageModal(false); setImageUrl(''); }}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={insertImage}
                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                삽입
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeEditor;
