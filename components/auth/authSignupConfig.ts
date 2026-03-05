import { PlanType, PLAN_LIMITS } from '../../types';

function buildSummary(plan: PlanType): string {
  const { maxItems, maxUsers, retentionMonths } = PLAN_LIMITS[plan];
  const items = maxItems === Infinity ? '무제한' : `${maxItems}개`;
  const users = maxUsers === Infinity ? '무제한' : `${maxUsers}인`;
  return `재고 ${items} · ${users} · ${retentionMonths}개월 기록`;
}

export const SIGNUP_PLANS: { key: PlanType; label: string; tag?: string; price: string; summary: string; trial: boolean }[] = [
  { key: 'free', label: 'Free', price: '무료', summary: buildSummary('free'), trial: false },
  { key: 'basic', label: 'Basic', tag: '개인용', price: '29,000원/월', summary: buildSummary('basic'), trial: true },
  { key: 'plus', label: 'Plus', tag: '추천', price: '69,000원/월', summary: buildSummary('plus'), trial: true },
  { key: 'business', label: 'Business', tag: '기업용', price: '129,000원/월', summary: buildSummary('business'), trial: true },
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
