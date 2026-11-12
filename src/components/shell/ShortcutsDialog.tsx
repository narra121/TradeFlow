import { KEYMAP, KEY_SCOPES } from '@/lib/keymap';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { Switch } from '@/components/ui/switch';
import { useUiState } from '@/hooks/useUiState';

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [ui, setUi] = useUiState();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Single-key shortcuts are ignored while you type in a field.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <label htmlFor="single-key-switch" className="text-sm">
            Single-key shortcuts
          </label>
          <Switch id="single-key-switch" checked={ui.singleKeyShortcuts} onCheckedChange={(v) => setUi({ singleKeyShortcuts: v })} />
        </div>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto">
          {KEY_SCOPES.map((scope) => (
            <section key={scope} aria-label={scope}>
              <h3 className="mb-1 text-xs font-medium text-muted-foreground">{scope}</h3>
              <ul className="space-y-0.5">
                {KEYMAP.filter((k) => k.scope === scope).map((s) => (
                  <li key={s.id} className={`flex items-center justify-between gap-3 py-1 text-sm ${s.single && !ui.singleKeyShortcuts ? 'opacity-50' : ''}`}>
                    <span>{s.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
