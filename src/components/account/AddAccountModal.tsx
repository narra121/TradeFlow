import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TradingAccount, AccountType, AccountStatus } from '@/types/trade';
import { accountTypeLabels, accountStatusLabels } from '@/hooks/useAccounts';

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAccount: (account: Omit<TradingAccount, 'id' | 'createdAt'>) => void;
  editAccount?: TradingAccount | null;
}

export function AddAccountModal({ open, onOpenChange, onAddAccount, editAccount }: AddAccountModalProps) {
  const [name, setName] = useState(editAccount?.name || '');
  const [broker, setBroker] = useState(editAccount?.broker || '');
  const [type, setType] = useState<AccountType>(editAccount?.type || 'prop_challenge');
  const [status, setStatus] = useState<AccountStatus>(editAccount?.status || 'active');
  const [initialBalance, setInitialBalance] = useState(editAccount?.initialBalance?.toString() || '');
  const [balance, setBalance] = useState(editAccount?.balance?.toString() || '');
  const [currency, setCurrency] = useState(editAccount?.currency || 'USD');
  const [notes, setNotes] = useState(editAccount?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onAddAccount({
      name: name.trim(),
      broker: broker.trim(),
      type,
      status,
      initialBalance: parseFloat(initialBalance) || 0,
      balance: parseFloat(balance) || parseFloat(initialBalance) || 0,
      currency,
      notes: notes.trim() || undefined,
    });

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setName('');
    setBroker('');
    setType('prop_challenge');
    setStatus('active');
    setInitialBalance('');
    setBalance('');
    setCurrency('USD');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[60vw] max-w-[60vw] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editAccount ? 'Edit Account' : 'Add New Account'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Account Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., FTMO $100k Challenge"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Broker / Firm</Label>
              <Input
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                placeholder="e.g., FTMO, MyForexFunds"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Account Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(accountTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(accountStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Initial Balance</Label>
              <Input
                type="number"
                step="0.01"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="100000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Current Balance</Label>
              <Input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this account..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editAccount ? 'Save Changes' : 'Add Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
