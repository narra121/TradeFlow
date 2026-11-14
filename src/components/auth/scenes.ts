import { HEADLINE_PARTS } from '@/components/showcase/copy';
import { TRIAL_DAYS } from '@/content/product-facts';

/** What the stage beside the form shows (DESIGN-AUTH-V2 §3). */
export type AuthScene = 'journal' | 'opening' | 'signup' | 'mail' | 'reset' | 'closed';

export interface SceneMeta {
  eyebrow: string;
  /** The display line in two tones: [muted, foreground]. */
  line: readonly [string, string];
  /** The cells of the bar that closes the stage: the sample month's figures, or what an account commits you to. */
  bar: 'stats' | 'facts' | null;
  /** The bar's sentence. A scene with a product picture carries the `Sample data` chip before it. */
  note?: string;
  sample: boolean;
}

const SAMPLE_NOTE = 'One sample account, November 2026';

export const SCENES: Record<AuthScene, SceneMeta> = {
  journal: {
    eyebrow: 'Welcome back',
    line: ['Your journal', 'is where you left it.'],
    bar: 'stats',
    note: SAMPLE_NOTE,
    sample: true,
  },
  opening: {
    eyebrow: 'Google sign-in',
    line: ['Your journal', 'is where you left it.'],
    bar: null,
    note: 'Your trades stay in your account while Google confirms who you are.',
    sample: false,
  },
  signup: {
    eyebrow: `${TRIAL_DAYS}-day free trial · No card`,
    line: HEADLINE_PARTS,
    bar: 'facts',
    note: SAMPLE_NOTE,
    sample: true,
  },
  mail: {
    eyebrow: 'Check your email',
    line: ['Six digits,', 'then your journal.'],
    bar: null,
    note: 'The code goes to the address you typed. Look in spam if it is not in your inbox.',
    sample: false,
  },
  reset: {
    eyebrow: 'Password reset',
    line: ['A new password.', 'The same journal.'],
    bar: null,
    note: 'Nothing in your journal changes when you reset your password.',
    sample: false,
  },
  closed: {
    eyebrow: 'Logged out',
    line: ['Your journal', 'is closed on this browser.'],
    bar: null,
    note: 'Your trades stay in your account. Log in from any browser to open them.',
    sample: false,
  },
};

/** What a scene mirrors from the form beside it. */
export interface StageData {
  /** Verify: the address the code went to. */
  email?: string;
  /** Verify: digits typed so far, 0–6. */
  codeLength?: number;
  /** Verify: the code was accepted. */
  verified?: boolean;
  /** Reset: 1 email a code, 2 choose a new password, 3 back in the journal. */
  resetStep?: 1 | 2 | 3;
  /** Signed out: every device, not only this browser. */
  everywhere?: boolean;
  /** Verify opened from sign up keeps sign up's facts in the bar. */
  facts?: boolean;
}
