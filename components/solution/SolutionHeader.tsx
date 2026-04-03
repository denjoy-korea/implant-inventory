/**
 * SolutionHeader — solution layer (inventory landing, pricing, value, etc.) 전용 헤더
 * 실제 구현은 components/Header.tsx에 있으며, 이 파일은 semantic alias re-export입니다.
 * 추후 Header.tsx를 이 파일로 완전 이전 시 import 경로를 업데이트하면 됩니다.
 */
export { default } from '../Header';
export { default as SolutionHeader } from '../Header';
