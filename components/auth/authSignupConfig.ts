import { PlanType } from '../../types';

export const SIGNUP_PLANS: { key: PlanType; label: string; tag?: string; price: string; summary: string; trial: boolean }[] = [
  { key: 'free', label: 'Free', price: '무료', summary: '재고 100개 · 1인 · 3개월 기록', trial: false },
  { key: 'basic', label: 'Basic', tag: '팀용', price: '29,000원/월', summary: '재고 200개 · 3인 · 6개월 기록', trial: true },
  { key: 'plus', label: 'Plus', tag: '추천', price: '69,000원/월', summary: '재고 500개 · 5인 · 12개월 기록', trial: true },
  { key: 'business', label: 'Business', tag: '기업용', price: '129,000원/월', summary: '재고 무제한 · 인원 무제한 · 24개월', trial: true },
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
