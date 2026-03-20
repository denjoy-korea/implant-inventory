import React from 'react';
import ModalShell from '../shared/ModalShell';
import { StockCalcSettings, DEFAULT_STOCK_CALC_SETTINGS } from '../../services/hospitalSettingsService';

interface Props {
  onClose: () => void;
  localCalcSettings: StockCalcSettings;
  setLocalCalcSettings: React.Dispatch<React.SetStateAction<StockCalcSettings>>;
  calcSettingsSaved: boolean;
  calcSettingsChanged: boolean;
  isSavingCalcSettings: boolean;
  onSave: () => void;
}

const StockCalcSettingsModal: React.FC<Props> = ({
  onClose, localCalcSettings, setLocalCalcSettings,
  calcSettingsSaved, calcSettingsChanged, isSavingCalcSettings, onSave,
}) => (
  <ModalShell isOpen={true} onClose={onClose} title="권장재고 산출 설정" titleId="stock-calc-title" maxWidth="max-w-md">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 id="stock-calc-title" className="text-base font-bold text-slate-900">권장재고 산출 설정</h3>
          <p className="text-xs text-slate-500">변경 즉시 전체 재고 권장량이 재계산됩니다</p>
        </div>
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 내용 */}
      <div className="px-6 py-5 space-y-5">
        {/* 급증일 안전재고 배수 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-700">급증일 안전재고 배수</label>
            <span className="text-xs text-slate-400">현재: <span className="font-bold text-slate-600">{localCalcSettings.safetyMultiplier}×</span></span>
          </div>
          <p className="text-xs text-slate-500 mb-3">일일 최대 사용량에 곱하는 안전재고 계수. 값이 클수록 보수적으로 재고를 유지합니다.</p>
          <div className="flex flex-wrap gap-2 mb-2.5">
            {[1.5, 2, 2.5, 3, 3.5, 4].map(v => (
              <div key={v} className="relative pt-2">
                {v === DEFAULT_STOCK_CALC_SETTINGS.safetyMultiplier && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-emerald-500 text-white rounded-full px-1.5 py-0.5 whitespace-nowrap z-10 leading-none">권장</span>
                )}
                <button
                  onClick={() => setLocalCalcSettings(s => ({ ...s, safetyMultiplier: v }))}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    localCalcSettings.safetyMultiplier === v
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {v}×
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            {localCalcSettings.safetyMultiplier === 1.5
              ? '⚠️ 재고 비용은 줄어들지만, 수술량 급증 시 품절 위험이 높아집니다.'
              : localCalcSettings.safetyMultiplier === 2
              ? '✅ 치과 평균 변동성을 고려한 균형점입니다. 대부분 환경에 적합합니다.'
              : localCalcSettings.safetyMultiplier === 2.5
              ? '수술량 변동이 큰 경우 안정적입니다. 재고가 다소 늘어납니다.'
              : localCalcSettings.safetyMultiplier === 3
              ? '품절 위험이 낮아지지만 과잉재고 가능성이 있습니다.'
              : localCalcSettings.safetyMultiplier === 3.5
              ? '매우 보수적입니다. 재고 비용이 상당히 늘어날 수 있습니다.'
              : '최대 안전재고 수준으로 재고 비용이 크게 증가합니다.'}
          </p>
        </div>

        {/* 추세 반영 상한 */}
        <div className="py-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">추세 반영 상한</p>
              <p className="text-xs text-slate-500 mt-0.5">트렌드 상승 반영 최대 배수 (110%~150%)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocalCalcSettings(s => ({ ...s, trendCeiling: Math.max(s.trendFloor + 0.05, +(s.trendCeiling - 0.05).toFixed(2)) }))}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-base transition-colors flex items-center justify-center"
              >−</button>
              <div className="w-14 text-center">
                <span className="text-sm font-bold text-slate-700">{Math.round(localCalcSettings.trendCeiling * 100)}%</span>
                {localCalcSettings.trendCeiling === DEFAULT_STOCK_CALC_SETTINGS.trendCeiling && (
                  <span className="block text-[9px] font-bold text-emerald-600 leading-none mt-0.5">권장값</span>
                )}
              </div>
              <button
                onClick={() => setLocalCalcSettings(s => ({ ...s, trendCeiling: Math.min(1.5, +(s.trendCeiling + 0.05).toFixed(2)) }))}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-base transition-colors flex items-center justify-center"
              >+</button>
            </div>
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mt-2">
            {localCalcSettings.trendCeiling <= 1.1
              ? '상승 추세를 거의 반영하지 않아 권장량이 매우 보수적으로 유지됩니다.'
              : localCalcSettings.trendCeiling <= 1.15
              ? '상승 추세를 최소한으로 반영합니다. 권장량 변화가 적습니다.'
              : localCalcSettings.trendCeiling <= 1.2
              ? '상승 추세를 절제하여 반영합니다.'
              : localCalcSettings.trendCeiling <= 1.25
              ? '✅ 일시적 급증에 대응하면서도 과잉재고를 막는 권장 수준입니다.'
              : localCalcSettings.trendCeiling <= 1.35
              ? '상승 추세를 적극 반영하여 권장량이 늘어납니다.'
              : '상승 추세를 최대로 반영합니다. 급증 구간에 권장량이 크게 증가합니다.'}
          </p>
        </div>

        {/* 추세 반영 하한 */}
        <div className="py-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">추세 반영 하한</p>
              <p className="text-xs text-slate-500 mt-0.5">트렌드 하락 반영 최소 배수 (50%~95%)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocalCalcSettings(s => ({ ...s, trendFloor: Math.max(0.5, +(s.trendFloor - 0.05).toFixed(2)) }))}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-base transition-colors flex items-center justify-center"
              >−</button>
              <div className="w-14 text-center">
                <span className="text-sm font-bold text-slate-700">{Math.round(localCalcSettings.trendFloor * 100)}%</span>
                {localCalcSettings.trendFloor === DEFAULT_STOCK_CALC_SETTINGS.trendFloor && (
                  <span className="block text-[9px] font-bold text-emerald-600 leading-none mt-0.5">권장값</span>
                )}
              </div>
              <button
                onClick={() => setLocalCalcSettings(s => ({ ...s, trendFloor: Math.min(s.trendCeiling - 0.05, +(s.trendFloor + 0.05).toFixed(2)) }))}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-base transition-colors flex items-center justify-center"
              >+</button>
            </div>
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mt-2">
            {localCalcSettings.trendFloor <= 0.6
              ? '하락 추세를 강하게 반영합니다. 사용량 감소 시 권장량이 크게 줄어듭니다.'
              : localCalcSettings.trendFloor <= 0.7
              ? '하락 추세를 적극 반영합니다. 권장량이 눈에 띄게 감소할 수 있습니다.'
              : localCalcSettings.trendFloor <= 0.75
              ? '하락 추세를 적절히 반영합니다.'
              : localCalcSettings.trendFloor <= 0.8
              ? '✅ 일시적 사용량 감소에도 권장량을 적절히 보호하는 권장 수준입니다.'
              : localCalcSettings.trendFloor <= 0.9
              ? '하락 추세를 약하게 반영하여 권장량 변동이 줄어듭니다.'
              : '하락 추세를 거의 무시합니다. 사용량이 줄어도 권장량이 유지됩니다.'}
          </p>
        </div>
      </div>

      {/* 푸터 */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
        {calcSettingsSaved ? (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            저장되었습니다
          </span>
        ) : (
          <span className="text-xs text-slate-400">
            {calcSettingsChanged ? '변경사항이 있습니다' : '현재 저장된 설정입니다'}
          </span>
        )}
        <button
          onClick={onSave}
          disabled={isSavingCalcSettings || !calcSettingsChanged}
          className="px-5 py-2 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
        >
          {isSavingCalcSettings ? '저장 중...' : '저장'}
        </button>
      </div>
  </ModalShell>
);

export default StockCalcSettingsModal;
