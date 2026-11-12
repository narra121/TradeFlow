/** Legacy names some browsers report for their own zone; the IANA list the picker offers uses the current names. */
const ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Europe/Kiev': 'Europe/Kyiv',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
};

const FALLBACK = ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney'];

export function canonicalZone(zone: string): string {
  return ALIASES[zone] ?? zone;
}

/** The zone this browser reports, under its current IANA name. */
export function browserZone(): string {
  return canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** Every IANA zone the browser knows, the current zone first and listed once (`from this browser` is a label, not a second entry). */
export function zoneList(current: string): string[] {
  const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone');
  const all = (list && list.length ? list : FALLBACK).map(canonicalZone);
  return [...new Set([canonicalZone(current || browserZone()), browserZone(), ...all])];
}
