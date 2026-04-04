import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { tossPaymentService } from '../services/tossPaymentService';
import { HospitalPlanState, PLAN_NAMES, User } from '../types';
import type { CourseSeasonRow } from '../types/courseCatalog';
import { buildBillingDisplayModel } from '../utils/billingDisplay';
import CourseLectureReplay from './CourseLectureReplay';

// ── Types ────────────────────────────────────────────────────────────────────

type MyPageTab = 'home' | 'services' | 'lectures' | 'purchases' | 'settings';

interface CartItem {
  id: string;
  name: string;
  subLabel: string;
  price: number;
}

interface BillingRecord {
  id: string;
  plan: string | null;
  billing_cycle: string | null;
  amount: number;
  payment_status: string;
  payment_method: string | null;
  payment_ref: string | null;
  description: string | null;
  created_at: string;
  refund_amount: number | null;
  credit_restore_amount?: number | null;
  coupon_id?: string | null;
  original_amount?: number | null;
  discount_amount?: number | null;
  upgrade_credit_amount?: number | null;
  credit_used_amount: number | null;
}

interface CourseWithSeasons {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  short_description: string | null;
  hero_badge: string | null;
  instructor_name: string | null;
  instructor_role: string | null;
  course_seasons: CourseSeasonRow[];
}

interface MyPageProps {
  user: User;
  hospitalName: string;
  planState: HospitalPlanState | null;
  onGoToDashboard: () => void;
  /** 임플란트 재고관리 서비스 카드 클릭 → inventory 홈페이지(랜딩)로 이동 */
  onGoToInventoryHome: () => void;
  onGoToPricing: () => void;
  onGoToContact: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { text: string; cls: string }> = {
  completed:  { text: '결제 완료', cls: 'bg-emerald-50 text-emerald-700' },
  pending:    { text: '처리 중',   cls: 'bg-amber-50 text-amber-700' },
  confirming: { text: '확인 중',   cls: 'bg-blue-50 text-blue-700' },
  failed:     { text: '실패',      cls: 'bg-rose-50 text-rose-700' },
  cancelled:  { text: '취소됨',    cls: 'bg-slate-100 text-slate-500' },
};

function formatPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function getBestOpenSeason(seasons: CourseSeasonRow[]): CourseSeasonRow | null {
  const open = seasons.find(s => s.status === 'open');
  if (open) return open;
  const scheduled = seasons.find(s => s.status === 'scheduled');
  return scheduled ?? null;
}

const CART_STORAGE_PREFIX = 'denjoy:service-cart:';

function getCartStorageKey(userId: string): string {
  return `${CART_STORAGE_PREFIX}${userId}`;
}

function sanitizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as { id?: unknown }).id !== 'string' ||
      typeof (item as { name?: unknown }).name !== 'string' ||
      typeof (item as { subLabel?: unknown }).subLabel !== 'string'
    ) {
      return [];
    }

    const price = Number((item as { price?: unknown }).price);
    if (!Number.isFinite(price) || price < 0) return [];

    return [{
      id: (item as { id: string }).id,
      name: (item as { name: string }).name,
      subLabel: (item as { subLabel: string }).subLabel,
      price,
    }];
  });
}

