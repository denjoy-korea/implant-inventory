import React from 'react';

interface AnalyzeUsageHeaderProps {
  periodMonths: number;
}

const AnalyzeUsageHeader: React.FC<AnalyzeUsageHeaderProps> = ({ periodMonths }) => {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">수술 기록 분석 리포트</h2>
      <p className="text-slate-500 font-medium whitespace-pre-line">
        {`최근 ${periodMonths}개월간의 수술 데이터에서 파악된 임플란트 소모 및 사용 패턴입니다.\n정밀한 발주 시기 예측과 재고 최적화에 활용할 수 있습니다.`}
      </p>
    </div>
  );
};

export default AnalyzeUsageHeader;
