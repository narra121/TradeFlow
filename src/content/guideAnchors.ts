/**
 * Stable anchors of /guide for contextual Help links (DESIGN-ENTERPRISE E-087). `GUIDE_ANCHORS` maps an in-app page to the
 * anchor to open (`/guide#<anchor>`); `GUIDE_ALIASES` lists the extra ids each guide section answers to. Anchors never
 * change once published: add an alias instead of renaming a section id.
 */
export const GUIDE_ALIASES: Record<string, string[]> = {
  'getting-started': ['onboarding'],
  'adding-trades': ['add-trade'],
  'importing-trades': ['import'],
  'trade-log': ['trades', 'calendar'],
  'goals-rules': ['goals', 'rules'],
  settings: ['profile', 'billing', 'plan'],
};

/** In-app page (first path segment after /app/) -> anchor on /guide. */
export const GUIDE_ANCHORS: Record<string, string> = {
  dashboard: 'dashboard',
  trades: 'trades',
  tradelog: 'trades',
  calendar: 'calendar',
  analytics: 'analytics',
  insights: 'analytics',
  goals: 'goals',
  accounts: 'accounts',
  settings: 'settings',
  import: 'import',
  billing: 'billing',
  profile: 'profile',
};

export function guideLink(appPage: string): string {
  const anchor = GUIDE_ANCHORS[appPage];
  return anchor ? `/guide#${anchor}` : '/guide';
}
