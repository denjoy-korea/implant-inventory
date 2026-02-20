import React from 'react';

/** Shimmer animation bar */
const Bone = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
    <div className={`bg-slate-200 rounded animate-pulse ${className}`} style={style} />
);

export default function SurgeryDashboardSkeleton() {
    return (
        <div className="space-y-6" aria-busy="true" aria-label="대시보드 로딩 중">
            {/* Header Strip Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="space-y-2">
                            <Bone className="w-16 h-3" />
                            <Bone className="w-10 h-2" />
                            <Bone className="w-32 h-4 mt-1" />
                        </div>
                        <div className="h-10 w-px bg-slate-100" />
                        <div className="space-y-2">
                            <Bone className="w-14 h-3" />
                            <Bone className="w-8 h-2" />
                            <Bone className="w-20 h-4 mt-1" />
                        </div>
                        <div className="h-10 w-px bg-slate-100" />
                        <div className="space-y-2">
                            <Bone className="w-18 h-3" />
                            <Bone className="w-10 h-2" />
                            <Bone className="w-28 h-4 mt-1" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Bone className="w-28 h-9 rounded-lg" />
                        <Bone className="w-24 h-9 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* KPI Strip Skeleton */}
            <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Bone className="w-14 h-3" />
                                <Bone className="w-10 h-2" />
                            </div>
                            <Bone className="w-24 h-8" />
                            <Bone className="w-full h-6 rounded-lg" />
                            <Bone className="w-16 h-4 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Period Filter Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Bone className="w-4 h-4 rounded" />
                        <Bone className="w-20 h-3" />
                    </div>
                    <Bone className="w-32 h-4 rounded-full" />
                </div>
                <Bone className="w-full h-2 rounded-full" />
            </div>

            {/* Charts 2x2 Grid Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-6">
                {/* Monthly Trend */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-1">
                            <Bone className="w-20 h-4" />
                            <Bone className="w-24 h-2" />
                        </div>
                        <div className="flex gap-4">
                            <Bone className="w-12 h-3" />
                            <Bone className="w-12 h-3" />
                            <Bone className="w-16 h-3" />
                        </div>
                    </div>
                    <div className="flex items-end gap-2 h-[200px]">
                        {Array.from({ length: 13 }).map((_, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end">
                                <Bone className="w-full rounded" style={{ height: `${30 + Math.random() * 70}%` }} />
                                <Bone className="w-8 h-2 mt-2" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Day of Week */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="space-y-1 mb-6">
                        <Bone className="w-28 h-4" />
                        <Bone className="w-20 h-2" />
                    </div>
                    <div className="flex items-end gap-2 h-[200px]">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end">
                                <Bone className="w-full rounded" style={{ height: `${20 + Math.random() * 80}%` }} />
                                <Bone className="w-4 h-2 mt-2" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section Header Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-100 border-l-[3px] border-l-slate-300 px-6 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Bone className="w-8 h-8 rounded-lg" />
                    <div className="space-y-1">
                        <Bone className="w-20 h-4" />
                        <Bone className="w-24 h-2" />
                    </div>
                </div>
            </div>

            {/* Analysis Block Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <Bone className="w-32 h-4 mb-4" />
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Bone className="w-4 h-4 rounded-full" />
                                <Bone className="flex-1 h-6 rounded-lg" />
                                <Bone className="w-12 h-4" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <Bone className="w-24 h-4 mb-4" />
                    <Bone className="w-full h-[200px] rounded-xl" />
                </div>
            </div>
        </div>
    );
}
