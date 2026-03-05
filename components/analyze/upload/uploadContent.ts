export interface AnalyzeUploadTrustItem {
  title: string;
  detail: string;
}

export const ANALYZE_UPLOAD_TRUST_ITEMS: AnalyzeUploadTrustItem[] = [
  { title: '전송 구간 암호화', detail: '업로드/전송은 HTTPS 암호화 채널로 처리됩니다.' },
  { title: '원본 파일 비저장', detail: '분석 파일은 브라우저 내에서 처리 후 저장되지 않습니다.' },
  { title: '처리 방식 투명성', detail: '진단 기준과 점수 계산 항목을 결과 화면에 함께 제공합니다.' },
];
