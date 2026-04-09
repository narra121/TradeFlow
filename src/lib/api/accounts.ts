import { AccountStatus } from '@/types/trade';

export interface CreateAccountPayload {
  name: string;
  broker: string;
  type: 'prop_challenge' | 'prop_funded' | 'personal' | 'demo';
  status: AccountStatus;
  balance: number;
  initialBalance: number;
  currency: string;
  notes?: string;
}
