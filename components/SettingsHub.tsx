import React, { useState, useEffect } from 'react';
import { DashboardTab, PlanType, PlanFeature, PLAN_NAMES, DbResetRequest, DEFAULT_WORK_DAYS, VendorContact, MemberPermissions } from '../types';
import { StockCalcSettings, DEFAULT_STOCK_CALC_SETTINGS } from '../services/hospitalSettingsService';
import StockCalcSettingsModal from './settings/StockCalcSettingsModal';
import { planService } from '../services/planService';
import { resetService } from '../services/resetService';
import { hospitalService } from '../services/hospitalService';
import { integrationService } from '../services/integrationService';
import { dentwebAutomationService, DentwebAutomationState } from '../services/dentwebAutomationService';
import { WorkDaySelector } from './WorkDaySelector';
import { useToast } from '../hooks/useToast';
import ConfirmModal from './ConfirmModal';
import VendorManagementModal from './settings/VendorManagementModal';
import DataResetRequestModal from './settings/DataResetRequestModal';
import DentwebAutomationModal from './settings/DentwebAutomationModal';
import WorkDaysSettingsSection from './settings/WorkDaysSettingsSection';
import DataResetDangerSection from './settings/DataResetDangerSection';
import { lazyWithRetry } from '../utils/lazyWithRetry';
const IntegrationManager = lazyWithRetry(() => import('./IntegrationManager'));

interface SettingsHubProps {
  onNavigate: (tab: DashboardTab) => void;
  isMaster: boolean;
  isStaff?: boolean;
  plan: PlanType;
  hospitalId?: string;
  /** 현재 병원 진료 요일 설정 */
  hospitalWorkDays?: number[];
  /** 진료 요일 변경 후 상태 업데이트 콜백 */
  onWorkDaysChange?: (workDays: number[]) => void;
  /** staff 세부 권한 (master는 무시) */
  permissions?: MemberPermissions | null;
  /** 권장재고 산출 설정 */
  stockCalcSettings?: StockCalcSettings;
  /** 권장재고 산출 설정 변경 콜백 */
  onStockCalcSettingsChange?: (settings: StockCalcSettings) => Promise<void>;
}

interface SettingsCard {
  id: DashboardTab;
  title: string;
  description: string;
  icon: React.ReactNode;
  requireMaster?: boolean;
  feature?: PlanFeature;
  /** staff에게 허용할 세부 권한 키 (해당 키가 true면 requireMaster 무시) */
  staffPermission?: keyof MemberPermissions;
}

/** 해당 기능에 접근 가능한 최소 플랜 찾기 */
function getMinPlanForFeature(feature: PlanFeature): PlanType {
  const plans: PlanType[] = ['free', 'basic', 'plus', 'business', 'ultimate'];
  for (const p of plans) {
    if (planService.canAccess(p, feature)) return p;
  }
  return 'business';
}

