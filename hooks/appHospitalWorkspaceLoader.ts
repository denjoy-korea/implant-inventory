import type { Dispatch, SetStateAction } from 'react';
import type { AppState, DbSurgeryRecord, ExcelRow, User } from '../types';
import { inventoryService } from '../services/inventoryService';
import { surgeryService } from '../services/surgeryService';
import { orderService } from '../services/orderService';
import { resetService } from '../services/resetService';
import {
  dbToInventoryItem,
  dbToExcelRowBatch,
  dbToExcelRowBatchMasked,
  dbToOrder,
} from '../services/mappers';
import { waitForWarmup } from '../services/cryptoUtils';
import { getSurgeryFromDate, resolvePlanStateWithEntitlements } from './appHospitalPlanState';

export async function loadHospitalWorkspaceSnapshot(user: User) {
  const planState = await resolvePlanStateWithEntitlements(user.hospitalId);
  const fromDate = getSurgeryFromDate(planState.plan);

  const [inventoryData, surgeryData, ordersData] = await Promise.all([
    inventoryService.getInventory(),
    surgeryService.getSurgeryRecords({ fromDate }),
    orderService.getOrders(),
  ]);

  if (import.meta.env.DEV) {
    console.log('[appHospitalWorkspaceLoader] snapshot:', {
      inventoryCount: inventoryData.length,
      surgeryCount: surgeryData.length,
      ordersCount: ordersData.length,
      hospitalId: user.hospitalId,
    });
  }

  const inventory = inventoryData.map(dbToInventoryItem);
  const surgeryRowsMasked = dbToExcelRowBatchMasked(surgeryData);
  const orders = ordersData.map(dbToOrder);

  surgeryService.backfillPatientInfoHash(user.hospitalId).catch(() => {});

  const wasReset = await resetService.checkScheduledReset(user.hospitalId);

  return {
    planState,
    inventory: wasReset ? [] : inventory,
    surgeryMaster: wasReset ? {} as Record<string, ExcelRow[]> : { '수술기록지': surgeryRowsMasked },
    orders: wasReset ? [] : orders,
    surgeryData,
    wasReset,
  };
}

export function scheduleHospitalSurgeryDecrypt({
  user,
  surgeryData,
  setState,
  logPrefix,
}: {
  user: User;
  surgeryData: DbSurgeryRecord[];
  setState: Dispatch<SetStateAction<AppState>>;
  logPrefix: string;
}) {
  if (surgeryData.length === 0) return;

  void waitForWarmup()
    .then(() => dbToExcelRowBatch(surgeryData))
    .then((decryptedRows) => {
      setState((prev) => {
        if (prev.user?.id !== user.id || prev.user?.hospitalId !== user.hospitalId) return prev;
        return {
          ...prev,
          surgeryMaster: {
            ...prev.surgeryMaster,
            '수술기록지': decryptedRows,
          },
        };
      });
    })
    .catch((error) => {
      console.warn(logPrefix, error);
    });
}
