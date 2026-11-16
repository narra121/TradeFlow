/** Link lists shared by the public header and footer (PublicLayout). Order and wording follow DESIGN-ENTERPRISE A.16. */
export interface NavLink {
  to: string;
  label: string;
}

export const HEADER_LINKS: NavLink[] = [
  { to: '/#product', label: 'Product' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/guide', label: 'Guide' },
  { to: '/blog', label: 'Blog' },
];

/** The `Resources` dropdown; the mobile menu lists these inline. */
export const RESOURCE_LINKS: NavLink[] = [
  { to: '/glossary', label: 'Glossary' },
  { to: '/resources', label: 'Calculators' },
  { to: '/case-studies', label: 'Scenarios' },
  { to: '/alternatives', label: 'Alternatives' },
  { to: '/changelog', label: 'Changelog' },
];

export const FOOTER_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Product',
    links: [
      { to: '/guide#adding-trades', label: 'Journal' },
      { to: '/guide#import', label: 'Import' },
      { to: '/guide#calendar', label: 'Calendar' },
      { to: '/guide#analytics', label: 'Analytics' },
      { to: '/guide#insights', label: 'AI insights' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/forex-trading-journal', label: 'For forex traders' },
      { to: '/mt5-trading-journal', label: 'MT4 / MT5 journal' },
      { to: '/prop-firm-trading-journal', label: 'Prop firm journal' },
      { to: '/trading-journal-india', label: 'For Indian traders' },
      { to: '/zerodha-trading-journal', label: 'Zerodha journal' },
      { to: '/fo-trading-journal', label: 'F&O journal' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/guide', label: 'Guide' },
      { to: '/blog', label: 'Blog' },
      { to: '/glossary', label: 'Glossary' },
      { to: '/resources', label: 'Calculators' },
      { to: '/case-studies', label: 'Scenarios' },
      { to: '/alternatives', label: 'Alternatives' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
      { to: '/changelog', label: 'Changelog' },
      { to: '/status', label: 'Status' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy' },
      { to: '/terms', label: 'Terms' },
      { to: '/refund', label: 'Refunds' },
    ],
  },
];