function readStoredCart(userId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(getCartStorageKey(userId));
    if (!raw) return [];
    return sanitizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeStoredCart(userId: string, items: CartItem[]) {
  try {
    const storageKey = getCartStorageKey(userId);
    if (items.length === 0) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // localStorage unavailable
  }
}

function reconcileCartItems(items: CartItem[], courses: CourseWithSeasons[]) {
  const seasonMap = new Map<string, { title: string; season: CourseSeasonRow }>();
  for (const course of courses) {
    for (const season of course.course_seasons) {
      if (season.status !== 'open') continue;
      seasonMap.set(season.id, { title: course.title, season });
    }
  }

  let removedCount = 0;
  let updatedCount = 0;

  const nextItems = items.flatMap((item) => {
    const match = seasonMap.get(item.id);
    if (!match) {
      removedCount += 1;
      return [];
    }

    const normalized: CartItem = {
      id: match.season.id,
      name: match.title,
      subLabel: match.season.season_label || `${match.season.season_number}기`,
      price: match.season.price_krw,
    };

    if (
      normalized.name !== item.name ||
      normalized.subLabel !== item.subLabel ||
      normalized.price !== item.price
    ) {
      updatedCount += 1;
    }

    return [normalized];
  });

  return { items: nextItems, removedCount, updatedCount };
}

// ── CheckoutModal ────────────────────────────────────────────────────────────

function CheckoutModal({ items, onClose, onPay, paying, onRemove }: {
  items: CartItem[];
  onClose: () => void;
  onPay: () => void;
  paying: boolean;
  onRemove: (id: string) => void;
}) {
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white rounded-t-[32px] sm:rounded-[32px] w-full sm:max-w-md shadow-2xl shadow-indigo-900/20 overflow-hidden animate-fade-in-up">
        {/* Modal Header Decoration */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[20px] font-black text-slate-900 mb-1">주문 확인</h3>
              <p className="text-[13px] text-slate-400 font-medium">선택하신 항목들을 확인해 주세요.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {items.map(item => (
              <div key={item.id} className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-slate-800 truncate">{item.name}</p>
                  {item.subLabel && <p className="text-[12px] text-indigo-500 font-bold mt-1">{item.subLabel}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[14px] font-black text-slate-900">{formatPrice(item.price)}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="w-8 h-8 rounded-xl border border-slate-200 text-slate-400 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    aria-label={`${item.name} 장바구니에서 제거`}
                  >
                    <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-8 px-2">
            <div className="flex justify-between text-[14px] text-slate-500 font-medium">
              <span>상품 합계</span>
              <span className="text-slate-900">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[14px] text-slate-500 font-medium">
              <span>부가세 (10%)</span>
              <span className="text-slate-900">{formatPrice(vat)}</span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[16px] font-black text-slate-900">최종 주문 금액</span>
              <span className="text-[24px] font-black text-indigo-600 tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={onPay}
              disabled={paying}
              className="group relative w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-[16px] hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {paying ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>결제 진행 중...</span>
                </div>
              ) : (
                <>
                  <span>안전하게 결제하기</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>강력한 보안 기술로 귀하의 결제 정보를 보호합니다 (토스페이먼츠 연동)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CartBar ──────────────────────────────────────────────────────────────────

function CartBar({ items, onOpen }: {
  items: CartItem[];
  onOpen: () => void;
}) {
  if (items.length === 0) return null;
  const total = Math.round(items.reduce((s, i) => s + i.price, 0) * 1.1);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-full max-w-lg px-4 animate-bounce-soft">
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-flex border border-white/20 p-4 shadow-2xl shadow-indigo-900/40 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 relative">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.112 16.835a.75.75 0 0 1-.747.808H4.03a.75.75 0 0 1-.747-.808l1.112-16.835a.75.75 0 0 1 .747-.808h14.052a.75.75 0 0 1 .747.808Z" />
            </svg>
            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-slate-900 text-[12px] font-black flex items-center justify-center shadow-lg border-2 border-indigo-600">
              {items.length}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-black text-white truncate">
              {items[0].name}{items.length > 1 ? ` 외 ${items.length - 1}건` : ''}
            </p>
            <p className="text-[13px] text-indigo-300 font-bold">{formatPrice(total)} 주문 예정</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="group px-8 py-3.5 rounded-2xl bg-white text-slate-900 font-black text-[15px] hover:bg-slate-100 transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-white/5"
        >
          <span>결제하러 가기</span>
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Tabs content ─────────────────────────────────────────────────────────────

function HomeTab({ user, hospitalName, planState, onGoToDashboard, onGoToInventoryHome, onGoToPricing, onGoToContact }: {
  user: User;
  hospitalName: string;
  planState: HospitalPlanState | null;
  onGoToDashboard: () => void;
  onGoToInventoryHome: () => void;
  onGoToPricing: () => void;
  onGoToContact: () => void;
}) {
  const planName = planState ? PLAN_NAMES[planState.plan] : 'Free';
  const isExpired = planState ? (planState.daysUntilExpiry != null && planState.daysUntilExpiry <= 0 && !!planState.expiresAt) : false;
  const daysLeft = planState?.expiresAt ? (planState.daysUntilExpiry ?? null) : null;

  return (
    <div className="space-y-8">
      {/* Promotion / Action Banner */}
      <div className="bg-indigo-600 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-indigo-600/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8l2.85-2.85a.75.75 0 0 0 0-1.06l-1.06-1.06a.75.75 0 0 0-1.06 0l-2.85 2.85v-4.8a6 6 0 0 1 7.38-5.84l.42.11a6 6 0 0 1 4.65 4.65l.11.42Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black leading-tight">프로필 정보를 완성하고 맞춤 혜택을 받으세요!</h3>
            <p className="text-indigo-100 text-sm opacity-90">치과 규모와 운영 환경에 맞는 최적의 강의를 추천해 드립니다.</p>
          </div>
        </div>
        <button className="px-6 py-2.5 bg-white text-indigo-600 rounded-xl font-black text-sm hover:bg-slate-50 transition-colors whitespace-nowrap">
          내 정보 설정하기 →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Access & Stats */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Workspaces */}
          <section>
            <h3 className="text-[15px] font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
              활성 서비스
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={onGoToInventoryHome}
                className="system-card system-card-hover p-6 text-left group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  {!isExpired && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Active</span>}
                </div>
                <h4 className="text-[16px] font-black text-slate-900 mb-1 leading-tight tracking-tight">임플란트 재고관리</h4>
                <p className="text-[13px] text-slate-500 mb-4">덴트웹 연동 실시간 재고 추적</p>
                <div className="flex items-center text-[12px] font-bold text-indigo-600">
                  <span>워크스페이스 바로가기</span>
                  <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => {}} 
                className="system-card system-card-hover p-6 text-left group border-dashed border-2 bg-slate-50/50"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 mb-4 group-hover:bg-slate-200 transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <h4 className="text-[16px] font-black text-slate-400 mb-1 leading-tight tracking-tight">신규 서비스 추가</h4>
                <p className="text-[13px] text-slate-400">덴조이 솔루션 더 보기</p>
              </button>
            </div>
          </section>

          {/* Learning Progress */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-black text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                학습 현황
              </h3>
              <button className="text-[12px] font-bold text-slate-400 hover:text-indigo-600">전체보기</button>
            </div>
            <div className="system-card p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-32 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-300">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md">수강 중</span>
                  <h4 className="text-[16px] font-black text-slate-900 truncate">재고관리 엑셀 정복하기 - 1강 개요</h4>
                </div>
                <div className="flex items-center justify-between text-[12px] text-slate-500 mb-2">
                  <span className="font-bold">진행도 65%</span>
                  <span>상태: 보통</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 w-[65%]" />
                </div>
              </div>
              <button className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap">
                학습 계속하기
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Profile Summary & Membership */}
        <div className="space-y-8">
          <section>
            <h3 className="text-[15px] font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
              멤버십 현황
            </h3>
            <div className="system-card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-black">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[15px] font-black text-slate-900 leading-tight truncate">{user.name || '사용자'}님</h4>
                  <p className="text-[12px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500 font-bold">현재 플랜</span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${
                    isExpired ? 'bg-rose-50 text-rose-600' : 'bg-slate-900 text-white'
                  }`}>
                    {planName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500 font-bold">만료 예정일</span>
                  <span className="text-slate-900 font-bold">
                    {planState?.expiresAt ? new Date(planState.expiresAt).toLocaleDateString() : '영구 무제한'}
                  </span>
                </div>
                {daysLeft !== null && (
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">남은 기간</span>
                      <span className={`text-[12px] font-black ${daysLeft <= 7 ? 'text-rose-500' : 'text-indigo-600'}`}>{daysLeft}일 남음</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${daysLeft <= 7 ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={onGoToPricing}
                className="w-full mt-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                멤버십 관리 및 연장
              </button>
            </div>
          </section>

          {/* Quick Help */}
          <div className="system-card p-6 bg-gradient-to-br from-slate-50 to-indigo-50/30">
            <h4 className="text-[14px] font-black text-slate-900 mb-2">무엇을 도와드릴까요?</h4>
            <p className="text-[12px] text-slate-500 mb-4 leading-relaxed">자주 묻는 질문을 확인하거나 전문가에게 상담을 신청하세요.</p>
            <div className="grid grid-cols-1 gap-2">
              <button className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-100 text-[12px] font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-all">
                <span>자주 묻는 질문 (FAQ)</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
              <button
                onClick={onGoToContact}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-100 text-[12px] font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-all"
              >
                <span>1:1 상담하기</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ServicesTab ───────────────────────────────────────────────────────────────

function ServicesTab({ courses, loading, cart, onAddToCart, onRemoveFromCart, onOpenCheckout, onClearCart, onGoToContact }: {
  courses: CourseWithSeasons[];
  loading: boolean;
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onRemoveFromCart: (id: string) => void;
  onOpenCheckout: () => void;
  onClearCart: () => void;
  onGoToContact: () => void;
}) {
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;

  return (
    <div className="space-y-10 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-black text-slate-900 mb-1">강의 카탈로그</h2>
          <p className="text-[14px] text-slate-500">실무 전문가가 전하는 병원 운영의 핵심 인사이트</p>
        </div>
        {cart.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 animate-pulse-soft">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="text-[13px] font-black text-indigo-700">{cart.length}개 선택됨</span>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <section className="grid grid-cols-1 xl:grid-cols-[1.65fr,0.95fr] gap-6">
          <div className="system-card overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-black text-slate-900">장바구니</h3>
                <p className="text-[12px] text-slate-500 mt-1">결제 전에 강의와 기수를 한 번 더 확인해 주세요.</p>
              </div>
              <button
                type="button"
                onClick={onClearCart}
                className="px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-black text-slate-500 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500 transition-colors"
              >
                전체 비우기
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {cart.map((item) => (
                <div key={item.id} className="px-6 py-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-slate-900 truncate">{item.name}</p>
                    <p className="text-[12px] font-bold text-indigo-600 mt-1">{item.subLabel}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[14px] font-black text-slate-900">{formatPrice(item.price)}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveFromCart(item.id)}
                      className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      aria-label={`${item.name} 장바구니에서 제거`}
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="system-card p-6 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.28),transparent_45%)]" />
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-[11px] font-black text-indigo-200 uppercase tracking-[0.24em] mb-2">Order Summary</p>
                <h3 className="text-[21px] font-black leading-tight">선택한 강의를 한 번에 결제합니다.</h3>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>선택 강의</span>
                  <span className="font-black text-white">{cart.length}건</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>상품 합계</span>
                  <span className="font-black text-white">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>부가세 (10%)</span>
                  <span className="font-black text-white">{formatPrice(vat)}</span>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-end justify-between">
                  <span className="text-[13px] font-black text-slate-200">최종 결제 금액</span>
                  <span className="text-[28px] font-black tracking-tight">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenCheckout}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-white text-slate-900 font-black text-[15px] hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                결제하러 가기
              </button>

              <p className="text-[11px] leading-relaxed text-slate-300">
                결제가 완료되면 구매내역에 바로 반영되고, 다시보기 강의는 자동으로 강의 탭에서 열립니다.
              </p>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="system-card h-80 animate-pulse p-6">
              <div className="w-1/2 h-4 bg-slate-100 rounded-md mb-4" />
              <div className="w-full h-8 bg-slate-100 rounded-lg mb-6" />
              <div className="w-full h-20 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="system-card p-20 text-center border-dashed border-2">
          <p className="text-slate-400 font-bold">오픈된 강의가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const bestSeason = getBestOpenSeason(course.course_seasons);
            const inCart = bestSeason ? cart.some(c => c.id === bestSeason.id) : false;

            return (
              <div key={course.id} className="system-card system-card-hover flex flex-col h-full overflow-hidden">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    {course.hero_badge ? (
                      <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black rounded uppercase tracking-wider">
                        {course.hero_badge}
                      </span>
                    ) : <div />}
                    {bestSeason && (
                      <div className="text-right">
                        {bestSeason.original_price_krw && bestSeason.original_price_krw > bestSeason.price_krw && (
                          <span className="block text-[11px] text-slate-400 line-through mb-0.5">{formatPrice(bestSeason.original_price_krw)}</span>
                        )}
                        <span className="text-[17px] font-black text-slate-900">
                          {bestSeason.price_krw === 0 ? 'FREE' : formatPrice(bestSeason.price_krw)}
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-[17px] font-black text-slate-900 leading-tight mb-3 group-hover:text-indigo-600 transition-colors">
                    {course.title}
                  </h3>
                  
                  {course.short_description && (
                    <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-3 mb-6">
                      {course.short_description}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                    <span className="text-[12px] font-bold text-slate-700">{course.instructor_name || 'DenJOY Team'}</span>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  {bestSeason ? (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bestSeason.season_label || `${bestSeason.season_number}기`}</p>
                        <p className={`text-[11px] font-black ${bestSeason.status === 'open' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {bestSeason.status === 'open' ? '수강 가능' : '오픈 대기'}
                        </p>
                      </div>
                      {bestSeason.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => inCart
                            ? onRemoveFromCart(bestSeason.id)
                            : onAddToCart({
                                id: bestSeason.id,
                                name: course.title,
                                subLabel: bestSeason.season_label || `${bestSeason.season_number}기`,
                                price: bestSeason.price_krw,
                              })
                          }
                          className={`px-4 py-2 rounded-lg text-[13px] font-black transition-all ${
                            inCart
                              ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10'
                          }`}
                        >
                          {inCart ? '취소' : '신청'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[12px] font-bold text-slate-400 italic">준비 중...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="system-card p-8 bg-slate-900 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px]" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-black rounded uppercase tracking-widest border border-white/20 mb-4 inline-block">B2B Solutions</span>
            <h3 className="text-[20px] font-black text-white mb-2">병원 맞춤형 경영 컨설팅 & 벌크 수강</h3>
            <p className="text-slate-400 text-sm leading-relaxed">우리 병원 구성원 공동 수강 및 시스템 배포 솔루션이 필요하신가요? 전문가 팀이 직접 찾아가 병원의 운영 체계를 혁신해 드립니다.</p>
          </div>
          <button onClick={onGoToContact} className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black text-sm hover:bg-slate-50 transition-all shrink-0">
            상담 및 대량 구매 문의
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PurchasesTab ─────────────────────────────────────────────────────────────

function PurchasesTab({ records, loading }: {
  records: BillingRecord[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="system-card p-6 animate-pulse flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-5 bg-slate-100 rounded-lg w-32" />
              <div className="h-3 bg-slate-100 rounded w-20" />
            </div>
            <div className="h-6 bg-slate-100 rounded-lg w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="system-card p-20 text-center border-dashed border-2">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.112 16.835a.75.75 0 0 1-.747.808H4.03a.75.75 0 0 1-.747-.808l1.112-16.835a.75.75 0 0 1 .747-.808h14.052a.75.75 0 0 1 .747.808Z" />
          </svg>
        </div>
        <p className="text-[16px] font-bold text-slate-400">결제 내역이 존재하지 않습니다.</p>
        <p className="text-[14px] text-slate-300 mt-2">덴조이와 함께 스마트한 병원 운영을 시작해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-[15px] font-black text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
          결제 내역 및 증빙
        </h2>
        <p className="text-[12px] text-slate-400">최근 1년 내역이 표시됩니다</p>
      </div>
      
      <div className="space-y-3">
        {records.map(record => {
          const display = buildBillingDisplayModel(record);
          const status = STATUS_STYLE[record.payment_status] ?? { text: record.payment_status, cls: 'bg-slate-50 text-slate-500' };
          const isExpanded = expanded === record.id;
          const hasSecondaryLabel = display.productLabel !== display.title;
          const displaySupplyAmount = display.breakdown.supplyAmount ?? Math.round(Number(record.amount) / 1.1);
          const displayVatAmount = display.breakdown.vatAmount ?? (Number(record.amount) - displaySupplyAmount);
          const displayPaidAmount = display.breakdown.payableAmount ?? Number(record.amount);
          const refundAmount = display.breakdown.refundAmount;
          const creditRestoreAmount = display.breakdown.creditRestoreAmount;
          const netPaidAmount = Math.max(0, displayPaidAmount - refundAmount);

          return (
            <div key={record.id} className="system-card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : record.id)}
                className="w-full text-left p-6 flex items-center gap-6 group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125-1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[15px] font-black text-slate-900 truncate tracking-tight">
                      {display.title}
                    </p>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${status.cls}`}>
                      {status.text}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 font-bold">{formatDate(record.created_at)} · {record.id.slice(0, 8).toUpperCase()}</p>
                  {hasSecondaryLabel && (
                    <p className="text-[12px] text-slate-500 mt-1 truncate">{display.productLabel}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[16px] font-black text-slate-900">
                    {refundAmount > 0 ? (
                      <span className="text-rose-600">-{formatPrice(refundAmount)}</span>
                    ) : formatPrice(Number(record.amount))}
                  </p>
                  {creditRestoreAmount > 0 && (
                    <p className="text-[11px] font-bold text-teal-600 mt-1">+크레딧 {formatPrice(creditRestoreAmount)} 복구</p>
                  )}
                </div>

                <div className={`w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180 bg-slate-100 text-indigo-600' : 'text-slate-400'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-8 pb-8 pt-6 border-t border-slate-50 bg-slate-50/20">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <DetailBlock label="영수증 번호" value={record.id.toUpperCase()} mono />
                    <DetailBlock label="결제 일시" value={new Date(record.created_at).toLocaleString('ko-KR')} />
                    <DetailBlock label="결제 수단" value={display.paymentMethodLabel} />
                    <DetailBlock label="현재 상태" value={status.text} />
                  </div>
                  
                  <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-3 shadow-sm shadow-slate-200/50">
                    {display.items.length > 0 && (
                      <div className="pb-3 mb-3 border-b border-slate-100">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">주문 항목</p>
                        <div className="space-y-2">
                          {display.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4 text-[13px]">
                              <span className="font-bold text-slate-700 truncate">{item.name}</span>
                              <span className="font-black text-slate-900 shrink-0">{formatPrice(item.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-slate-500 font-bold">공급가액</span>
                      <span className="text-slate-900 font-bold">{formatPrice(displaySupplyAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-slate-500 font-bold">부가세 (10%)</span>
                      <span className="text-slate-900 font-bold">{formatPrice(displayVatAmount)}</span>
                    </div>
                    {display.breakdown.couponDiscountAmount > 0 && (
                      <div className="flex justify-between items-center text-[13px] text-emerald-600">
                        <span className="font-bold">쿠폰 할인</span>
                        <span className="font-bold">-{formatPrice(display.breakdown.couponDiscountAmount)}</span>
                      </div>
                    )}
                    {display.breakdown.upgradeCreditAmount > 0 && (
                      <div className="flex justify-between items-center text-[13px] text-violet-600">
                        <span className="font-bold">업그레이드 크레딧</span>
                        <span className="font-bold">-{formatPrice(display.breakdown.upgradeCreditAmount)}</span>
                      </div>
                    )}
                    {display.breakdown.creditUsedAmount > 0 && (
                      <div className="flex justify-between items-center text-[13px] text-teal-600">
                        <span className="font-bold">보유 크레딧 사용</span>
                        <span className="font-bold">-{formatPrice(display.breakdown.creditUsedAmount)}</span>
                      </div>
                    )}
                    {refundAmount > 0 && (
                      <div className="flex justify-between items-center text-[13px] text-rose-500 pt-2 border-t border-slate-50">
                        <span className="font-bold">환불 금액</span>
                        <span className="font-bold">-{formatPrice(refundAmount)}</span>
                      </div>
                    )}
                    {creditRestoreAmount > 0 && (
                      <div className="flex justify-between items-center text-[13px] text-teal-600">
                        <span className="font-bold">복구 크레딧</span>
                        <span className="font-bold">+{formatPrice(creditRestoreAmount)}</span>
                      </div>
                    )}
                    {display.breakdown.totalRecoveryAmount > 0 && (
                      <div className="flex justify-between items-center text-[13px] text-violet-600 pt-2 border-t border-slate-50">
                        <span className="font-bold">총 회수 가치</span>
                        <span className="font-bold">{formatPrice(display.breakdown.totalRecoveryAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100">
                      <span className="text-slate-900 font-black text-[15px]">최종 현금 결제액</span>
                      <span className="text-indigo-600 font-black text-[18px]">
                        {formatPrice(netPaidAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-[13px] font-bold text-slate-700 ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}

// ── SettingsTab ───────────────────────────────────────────────────────────────

function SettingsTab({ user, planState, onGoToPricing, onGoToContact, onProfileClick, onLogout }: {
  user: User;
  planState: HospitalPlanState | null;
  onGoToPricing: () => void;
  onGoToContact: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-8 max-w-4xl">
      <section>
        <h3 className="text-[15px] font-black text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
          계정 프로필
        </h3>
        <div className="system-card p-8 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <button onClick={onProfileClick} className="relative group shrink-0">
            <div className="w-24 h-24 rounded-[32px] bg-slate-100 flex items-center justify-center text-3xl font-black text-slate-400 transition-all group-hover:bg-slate-200">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              </svg>
            </div>
          </button>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-[22px] font-black text-slate-900 mb-1">{user.name || '사용자'}님</h4>
            <p className="text-[14px] text-slate-500 mb-6">{user.email}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <button onClick={onProfileClick} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-[13px] text-slate-600 hover:bg-slate-50 transition-all">프로필 수정</button>
              <button disabled className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-[13px] text-slate-400 cursor-not-allowed">비밀번호 변경</button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-[15px] font-black text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
          구독 및 지원
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="system-card p-6 flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-2.123-7.946c-.03 0-.06.002-.09.006a12.055 12.055 0 0 1-2.107 4.561 12.055 12.055 0 0 1-4.561 2.107c.004.03.006.06.006.09a4.125 4.125 0 0 0-7.946-2.123 9.337 9.337 0 0 0-.952 4.121 9.38 9.38 0 0 0 .372 2.625m9.128-9.128a9.38 9.38 0 0 1 2.625.372 9.337 9.337 0 0 1 4.121-.952 4.125 4.125 0 0 1-2.123-7.946c-.03 0-.06.002-.09.006a12.055 12.055 0 0 0-2.107 4.561 12.055 12.055 0 0 0-4.561 2.107c.004-.03.006-.06.006-.09a4.125 4.125 0 0 1-7.946 2.123 9.337 9.337 0 0 1-.952-4.121 9.38 9.38 0 0 1 .372-2.625" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-black text-slate-900 mb-0.5">요금제 플랜</p>
                <p className="text-[12px] text-slate-500">{planState ? PLAN_NAMES[planState.plan] : 'Free'} Membership</p>
              </div>
            </div>
            <button onClick={onGoToPricing} className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">업그레이드</button>
          </div>

          <div className="system-card p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black text-slate-900 mb-0.5">고객 지원 센터</p>
              <button onClick={onGoToContact} className="text-[12px] text-indigo-600 font-bold hover:underline">1:1 실시간 문의하기</button>
            </div>
          </div>
        </div>
      </section>

      <div className="pt-12 text-center">
        <p className="text-[11px] text-slate-400 font-bold mb-4 italic">"치과 디지털 전환의 파트너, 덴조이가 함께합니다."</p>
        <button
          onClick={onLogout}
          className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-500 font-bold text-[13px] hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 transition-all"
        >
          안전하게 로그아웃
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS: { id: MyPageTab; label: string }[] = [
  { id: 'home',      label: '홈' },
  { id: 'services',  label: '서비스' },
  { id: 'lectures',  label: '강의' },
  { id: 'purchases', label: '구매내역' },
  { id: 'settings',  label: '설정' },
];

const MyPage: React.FC<MyPageProps> = ({
  user,
  hospitalName,
  planState,
  onGoToDashboard,
  onGoToInventoryHome,
  onGoToPricing,
  onGoToContact,
  onProfileClick,
  onLogout,
}) => {
  // Restore tab from sessionStorage (e.g. after service payment redirect)
  const [activeTab, setActiveTab] = useState<MyPageTab>(() => {
    try {
      const saved = sessionStorage.getItem('_myPageTab') as MyPageTab | null;
      if (saved && TABS.some(t => t.id === saved)) {
        sessionStorage.removeItem('_myPageTab');
        return saved;
      }
    } catch { /* private mode */ }
    return 'home';
  });

  const [cart, setCart] = useState<CartItem[]>(() => readStoredCart(user.id));
  const [showCheckout, setShowCheckout] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  const [courses, setCourses] = useState<CourseWithSeasons[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesResolved, setCoursesResolved] = useState(false);

  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);

  // Fetch courses on 'services' tab activation
  useEffect(() => {
    if (activeTab !== 'services' || courses.length > 0) return;
    setCoursesLoading(true);
    setCoursesResolved(false);
    supabase
      .from('course_topics')
      .select(`
        id, slug, title, category, short_description, hero_badge, instructor_name, instructor_role,
        course_seasons(id, topic_id, season_number, season_label, start_date, end_date, price_krw, original_price_krw, status, capacity, is_featured)
      `)
      .eq('is_published', true)
      .order('sort_order')
      .then(({ data }) => {
        setCourses((data as CourseWithSeasons[]) ?? []);
        setCoursesLoading(false);
        setCoursesResolved(true);
      });
  }, [activeTab, courses.length]);

  // Fetch billing history on 'purchases' tab activation
  useEffect(() => {
    if (activeTab !== 'purchases' || billingRecords.length > 0) return;
    setBillingLoading(true);
    supabase
      .rpc('get_billing_history', { p_hospital_id: user.hospitalId })
      .then(({ data }) => {
        setBillingRecords((data as BillingRecord[]) ?? []);
        setBillingLoading(false);
      });
  }, [activeTab, user.hospitalId, billingRecords.length]);

  useEffect(() => {
    setCart(readStoredCart(user.id));
    setShowCheckout(false);
    setPayError(null);
    setCartNotice(null);
    setCoursesResolved(false);
  }, [user.id]);

  useEffect(() => {
    writeStoredCart(user.id, cart);
  }, [user.id, cart]);

  useEffect(() => {
    if (!coursesResolved) return;

    setCart((prev) => {
      const reconciled = reconcileCartItems(prev, courses);
      const isSame =
        reconciled.items.length === prev.length &&
        reconciled.items.every((item, index) => {
          const current = prev[index];
          return current &&
            current.id === item.id &&
            current.name === item.name &&
            current.subLabel === item.subLabel &&
            current.price === item.price;
        });

      if (isSame) return prev;

      if (reconciled.removedCount > 0) {
        setCartNotice(`판매 중이 아닌 ${reconciled.removedCount}개 항목을 장바구니에서 제외했습니다.`);
      } else if (reconciled.updatedCount > 0) {
        setCartNotice('장바구니 가격 또는 기수 정보가 최신 상태로 갱신되었습니다.');
      }

      return reconciled.items;
    });
  }, [courses, coursesResolved]);

  useEffect(() => {
    if (!cartNotice) return;
    const timer = window.setTimeout(() => setCartNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [cartNotice]);

  useEffect(() => {
    if (showCheckout && cart.length === 0) {
      setShowCheckout(false);
    }
  }, [showCheckout, cart.length]);

  const addToCart = useCallback((item: CartItem) => {
    setCartNotice(null);
    setPayError(null);
    setCart(prev => prev.some(i => i.id === item.id) ? prev : [...prev, item]);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCartNotice(null);
  }, []);

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return;
    if (coursesLoading) {
      setPayError('강의 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    const reconciled = reconcileCartItems(cart, courses);
    if (reconciled.items.length !== cart.length) {
      setCart(reconciled.items);
      setCartNotice(
        reconciled.items.length > 0
          ? `결제 가능한 ${reconciled.items.length}개 항목만 남기고 장바구니를 정리했습니다.`
          : '판매 가능한 강의가 없어 장바구니를 비웠습니다.',
      );
    } else if (reconciled.updatedCount > 0) {
      setCart(reconciled.items);
      setCartNotice('최신 가격 기준으로 주문 금액을 다시 계산했습니다.');
    }

    if (reconciled.items.length === 0) {
      setPayError('장바구니에 바로 결제 가능한 강의가 없습니다.');
      return;
    }

    setPaying(true);
    setPayError(null);

    const result = await tossPaymentService.requestCartPayment({
      hospitalId: user.hospitalId,
      customerName: user.name || '',
      cartStorageKey: getCartStorageKey(user.id),
      items: reconciled.items.map(i => ({ id: i.id, name: i.name, price: i.price })),
    });

    setPaying(false);
    if (result.completed) {
      clearCart();
      setShowCheckout(false);
      setActiveTab('lectures');
      setCartNotice('무료 강의 신청이 완료되었습니다. 강의 탭에서 바로 확인할 수 있습니다.');
      return;
    }
    if (result.error && result.error !== 'user_cancel') {
      setPayError(result.error);
    }
    // On success, page redirects — this code won't execute
  }, [cart, courses, coursesLoading, clearCart, user]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden dashboard-bg font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 shrink-0 border-r border-slate-800">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.112 16.835a.75.75 0 0 1-.747.808H4.03a.75.75 0 0 1-.747-.808l1.112-16.835a.75.75 0 0 1 .747-.808h14.052a.75.75 0 0 1 .747.808Z" />
              </svg>
            </div>
            <span className="text-white font-black text-[15px] tracking-tight">DenJOY</span>
          </div>

          <nav className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-3">마이 메뉴</p>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('home')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H18a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
                  </svg>
                  <span>대시보드 홈</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-3">교육 및 서비스</p>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('services')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    activeTab === 'services' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                  </svg>
                  <span>서비스 구매</span>
                </button>
                <button
                  onClick={() => setActiveTab('lectures')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    activeTab === 'lectures' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span>동영상 강의</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-3">설정</p>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('purchases')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    activeTab === 'purchases' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75-3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V14.25" />
                  </svg>
                  <span>구매 내역</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.127c-.332.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <span>설정</span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Dashboard Header Bar */}
        <header className="dashboard-header shrink-0 px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-xs font-bold font-mono">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
            </span>
            <div className="w-px h-3 bg-slate-200" />
            <h1 className="text-[17px] font-black text-slate-900 tracking-tight">
              {activeTab === 'home' && '대시보드 홈'}
              {activeTab === 'services' && '서비스 및 강의 구매'}
              {activeTab === 'lectures' && '동영상 강의'}
              {activeTab === 'purchases' && '구매 내역'}
              {activeTab === 'settings' && '설정'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase tracking-widest">
                {planState ? PLAN_NAMES[planState.plan] : 'Free'} Plan
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black text-emerald-700">시스템 정상</span>
              </div>
            </div>
            
            <div className="w-px h-6 bg-slate-200 hidden sm:block" />

            <button
              onClick={onProfileClick}
              className="flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[13px] font-black shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-[13px] font-black text-slate-900 leading-tight">{user.name || '사용자'}님</p>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">프로필 관리</span>
              </div>
            </button>
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {activeTab === 'home' && (
              <HomeTab
                user={user}
                hospitalName={hospitalName}
                planState={planState}
                onGoToDashboard={onGoToDashboard}
                onGoToInventoryHome={onGoToInventoryHome}
                onGoToPricing={onGoToPricing}
                onGoToContact={onGoToContact}
              />
            )}
            {activeTab === 'services' && (
              <ServicesTab
                courses={courses}
                loading={coursesLoading}
                cart={cart}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                onOpenCheckout={() => setShowCheckout(true)}
                onClearCart={clearCart}
                onGoToContact={onGoToContact}
              />
            )}
            {activeTab === 'lectures' && (
              <div className="space-y-8">
                <CourseLectureReplay userId={user.id} />
              </div>
            )}
            {activeTab === 'purchases' && (
              <PurchasesTab records={billingRecords} loading={billingLoading} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                user={user}
                planState={planState}
                onGoToPricing={onGoToPricing}
                onGoToContact={onGoToContact}
                onProfileClick={onProfileClick}
                onLogout={onLogout}
              />
            )}
          </div>
        </div>

        {/* Floating Cart Bar (for Shop tab) */}
        {activeTab === 'services' && (
          <CartBar items={cart} onOpen={() => setShowCheckout(true)} />
        )}
      </main>

      {/* Global Modals */}
      {showCheckout && (
        <CheckoutModal
          items={cart}
          onClose={() => setShowCheckout(false)}
          onPay={handleCheckout}
          paying={paying}
          onRemove={removeFromCart}
        />
      )}

      {/* Pay error toast */}
      {payError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] px-4 py-3 rounded-xl shadow-xl max-w-sm w-full mx-4 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="text-rose-400 shrink-0 font-black">!</span>
            <p className="font-medium">{payError}</p>
            <button type="button" onClick={() => setPayError(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {cartNotice && (
        <div className="fixed bottom-24 right-6 z-50 bg-white border border-indigo-100 text-slate-700 text-[13px] px-4 py-3 rounded-2xl shadow-xl max-w-sm w-[calc(100%-3rem)] animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="text-indigo-600 shrink-0 font-black">i</span>
            <p className="font-medium leading-relaxed">{cartNotice}</p>
            <button type="button" onClick={() => setCartNotice(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;
