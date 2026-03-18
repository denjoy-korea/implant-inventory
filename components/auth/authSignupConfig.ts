import { PlanType, PLAN_LIMITS, PLAN_PRICING } from '../../types';

function buildPrice(plan: PlanType): string {
  const p = PLAN_PRICING[plan].monthlyPrice;
  return p === 0 ? '무료' : `${p.toLocaleString('ko-KR')}원/월`;
}

function buildSummary(plan: PlanType): string {
  const { maxItems, maxUsers, viewMonths } = PLAN_LIMITS[plan];
  const items = maxItems === Infinity ? '무제한' : `${maxItems}개`;
  const users = maxUsers === Infinity ? '무제한' : `${maxUsers}인`;
  return `재고 ${items} · ${users} · ${viewMonths}개월 조회`;
}

export const SIGNUP_PLANS: { key: PlanType; label: string; tag?: string; price: string; summary: string; trial: boolean }[] = [
  { key: 'free', label: 'Free', price: buildPrice('free'), summary: buildSummary('free'), trial: false },
  { key: 'basic', label: 'Basic', tag: '개인용', price: buildPrice('basic'), summary: buildSummary('basic'), trial: true },
  { key: 'plus', label: 'Plus', tag: '추천', price: buildPrice('plus'), summary: buildSummary('plus'), trial: true },
  { key: 'business', label: 'Business', tag: '기업용', price: buildPrice('business'), summary: buildSummary('business'), trial: true },
];

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
