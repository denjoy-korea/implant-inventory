import React from 'react';
import CourseProgramAdminSection from './CourseProgramAdminSection';
import VideoLectureLibrarySection from './VideoLectureLibrarySection';

export default function SystemAdminLecturesTab() {
  return (
    <div className="space-y-6">
      <CourseProgramAdminSection />

      <details className="rounded-[30px] border border-slate-200 bg-white p-0 shadow-sm group" open={false}>
        <summary className="cursor-pointer list-none px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.28em] text-slate-400 mb-2">LEGACY VIDEO</p>
              <h2 className="text-xl font-black text-slate-900">기존 동영상 강의 라이브러리</h2>
              <p className="text-sm text-slate-500 mt-2">
                대시보드 내부 학습용 영상은 별도 섹션으로 유지합니다.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-500 group-open:bg-indigo-50 group-open:text-indigo-700">
              펼치기
            </div>
          </div>
        </summary>
        <div className="border-t border-slate-200 p-6 pt-5">
          <VideoLectureLibrarySection />
        </div>
      </details>
    </div>
  );
}
