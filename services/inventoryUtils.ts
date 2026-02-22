import { InventoryItem } from '../types';
import { fixIbsImplant } from './mappers';
import { toCanonicalSize, getSizeMatchKey } from './sizeNormalizer';
import { manufacturerAliasKey } from './appUtils';
import { normalizeInventory } from './normalizationService';

export function buildInventoryDuplicateKey(
  item: Pick<InventoryItem, 'manufacturer' | 'brand' | 'size'>
): string {
  const fixed = fixIbsImplant(String(item.manufacturer || ''), String(item.brand || ''));
  const canonicalSize = toCanonicalSize(String(item.size || ''), fixed.manufacturer);
  const manufacturerKey = manufacturerAliasKey(fixed.manufacturer);
  const brandKey = normalizeInventory(fixed.brand);
  const sizeKey = getSizeMatchKey(canonicalSize, fixed.manufacturer);
  return `${manufacturerKey}|${brandKey}|${sizeKey}`;
}
