export interface PasswordRule {
  id: string;
  /** Checklist line. */
  label: string;
  /** What the rule asks for, as the object of "Add …". */
  noun: string;
  test: (p: string) => boolean;
}

/** The Cognito pool policy (JournalAWSSetup template.yaml `PasswordPolicy`): 8 or more characters, upper, lower, number, symbol. One list for signup, reset and Settings. */
export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', noun: 'at least 8 characters', test: (p) => p.length >= 8 },
  { id: 'lower', label: 'A lowercase letter', noun: 'a lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'upper', label: 'An uppercase letter', noun: 'an uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'A number', noun: 'a number', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'A symbol, like ! or #', noun: 'a symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function unmetRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((r) => !r.test(password));
}

/** `Add an uppercase letter and a symbol.`; a lone symbol keeps its example: `Add a symbol, like ! or #.` */
export function missingRulesMessage(missing: PasswordRule[]): string {
  const nouns = missing.map((r) => (missing.length === 1 && r.id === 'symbol' ? r.label.toLowerCase() : r.noun));
  const list = nouns.length > 2 ? `${nouns.slice(0, -1).join(', ')}, and ${nouns[nouns.length - 1]}` : nouns.join(' and ');
  return `Add ${list}.`;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Name sent to the API when resending a code from the login screen, where the user's name is not known. */
export function fallbackName(email: string): string {
  return email.split('@')[0] || 'Trader';
}
