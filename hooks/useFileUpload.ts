import { useRef } from 'react';
import React from 'react';
import { AppState, ExcelRow, FailCandidate, PlanType, UploadType } from '../types';
import { surgeryService } from '../services/surgeryService';
import { planService } from '../services/planService';
import { operationLogService } from '../services/operationLogService';
import { failDetectionService } from '../services/failDetectionService';
import { dbToExcelRowBatch, fixIbsImplant } from '../services/mappers';
import { isIbsImplantManufacturer, toCanonicalSize } from '../services/sizeNormalizer';
import { notifyHospitalSlack } from '../services/hospitalSlackService';

type ToastType = 'success' | 'error' | 'info';

interface FileUploadDeps {
  hospitalBillingProgram: AppState['hospitalBillingProgram'];
  user: AppState['user'];
  surgeryMaster: AppState['surgeryMaster'];
  effectivePlan: PlanType;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showAlertToast: (msg: string, type: ToastType) => void;
  setPendingFailCandidates: (candidates: FailCandidate[]) => void;
}

export function useFileUpload({
  hospitalBillingProgram,
  user,
  surgeryMaster,
  effectivePlan,
  setState,
  showAlertToast,
  setPendingFailCandidates,
}: FileUploadDeps) {
  const uploadingTypeRef = useRef<UploadType | null>(null);

  const handleFileUpload = async (file: File, type: UploadType, sizeCorrections?: Map<string, string>): Promise<boolean> => {
    uploadingTypeRef.current = type;
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const billingProgram = hospitalBillingProgram ?? 'dentweb';
      if (billingProgram !== 'dentweb') {
        showAlertToast('현재 선택한 청구프로그램의 업로드 로직은 준비 중입니다. 덴트웹 설정 후 이용해 주세요.', 'info');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // 수술기록 업로드 빈도 제한 체크
      if (type === 'surgery' && user?.hospitalId) {
        const lastUpload = await surgeryService.getLastUploadDate(user.hospitalId);
        const uploadCheck = planService.canUploadSurgery(effectivePlan, lastUpload);
        if (!uploadCheck.allowed && uploadCheck.nextAvailableDate) {
          const nextDate = uploadCheck.nextAvailableDate;
          const formatted = `${nextDate.getFullYear()}년 ${nextDate.getMonth() + 1}월 ${nextDate.getDate()}일`;
          const planLabel = effectivePlan === 'free' ? '무료 플랜은 월 1회' : '주 1회';
          showAlertToast(`${planLabel} 수술기록 업로드가 가능합니다. 다음 업로드 가능일: ${formatted}`, 'error');
          setState(prev => ({ ...prev, isLoading: false }));
          return false;
        }
      }

      const { parseExcelFile } = await import('../services/excelService');
      const parsed = await parseExcelFile(file);
      if (type === 'surgery') {
        const targetSheetName = '수술기록지';
        const newSurgeryMaster = { ...surgeryMaster };

        if (parsed.sheets[targetSheetName]) {
          const originalSheet = parsed.sheets[targetSheetName];
          const cleanedRows: ExcelRow[] = originalSheet.rows.filter(row => {
            const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
            const contentCount = Object.values(row).filter(val => val !== null && val !== undefined && String(val).trim() !== "").length;
            return !isTotalRow && contentCount > 1;
          }).map(row => {
            const desc = String(row['수술기록'] || row['수술내용'] || row['픽스쳐'] || row['규격'] || row['품명'] || "");
            const toothStr = String(row['치아번호'] || "").trim();

            let quantity = 0;
            if (toothStr !== "") {
              quantity = toothStr.includes(',') ? toothStr.split(',').length : 1;
            } else if (desc !== "") {
              quantity = 1;
            }

            let classification = "식립";
            let manufacturer = "";
            let brand = "";
            let size = "";
            let boneQuality = "";
            let initialFixation = "";

            if (desc.includes('[GBR Only]')) classification = "골이식만";
            else if (desc.includes('수술중교환_') || desc.includes('수술중FAIL_')) classification = "수술중교환";
            else if (desc.includes('보험임플란트')) classification = "청구";

            if (classification === "골이식만") {
              const mMatch = desc.match(/\[(.*?)\]/);
              manufacturer = mMatch ? mMatch[1] : "GBR Only";
              const bMatch = desc.match(/\]\s*(G.*?\))/);
              brand = bMatch ? bMatch[1] : "";
            }
            else if (desc.includes('-')) {
              const mainParts = desc.split('-').map(p => p.trim());
              let rawM = mainParts[0];
              manufacturer = rawM.replace('수술중교환_', '').replace('수술중FAIL_', '').replace('보험임플란트', '').trim();
              if (manufacturer === "" && mainParts.length > 1) {
                manufacturer = mainParts[1];
              }

              const detailsStr = mainParts.slice(1).join('-');
              const slashSegments = detailsStr.split('/').map(s => s.trim());
              const brandSizeStr = slashSegments[0] || "";
              const sizeIndicatorMatch = brandSizeStr.match(/([DdLlMm]\:|[Φφ]|(?:\s|^)[DdLlMm]\s|(?:\s|^)\d)/);

              if (sizeIndicatorMatch && sizeIndicatorMatch.index !== undefined) {
                brand = brandSizeStr.substring(0, sizeIndicatorMatch.index).trim();
                size = brandSizeStr.substring(sizeIndicatorMatch.index).trim();
              } else {
                const fallbackMatch = brandSizeStr.match(/^([a-zA-Z\s\d-]+(?:\s[IVX]+)?)/);
                brand = fallbackMatch ? fallbackMatch[1].trim() : brandSizeStr;
                if (fallbackMatch) size = brandSizeStr.substring(fallbackMatch[0].length).trim();
              }

              if (manufacturer === "" || manufacturer === "보험임플란트") {
                manufacturer = brand;
              }

              // 골질/초기고정 파싱 (슬래시 구분)
              for (let i = 1; i < slashSegments.length; i++) {
                const seg = slashSegments[i];
                if (seg.startsWith('골질')) boneQuality = seg.replace('골질', '').trim();
                else if (seg.startsWith('초기고정')) initialFixation = seg.replace('초기고정', '').trim();
              }
            } else {
              manufacturer = desc.replace('보험임플란트', '').replace('수술중교환_', '').replace('수술중FAIL_', '').trim();
            }

            const fixedMfr = fixIbsImplant(manufacturer, brand);
            return {
              ...row,
              '구분': classification,
              '갯수': quantity,
              '제조사': fixedMfr.manufacturer,
              '브랜드': fixedMfr.brand,
              '규격(SIZE)': isIbsImplantManufacturer(fixedMfr.manufacturer) ? size : toCanonicalSize(size, fixedMfr.manufacturer),
              '골질': row['골질'] || boneQuality,
              '초기고정': row['초기고정'] || initialFixation,
            };
          });

          // Supabase에 수술기록 저장 (중복 자동 skip) — DB 결과 기반으로 UI 상태 업데이트
          if (user?.hospitalId) {
            const { records: savedRecords, inserted, skipped } = await surgeryService.bulkInsertFromExcel(cleanedRows, user.hospitalId);

            if (skipped > 0 && inserted === 0) {
              // 전부 중복 → UI에 아무것도 추가하지 않고 알림만
              showAlertToast(`이미 저장된 데이터입니다. (${skipped}건 중복 감지, 새로 저장된 건 없음)`, 'info');
              setState(prev => ({ ...prev, isLoading: false }));
              return true;
            }

            if (inserted > 0) {
              // DB에 실제 저장된 레코드만 UI에 반영
              const savedRows = await dbToExcelRowBatch(savedRecords);
              newSurgeryMaster[targetSheetName] = [
                ...(newSurgeryMaster[targetSheetName] || []),
                ...savedRows,
              ];
              setState(prev => ({
                ...prev,
                isLoading: false,
                surgeryFileName: file.name,
                surgeryMaster: newSurgeryMaster,
                dashboardTab: 'surgery_database',
              }));
              operationLogService.logOperation(
                'surgery_upload',
                `수술기록 ${inserted}건 저장${skipped > 0 ? `, ${skipped}건 중복 skip` : ''} (${file.name})`
              );
              notifyHospitalSlack(user.hospitalId, 'surgery_uploaded', {
                inserted,
                skipped,
                file_name: file.name,
              });
              // FAIL 자동 감지 (재식립)
              try {
                const failCandidates = await failDetectionService.detectReimplantationFails(
                  savedRecords,
                  user.hospitalId,
                );
                if (failCandidates.length > 0) {
                  setPendingFailCandidates(failCandidates);
                }
              } catch {
                // 감지 실패는 업로드 성공에 영향 없음
              }
              return true;
            }
            setState(prev => ({ ...prev, isLoading: false }));
            return false;
          } else {
            // 비로그인 상태: DB 저장 없이 로컬 상태만 (레거시 동작)
            newSurgeryMaster[targetSheetName] = [...(newSurgeryMaster[targetSheetName] || []), ...cleanedRows];
            setState(prev => ({ ...prev, isLoading: false, surgeryFileName: file.name, surgeryMaster: newSurgeryMaster, dashboardTab: 'surgery_database' }));
            return true;
          }
        } else {
          showAlertToast("'수술기록지' 시트를 찾을 수 없습니다.", 'error');
          setState(prev => ({ ...prev, isLoading: false }));
          return false;
        }
      } else {
        // 픽스쳐 데이터: IBS Implant 제조사/브랜드 교정 후 저장
        const fixedSheets = { ...parsed.sheets };
        Object.keys(fixedSheets).forEach(name => {
          fixedSheets[name] = {
            ...fixedSheets[name],
            rows: fixedSheets[name].rows.map(row => {
              const fixed = fixIbsImplant(
                String(row['제조사'] || row['Manufacturer'] || ''),
                String(row['브랜드'] || row['Brand'] || '')
              );
              const rawSize = String(
                row['규격(SIZE)'] ||
                row['규격'] ||
                row['사이즈'] ||
                row['Size'] ||
                row['size'] ||
                ''
              );
              return {
                ...row,
                '제조사': fixed.manufacturer,
                '브랜드': fixed.brand,
                '규격(SIZE)': sizeCorrections?.get(rawSize.trim()) ?? (isIbsImplantManufacturer(fixed.manufacturer) ? rawSize : toCanonicalSize(rawSize, fixed.manufacturer)),
              };
            }),
          };
        });
        const fixedParsed = { ...parsed, sheets: fixedSheets };
        const initialIndices: Record<string, Set<number>> = {};
        Object.keys(fixedParsed.sheets).forEach(name => {
          initialIndices[name] = new Set(fixedParsed.sheets[name].rows.map((_, i) => i));
        });
        setState(prev => ({ ...prev, isLoading: false, fixtureData: fixedParsed, fixtureFileName: file.name, selectedFixtureIndices: initialIndices, dashboardTab: 'fixture_edit' }));
        operationLogService.logOperation('raw_data_upload', `픽스쳐 데이터 업로드 (${file.name})`);
        return true;
      }
    } catch (error) {
      console.error('[useFileUpload] 엑셀 파일 처리 실패:', error);
      const errMsg = error instanceof Error ? error.message : '';
      const detail = errMsg.includes('timeout') ? ' (암호화 타임아웃)' : errMsg.includes('encrypt') ? ' (암호화 오류)' : '';
      showAlertToast(`엑셀 파일 처리에 실패했습니다.${detail} 다시 시도해 주세요.`, 'error');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    } finally {
      uploadingTypeRef.current = null;
    }
  };

  return { handleFileUpload, uploadingTypeRef };
}
