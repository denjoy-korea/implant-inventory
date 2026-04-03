/**
 * BrandHeader — brand portal (홈, 회사소개, 솔루션, 교육, 블로그, 문의 등) 전용 헤더
 * 실제 구현은 components/home/HomepageHeader.tsx에 있으며, 이 파일은 semantic alias re-export입니다.
 * 추후 HomepageHeader.tsx를 이 파일로 완전 이전 시 import 경로를 업데이트하면 됩니다.
 */
export { default } from '../home/HomepageHeader';
export { default as BrandHeader } from '../home/HomepageHeader';
