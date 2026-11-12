import type { RowStatus } from './rows';
import type { ImportSource } from '@/types/import';

export const PAGE_SIZE = 100;

export const STATUS_LABEL: Record<RowStatus, string> = {
  ready: 'Ready',
  fix: 'Needs a fix',
  duplicate: 'Already imported',
  excluded: 'Excluded',
  saved: 'Imported',
};

const brand = (name: string) => name.split(' (')[0];

/** `Zerodha`, or the full name when two sources share a brand (`Zerodha (Console tradebook)`). */
export function sourceLabel(source: ImportSource, all: ImportSource[]): string {
  return all.filter((s) => brand(s.name) === brand(source.name)).length > 1 ? source.name : brand(source.name);
}
