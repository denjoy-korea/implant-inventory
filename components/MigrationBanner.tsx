import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { migrationService } from '../services/migrationService';
import ConfirmModal from './ConfirmModal';

interface MigrationBannerProps {
  user: User;
  onMigrationComplete: () => void;
}

const MigrationBanner: React.FC<MigrationBannerProps> = ({ user, onMigrationComplete }) => {
  const [hasLocalData, setHasLocalData] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user.hospitalId) {
      setHasLocalData(migrationService.hasLocalData(user.hospitalId));
    }
  }, [user.hospitalId]);

  if (!hasLocalData) return null;

  const doMigrate = async () => {
    if (!user.hospitalId) return;
    setIsMigrating(true);
    try {
      const migrationResult = await migrationService.migrateAll(user.hospitalId);

      if (migrationResult.success) {
        migrationService.clearLocalData(user.hospitalId);
        setResult(`마이그레이션 완료: 재고 ${migrationResult.inventory.migrated}건, 수술기록 ${migrationResult.surgery.migrated}건, 주문 ${migrationResult.orders.migrated}건`);
        setHasLocalData(false);
        setTimeout(() => onMigrationComplete(), 2000);
      } else {
        const errors = [];
        if (migrationResult.inventory.errors > 0) errors.push(`재고 ${migrationResult.inventory.errors}건 실패`);
        if (migrationResult.surgery.errors > 0) errors.push(`수술기록 ${migrationResult.surgery.errors}건 실패`);
        if (migrationResult.orders.errors > 0) errors.push(`주문 ${migrationResult.orders.errors}건 실패`);
        setResult(`부분 실패: ${errors.join(', ')}`);
      }
    } catch (error) {
      setResult('마이그레이션에 실패했습니다.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    setHasLocalData(false);
  };

  return (
    <>
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <div>
          {result ? (
            <p className="text-sm font-medium text-amber-800">{result}</p>
          ) : (
            <>
              <p className="text-sm font-bold text-amber-800">로컬 데이터가 감지되었습니다</p>
              <p className="text-xs text-amber-600">기존 localStorage 데이터를 클라우드로 마이그레이션하세요.</p>
            </>
          )}
        </div>
      </div>
      {!result && (
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
          >
            나중에
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isMigrating}
            className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isMigrating ? '마이그레이션 중...' : '지금 마이그레이션'}
          </button>
        </div>
      )}
    </div>
    {showConfirm && (
      <ConfirmModal
        title="마이그레이션 확인"
        message={'localStorage 데이터를 Supabase로 마이그레이션하시겠습니까?\n기존 데이터는 마이그레이션 후 삭제됩니다.'}
        confirmColor="amber"
        confirmLabel="마이그레이션"
        onConfirm={() => { setShowConfirm(false); doMigrate(); }}
        onCancel={() => setShowConfirm(false)}
      />
    )}
    </>
  );
};

export default MigrationBanner;
