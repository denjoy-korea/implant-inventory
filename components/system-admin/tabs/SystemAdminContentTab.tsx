import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../services/supabaseClient';

interface ContentItem {
  fileName: string;
  title: string;
  description: string;
}

const CONTENT_ITEMS: ContentItem[] = [
  {
    fileName: 'landing-mockup.mp4',
    title: '랜딩 대시보드 목업 영상',
    description: '메인 랜딩 페이지 상단(Features) 노출 영상',
  },
  {
    fileName: 'analysis-demo.mp4',
    title: '무료분석 데모 영상',
    description: '분석 페이지(Analyze) 하단 운영 사례 영상',
  },
];

interface RowState {
  file: File | null;
  uploading: boolean;
  lastModified: string | null;
  errorMsg: string;
  successMsg: string;
}

export default function SystemAdminContentTab() {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [rows, setRows] = useState<RowState[]>(
    CONTENT_ITEMS.map(() => ({ file: null, uploading: false, lastModified: null, errorMsg: '', successMsg: '' })),
  );

  useEffect(() => {
    CONTENT_ITEMS.forEach((item, index) => fetchFileInfo(item.fileName, index));
  }, []);

  const fetchFileInfo = async (fileName: string, index: number) => {
    try {
      const { data, error } = await supabase.storage.from('public-assets').list('site', { search: fileName });
      if (error || !data) return;
      const fileInfo = data.find((f: { name: string; updated_at?: string }) => f.name === fileName);
      if (fileInfo?.updated_at) {
        const date = new Date(fileInfo.updated_at);
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, lastModified: date.toLocaleString() } : r)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, errorMsg: '', successMsg: '' } : r)));
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'video/mp4') {
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, errorMsg: 'MP4 형식만 업로드 가능합니다.', file: null } : r)));
        if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = '';
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, errorMsg: '50MB 이하 파일만 업로드 가능합니다.', file: null } : r)));
        if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = '';
        return;
      }
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, file: selectedFile } : r)));
    }
  };

  const handleUpload = async (index: number) => {
    const row = rows[index];
    if (!row.file) return;
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, uploading: true, errorMsg: '', successMsg: '' } : r)));
    try {
      const { error } = await supabase.storage
        .from('public-assets')
        .upload(`site/${CONTENT_ITEMS[index].fileName}`, row.file, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = '';
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, file: null, uploading: false, successMsg: '업로드 완료' } : r)));
      await fetchFileInfo(CONTENT_ITEMS[index].fileName, index);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '업로드 오류';
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, uploading: false, errorMsg: msg } : r)));
    }
  };

  return (
    <div className="space-y-4">
      {/* 영상 콘텐츠 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h2 className="text-sm font-bold text-slate-700">영상 콘텐츠 관리</h2>
          <span className="ml-auto text-[10px] text-slate-400">mp4 · 최대 50MB</span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-500 w-56">콘텐츠</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 w-44">상태</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500">파일 선택</th>
              <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 w-32">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {CONTENT_ITEMS.map((item, index) => {
              const row = rows[index];
              return (
                <tr key={item.fileName} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 align-top">
                    <p className="font-bold text-slate-800 text-xs leading-snug">{item.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.description}</p>
                    <p className="text-[10px] text-slate-300 mt-1 font-mono">{item.fileName}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    {row.lastModified ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          등록됨
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">{row.lastModified}</p>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                        미등록
                      </span>
                    )}
                    {row.successMsg && <p className="text-[10px] text-emerald-600 font-bold mt-1.5">{row.successMsg}</p>}
                    {row.errorMsg && <p className="text-[10px] text-rose-500 font-bold mt-1.5">{row.errorMsg}</p>}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <input
                      type="file"
                      accept="video/mp4"
                      onChange={(e) => handleFileChange(e, index)}
                      disabled={row.uploading}
                      ref={(el) => { fileInputRefs.current[index] = el; }}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
                    />
                    {row.file && (
                      <p className="text-[10px] text-indigo-500 mt-1 font-medium">
                        {row.file.name} ({(row.file.size / (1024 * 1024)).toFixed(1)} MB)
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 align-middle text-right">
                    <button
                      onClick={() => handleUpload(index)}
                      disabled={!row.file || row.uploading}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors whitespace-nowrap"
                    >
                      {row.uploading ? '업로드 중...' : '업로드 및 교체'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2.5">
        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <ul className="text-[11px] text-amber-700 space-y-1 list-disc list-inside">
          <li>업로드 즉시 실제 서버의 파일이 덮어씌워지며, 사용자 페이지에 실시간 반영됩니다.</li>
          <li>mp4 파일만 등록 가능하며, 권장 크기는 약 5MB 이하입니다 (최대 50MB 제한).</li>
          <li>파일이 로드되지 않을 경우, 대체 이미지나 애니메이션 목업이 표시됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
