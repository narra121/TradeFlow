import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Row, SaveStatus, SectionHeading } from '@/components/settings/primitives';
import { useSaveState } from '@/components/settings/useSaveState';
import { TimeZonePicker } from '@/components/settings/TimeZonePicker';
import { periodToServer, usePreferences } from '@/components/settings/usePreferences';
import { useUiState, type UiState } from '@/hooks/useUiState';
import { PRESET_OPTIONS, presetLabel } from '@/lib/scope';
import { formatMoney } from '@/lib/format';

/** Periods the account can store: each maps to a server value (`periodToServer`). */
const PERIODS = PRESET_OPTIONS.filter((p) => periodToServer(p.value as UiState['defaultPeriod']) !== undefined);

/** 44 px segments on touch devices (D.7). */
const TOUCH_SEGMENTS = '[@media(pointer:coarse)]:[&_button]:h-11';

/** Display preferences (device and account) and the journal switch. Every control applies at once and goes back with an inline error when the save fails. */
export function PreferencesSection() {
  const [ui, setUi] = useUiState();
  const { prefs, isLoading, save: saveServer } = usePreferences();
  const status = useSaveState();
  const carry = prefs?.carryForwardGoalsRules ?? true;
  const [carryOn, setCarryOn] = useState<boolean | null>(null);
  const carryValue = carryOn ?? carry;

  if (isLoading) return <Skeleton className="h-64" />;

  /** Device value first, then the account; the device value is put back when the account refuses it. */
  const changeAccount = (devicePatch: Partial<UiState>, serverPatch: Parameters<typeof saveServer>[0]) => {
    const before = Object.fromEntries((Object.keys(devicePatch) as (keyof UiState)[]).map((k) => [k, ui[k]])) as Partial<UiState>;
    setUi(devicePatch);
    void status.run(() => saveServer(serverPatch), () => setUi(before));
  };
  const changeDevice = (patch: Partial<UiState>) => {
    setUi(patch);
    void status.run(async () => undefined);
  };

  const periodOptions = PERIODS.some((p) => p.value === ui.defaultPeriod) ? PERIODS : [...PERIODS, { value: ui.defaultPeriod, label: presetLabel(ui.defaultPeriod) }];

  return (
    <section aria-labelledby="pref-h">
      <SectionHeading id="pref-h" title="Preferences" />
      <h3 className="mt-2 text-13 font-semibold text-muted-foreground">Display</h3>
      <Row label="Time zone" helper="Day boundaries, the calendar and hour statistics use this zone." htmlFor="tz">
        <TimeZonePicker id="tz" value={ui.timeZone} onChange={(z) => changeAccount({ timeZone: z }, { timeZone: z })} />
      </Row>
      <Row label="P&L colours" helper="Blue / orange stays readable with red-green colour blindness.">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            className={TOUCH_SEGMENTS}
            label="P&L colours"
            value={ui.pnlPalette}
            onChange={(v) => changeAccount({ pnlPalette: v as UiState['pnlPalette'] }, { pnlPalette: v })}
            options={[{ value: 'default', label: 'Green / red' }, { value: 'cb', label: 'Blue / orange' }]}
          />
          <span className="font-mono text-sm" aria-label="Preview">
            <span className="text-profit">{formatMoney(120, 'USD', { sign: true })}</span> <span className="text-loss">{formatMoney(-48, 'USD', { sign: true })}</span>
          </span>
        </div>
      </Row>
      <Row label="Table density" helper="Saved on this device.">
        <SegmentedControl className={TOUCH_SEGMENTS} label="Table density" value={ui.density} onChange={(v) => changeDevice({ density: v as UiState['density'] })} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
      </Row>
      <Row label="Default period" helper="The period a new session starts with." htmlFor="dp">
        <Select
          value={String(ui.defaultPeriod)}
          onValueChange={(v) => {
            const value = (v === 'all' || v === 'thisWeek' || v === 'thisMonth' ? v : Number(v)) as UiState['defaultPeriod'];
            changeAccount({ defaultPeriod: value }, { defaultPeriod: periodToServer(value) });
          }}
        >
          <SelectTrigger id="dp" className="max-w-xs max-md:h-11"><SelectValue /></SelectTrigger>
          <SelectContent>{periodOptions.map((p) => <SelectItem key={String(p.value)} value={String(p.value)}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </Row>
      <Row label="Single-key shortcuts" helper="N, E, J, K and others work without a modifier key. Saved on this device." htmlFor="sk">
        <Switch id="sk" checked={ui.singleKeyShortcuts} onCheckedChange={(v) => changeDevice({ singleKeyShortcuts: v })} />
      </Row>

      <h3 className="mt-5 text-13 font-semibold text-muted-foreground">Journal</h3>
      <Row label="Carry goals and rules into new periods" helper="When off, each new week or month starts with the defaults." htmlFor="carry">
        <Switch
          id="carry"
          checked={carryValue}
          onCheckedChange={(v) => {
            setCarryOn(v);
            void status.run(() => saveServer({ carryForwardGoalsRules: v }), () => setCarryOn(!v));
          }}
        />
      </Row>
      <SaveStatus state={status.state} />
    </section>
  );
}
