import { SurgeryUnregisteredItem } from '../../types';

export type SizePattern =
  | 'phi'
  | 'oslash-mm'
  | 'oslash-l'
  | 'cuff-phi'
  | 'dl-cuff'
  | 'numeric-code'
  | 'bare-numeric'
  | 'other'
  | 'empty';

export interface UnregisteredReviewItem extends SurgeryUnregisteredItem {
  rowKey: string;
  canonicalManufacturer: string;
  canonicalBrand: string;
  canonicalSize: string;
  resolvedManufacturerFromExisting: boolean;
  hasBaseline: boolean;
  isConsistent: boolean;
  actualPattern: SizePattern;
  actualPatternLabel: string;
  baselinePattern: SizePattern | null;
  baselinePatternLabel: string | null;
  isDuplicate: boolean;
  canRegister: boolean;
  registerBlockReason: string | null;
  preferredManualFixSize: string;
}

export interface ManualFixCheckResult {
  checked: number;
  found: number;
  applicable: number;
  alreadyFixed: number;
  updated: number;
  failed: number;
  notFound: number;
  appliedManufacturer: string;
  appliedBrand: string;
  appliedSize: string;
}

export interface ManualFixDraft {
  manufacturer: string;
  brand: string;
  size: string;
}