const SettingsHub: React.FC<SettingsHubProps> = ({ onNavigate, isMaster, isStaff, plan, hospitalId, hospitalWorkDays, onWorkDaysChange, permissions, stockCalcSettings, onStockCalcSettingsChange }) => {
  const [resetRequest, setResetRequest] = useState<DbResetRequest | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetLoaded, setResetLoaded] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const { toast, showToast } = useToast();

  // 진료 요일 설정 상태
  const [localWorkDays, setLocalWorkDays] = useState<number[]>(hospitalWorkDays ?? DEFAULT_WORK_DAYS);
  const [isSavingWorkDays, setIsSavingWorkDays] = useState(false);
  const [workDaysSaved, setWorkDaysSaved] = useState(false);

  // 권장재고 산출 설정 상태
  const [localCalcSettings, setLocalCalcSettings] = useState<StockCalcSettings>(
    stockCalcSettings ?? DEFAULT_STOCK_CALC_SETTINGS
  );
  const [isSavingCalcSettings, setIsSavingCalcSettings] = useState(false);
  const [calcSettingsSaved, setCalcSettingsSaved] = useState(false);

  // 권장재고 산출 설정 모달
  const [showCalcSettingsModal, setShowCalcSettingsModal] = useState(false);

  // 인테그레이션 상태
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [integrationCount, setIntegrationCount] = useState(0);

  // 덴트웹 자동화 상태
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [automationState, setAutomationState] = useState<DentwebAutomationState | null>(null);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [newAgentToken, setNewAgentToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // 거래처 관리 상태
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorManufacturers, setVendorManufacturers] = useState<string[]>([]);
  const [vendors, setVendors] = useState<VendorContact[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [editRepName, setEditRepName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorDeleting, setVendorDeleting] = useState<string | null>(null);

  // hospitalWorkDays prop 변경 시 로컬 상태 동기화
  useEffect(() => {
    if (hospitalWorkDays) setLocalWorkDays(hospitalWorkDays);
  }, [hospitalWorkDays]);

  // stockCalcSettings prop 변경 시 로컬 상태 동기화
  useEffect(() => {
    if (stockCalcSettings) setLocalCalcSettings(stockCalcSettings);
  }, [stockCalcSettings]);

  // 거래처 데이터 로딩 (master 또는 canManageVendors 권한 보유 staff, Business 플랜 이상)
  const canVendorPlan = planService.canAccess(plan, 'supplier_management');
  const canAccessVendors = canVendorPlan && ((isMaster && !isStaff) || (!isMaster && !!permissions?.canManageVendors));
  const canAccessWorkDays = isMaster || !!permissions?.canManageWorkDays;
  const canAccessIntegrations = isMaster && !isStaff && planService.canAccess(plan, 'integrations');
  const canAccessOptimizer = (isMaster && !isStaff) || (!isMaster && !!permissions?.canManageOptimizer);
  const canAccessDentweb = ((isMaster && !isStaff) || (!isMaster && !!permissions?.canManageDentweb)) && planService.canAccess(plan, 'integrations');

  // 인테그레이션 연결 수 초기 로드
  useEffect(() => {
    if (!hospitalId || !canAccessIntegrations) return;
    void integrationService.getIntegrations(hospitalId).then(list => {
      setIntegrationCount(list.filter(i => i.is_active).length);
    });
  }, [hospitalId, canAccessIntegrations]);

  useEffect(() => {
    if (!hospitalId || !canAccessIntegrations) return;
    setAutomationLoading(true);
    void dentwebAutomationService.getState()
      .then(state => {
        if (!state) return;
        setAutomationState(state);
      })
      .finally(() => setAutomationLoading(false));
  }, [hospitalId, canAccessIntegrations]);

  useEffect(() => {
    if (!hospitalId || !canAccessVendors) return;
    setVendorsLoading(true);
    Promise.all([
      hospitalService.getDistinctManufacturers(hospitalId),
      hospitalService.getVendorContacts(hospitalId),
    ]).then(([mfrs, contacts]) => {
      setVendorManufacturers(mfrs);
      setVendors(contacts);
    }).finally(() => setVendorsLoading(false));
  }, [hospitalId, canAccessVendors]);

  const startEditVendor = (manufacturer: string) => {
    const existing = vendors.find(v => v.manufacturer === manufacturer);
    setEditingVendor(manufacturer);
    setEditRepName(existing?.repName ?? '');
    setEditPhone(existing?.phone ?? '');
  };

  const cancelEditVendor = () => {
    setEditingVendor(null);
    setEditRepName('');
    setEditPhone('');
  };

  const handleSaveVendor = async () => {
    if (!hospitalId || !editingVendor) return;
    setVendorSaving(true);
    const result = await hospitalService.upsertVendorContact(hospitalId, editingVendor, editRepName, editPhone);
    if (result) {
      setVendors(prev => {
        const filtered = prev.filter(v => v.manufacturer !== editingVendor);
        return [...filtered, result].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
      });
      cancelEditVendor();
    } else {
      showToast('저장에 실패했습니다.', 'error');
    }
    setVendorSaving(false);
  };

  const handleDeleteVendor = async (contact: VendorContact) => {
    setVendorDeleting(contact.id);
    try {
      await hospitalService.deleteVendorContact(contact.id);
      setVendors(prev => prev.filter(v => v.id !== contact.id));
    } catch {
      showToast('삭제에 실패했습니다.', 'error');
    }
    setVendorDeleting(null);
  };

  const handleSaveWorkDays = async () => {
    if (!hospitalId) return;
    setIsSavingWorkDays(true);
    try {
      await hospitalService.updateWorkDays(hospitalId, localWorkDays);
      onWorkDaysChange?.(localWorkDays);
      setWorkDaysSaved(true);
      setTimeout(() => setWorkDaysSaved(false), 3000);
    } catch (err) {
      showToast('진료 요일 저장에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSavingWorkDays(false);
    }
  };

  const workDaysChanged = JSON.stringify([...(hospitalWorkDays ?? DEFAULT_WORK_DAYS)].sort()) !== JSON.stringify([...localWorkDays].sort());

  const handleSaveCalcSettings = async () => {
    if (!onStockCalcSettingsChange) return;
    // validation: trendFloor < trendCeiling
    if (localCalcSettings.trendFloor >= localCalcSettings.trendCeiling) {
      showToast('추세 하한은 상한보다 작아야 합니다.', 'error');
      return;
    }
    setIsSavingCalcSettings(true);
    try {
      await onStockCalcSettingsChange(localCalcSettings);
      setCalcSettingsSaved(true);
      setTimeout(() => setCalcSettingsSaved(false), 3000);
    } catch {
      showToast('설정 저장에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSavingCalcSettings(false);
    }
  };

  const calcSettingsChanged =
    localCalcSettings.safetyMultiplier !== (stockCalcSettings ?? DEFAULT_STOCK_CALC_SETTINGS).safetyMultiplier ||
    localCalcSettings.trendCeiling !== (stockCalcSettings ?? DEFAULT_STOCK_CALC_SETTINGS).trendCeiling ||
    localCalcSettings.trendFloor !== (stockCalcSettings ?? DEFAULT_STOCK_CALC_SETTINGS).trendFloor;

  // 현재 활성 초기화 요청 조회
  useEffect(() => {
    if (!hospitalId || !isStaff) return;
    resetService.getActiveRequest(hospitalId).then(req => {
      setResetRequest(req);
      setResetLoaded(true);
    });
  }, [hospitalId, isStaff]);

  const handleResetRequest = async () => {
    if (!hospitalId || !resetReason.trim()) return;
    setIsSubmitting(true);
    const req = await resetService.requestReset(hospitalId, resetReason.trim());
    if (req) {
      setResetRequest(req);
      setShowResetModal(false);
      setResetReason('');
    } else {
      showToast('초기화 요청에 실패했습니다.', 'error');
    }
    setIsSubmitting(false);
  };

  const handleCancelReset = async () => {
    if (!resetRequest) return;
    setConfirmModal({
      message: '초기화 예약을 취소하시겠습니까?',
      onConfirm: async () => {
        setConfirmModal(null);
        const ok = await resetService.cancelRequest(resetRequest.id);
        if (ok) {
          setResetRequest(null);
        } else {
          showToast('취소에 실패했습니다.', 'error');
        }
      },
    });
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    setNewAgentToken(null);
    const res = await dentwebAutomationService.generateToken();
    if (!res.ok || !res.agentToken) {
      showToast('토큰 발급에 실패했습니다.', 'error');
      setGeneratingToken(false);
      return;
    }
    setNewAgentToken(res.agentToken);
    if (res.state) setAutomationState(res.state);
    showToast('에이전트 토큰이 발급되었습니다.', 'success');
    setGeneratingToken(false);
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    }
  };

  const cards: SettingsCard[] = [
    {
      id: 'fixture_upload',
      title: '로우데이터 업로드',
      description: '픽스쳐 엑셀 파일을 업로드하여 재고 데이터의 기초를 구성합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      id: 'fixture_edit',
      title: '데이터 설정/가공',
      description: '업로드된 로우데이터를 가공하고 재고 마스터에 반영합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'member_management',
      title: '구성원 관리',
      description: '병원 구성원의 가입 승인, 초대, 권한을 관리합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      requireMaster: true,
      feature: 'role_management',
    },
    {
      id: 'audit_log',
      title: '감사 로그',
      description: '누가, 언제, 어떤 작업을 수행했는지 이력을 조회합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      requireMaster: true,
      staffPermission: 'canViewAuditLog',
      feature: 'audit_log',
    },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const renderCardItem = (card: SettingsCard) => {
    const isPlanLocked = card.feature ? !planService.canAccess(plan, card.feature) : false;
    const staffHasPerm = card.staffPermission ? !!permissions?.[card.staffPermission] : false;
    const isRoleLocked = card.requireMaster ? ((!isMaster || !!isStaff) && !staffHasPerm) : false;
    const isLocked = isPlanLocked || isRoleLocked;
    const minPlan = card.feature ? getMinPlanForFeature(card.feature) : null;
    const minPlanLabel = minPlan ? PLAN_NAMES[minPlan] : '';

    return (
      <button
        key={card.id}
        onClick={() => !isLocked && onNavigate(card.id)}
        disabled={isLocked}
        className={`group relative text-left p-6 rounded-2xl border transition-all duration-200 ${
          isLocked
            ? 'bg-slate-50/80 border-slate-200 cursor-not-allowed'
            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 hover:-translate-y-0.5 active:scale-[0.99]'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isLocked
              ? 'bg-slate-100 text-slate-300'
              : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
          } transition-colors`}>
            {card.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-bold ${isLocked ? 'text-slate-400' : 'text-slate-800'}`}>
                {card.title}
              </h3>
              {isLocked && (
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              )}
            </div>
            <p className={`text-xs mt-1 leading-relaxed ${isLocked ? 'text-slate-400' : 'text-slate-500'}`}>
              {card.description}
            </p>
            {isLocked && (
              <div className="mt-2 space-y-1">
                {isPlanLocked && (
                  <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                    <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black">{minPlanLabel}</span> 이상 플랜에서 이용 가능
                  </p>
                )}
                {isRoleLocked && (
                  <p className="text-[11px] font-bold text-amber-600">
                    {isStaff ? '클리닉 워크스페이스 전용 기능입니다' : '병원 관리자 권한이 필요합니다'}
                  </p>
                )}
              </div>
            )}
          </div>
          <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-transform ${isLocked ? 'text-slate-200' : 'text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    );
  };

  return (
    <>
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">설정</h2>
        <p className="text-sm text-slate-500 font-medium italic mt-1">데이터 관리, 구성원, 감사 로그 등 시스템 설정을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Free 플랜 카드 */}
        {renderCardItem(cards[0])}
        {renderCardItem(cards[1])}

        {/* 권장재고 산출 설정 (Free) */}
        {canAccessOptimizer && hospitalId && onStockCalcSettingsChange && (
          <button
            onClick={() => setShowCalcSettingsModal(true)}
            className="group relative text-left p-6 rounded-2xl border bg-white border-slate-200 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-50 text-violet-600 group-hover:bg-violet-100 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800">권장재고 산출 설정</h3>
                <p className="text-xs mt-1 leading-relaxed text-slate-500">
                  안전재고 배수·추세 반영 범위 등 권장량 계산 파라미터를 조정합니다.
                </p>
              </div>
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {/* 구성원 관리 (Plus+) */}
        {renderCardItem(cards[2])}

        {/* 감사 로그 (Business+) */}
        {renderCardItem(cards[3])}

        {/* 거래처 관리 카드 — master에게만 표시, Business+ 이상 플랜 필요 */}
        {(isMaster && !isStaff) && hospitalId && (() => {
          const isVendorLocked = !canVendorPlan;
          return (
            <button
              onClick={() => !isVendorLocked && setShowVendorModal(true)}
              disabled={isVendorLocked}
              className={`group relative text-left p-6 rounded-2xl border transition-all duration-200 ${
                isVendorLocked
                  ? 'bg-slate-50/80 border-slate-200 cursor-not-allowed'
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 hover:-translate-y-0.5 active:scale-[0.99]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isVendorLocked ? 'bg-slate-100 text-slate-300' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${isVendorLocked ? 'text-slate-400' : 'text-slate-800'}`}>거래처 관리</h3>
                    {isVendorLocked && (
                      <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${isVendorLocked ? 'text-slate-400' : 'text-slate-500'}`}>
                    제조사별 영업사원 이름과 전화번호를 등록·수정합니다.
                  </p>
                  {isVendorLocked && (
                    <p className="mt-2 text-[11px] font-bold text-amber-600 flex items-center gap-1">
                      <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black">Business</span> 이상 플랜에서 이용 가능
                    </p>
                  )}
                </div>
                <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-transform ${isVendorLocked ? 'text-slate-200' : 'text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })()}

        {/* 외부 연동 카드 */}
        {isMaster && !isStaff && hospitalId && (
          <button
            onClick={() => { if (canAccessIntegrations) setShowIntegrationModal(true); }}
            disabled={!canAccessIntegrations}
            className={`group relative text-left p-6 rounded-2xl border bg-white transition-all duration-200 ${
              canAccessIntegrations
                ? 'border-slate-200 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer'
                : 'border-slate-200 cursor-not-allowed opacity-70'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                canAccessIntegrations ? 'bg-violet-50 text-violet-600 group-hover:bg-violet-100' : 'bg-slate-100 text-slate-400'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-base font-bold ${canAccessIntegrations ? 'text-slate-800' : 'text-slate-500'}`}>외부 연동</h3>
                  {canAccessIntegrations && integrationCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-100 text-violet-700">
                      {integrationCount}개 연결됨
                    </span>
                  )}
                  {!canAccessIntegrations && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                      Business 이상 이용 가능
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 leading-relaxed text-slate-400">
                  Notion, Slack, Solapi 등 외부 서비스와 연동합니다.
                </p>
              </div>
              {canAccessIntegrations ? (
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
          </button>
        )}

        {/* 덴트웹 자동화 카드 */}
        {((isMaster && !isStaff) || (!isMaster && !!permissions?.canManageDentweb)) && hospitalId && (
          <button
            onClick={() => { if (canAccessDentweb) setShowAutomationModal(true); }}
            disabled={!canAccessDentweb}
            className={`group relative text-left p-6 rounded-2xl border bg-white transition-all duration-200 ${
              canAccessDentweb
                ? 'border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer'
                : 'border-slate-200 cursor-not-allowed opacity-70'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                canAccessDentweb ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-slate-100 text-slate-400'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3a6.75 6.75 0 100 13.5h4.5A5.25 5.25 0 1014.25 6h-.25A6.73 6.73 0 009.75 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-base font-bold ${canAccessDentweb ? 'text-slate-800' : 'text-slate-500'}`}>덴트웹 자동화</h3>
                  {canAccessDentweb && automationState?.hasAgentToken && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                      automationState.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {automationState.enabled ? '자동 실행 ON' : '자동 실행 OFF'}
                    </span>
                  )}
                  {!canAccessDentweb && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                      Business 이상 이용 가능
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 leading-relaxed text-slate-400">
                  병원 PC 에이전트와 연동해 수술기록을 자동으로 업로드합니다.
                </p>
              </div>
              {canAccessDentweb ? (
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
          </button>
        )}
      </div>

      <WorkDaysSettingsSection
        canAccessWorkDays={canAccessWorkDays}
        hospitalId={hospitalId}
        localWorkDays={localWorkDays}
        onChangeLocalWorkDays={setLocalWorkDays}
        isSavingWorkDays={isSavingWorkDays}
        workDaysSaved={workDaysSaved}
        workDaysChanged={workDaysChanged}
        onSaveWorkDays={handleSaveWorkDays}
      />

      <DataResetDangerSection
        isStaff={isStaff}
        hospitalId={hospitalId}
        resetRequest={resetRequest}
        resetLoaded={resetLoaded}
        onCancelReset={handleCancelReset}
        onOpenResetModal={() => setShowResetModal(true)}
        formatDate={formatDate}
      />

      <DataResetRequestModal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        resetReason={resetReason}
        setResetReason={setResetReason}
        isSubmitting={isSubmitting}
        onSubmit={handleResetRequest}
      />
    </div>

    {/* 권장재고 산출 설정 모달 */}
    {showCalcSettingsModal && (
      <StockCalcSettingsModal
        onClose={() => setShowCalcSettingsModal(false)}
        localCalcSettings={localCalcSettings}
        setLocalCalcSettings={setLocalCalcSettings}
        calcSettingsSaved={calcSettingsSaved}
        calcSettingsChanged={calcSettingsChanged}
        isSavingCalcSettings={isSavingCalcSettings}
        onSave={handleSaveCalcSettings}
      />
    )}

    {/* 거래처 관리 모달 */}
    {showVendorModal && (
      <VendorManagementModal
        manufacturers={vendorManufacturers}
        vendors={vendors}
        isLoading={vendorsLoading}
        editingVendor={editingVendor}
        editRepName={editRepName}
        setEditRepName={setEditRepName}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        isSaving={vendorSaving}
        deletingId={vendorDeleting}
        onStartEdit={startEditVendor}
        onCancelEdit={cancelEditVendor}
        onSave={handleSaveVendor}
        onDelete={handleDeleteVendor}
        onClose={() => setShowVendorModal(false)}
      />
    )}

    <DentwebAutomationModal
      open={showAutomationModal}
      onClose={() => {
        setShowAutomationModal(false);
        setNewAgentToken(null);
      }}
      automationLoading={automationLoading}
      automationState={automationState}
      generatingToken={generatingToken}
      onGenerateToken={handleGenerateToken}
      newAgentToken={newAgentToken}
      tokenCopied={tokenCopied}
      onCopyToken={handleCopyToken}
    />

    {/* 외부 연동 모달 */}
    {showIntegrationModal && hospitalId && (
      <React.Suspense fallback={null}>
        <IntegrationManager
          hospitalId={hospitalId}
          onClose={() => setShowIntegrationModal(false)}
          onIntegrationCountChange={setIntegrationCount}
        />
      </React.Suspense>
    )}

    {confirmModal && (
      <ConfirmModal
        title="확인"
        message={confirmModal.message}
        confirmColor="rose"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    )}
    {toast && (
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
        {toast.message}
      </div>
    )}
    </>
  );
};

export default SettingsHub;
