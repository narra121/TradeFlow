import { lazyPage, type LazyPage } from './lazyPage';
import { CONTENT_ROUTES } from './routes';

// Prerendered pages, shared by the routers (PublicRoutes.tsx, App.tsx) and the first-paint preloader (preloadRoute.ts).
// Kept free of react-router so the entry chunk stays light.
export const LandingPage = lazyPage(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
export const NotFound = lazyPage(() => import('@/pages/NotFound'));
export const LoginPage = lazyPage(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
export const SignupPage = lazyPage(() => import('@/pages/SignupPage').then(m => ({ default: m.SignupPage })));
export const PrivacyPolicyPage = lazyPage(() => import('@/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
export const TermsOfServicePage = lazyPage(() => import('@/pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
export const RefundPolicyPage = lazyPage(() => import('@/pages/RefundPolicyPage').then(m => ({ default: m.RefundPolicyPage })));
export const ContactPage = lazyPage(() => import('@/pages/ContactPage').then(m => ({ default: m.ContactPage })));
export const AboutPage = lazyPage(() => import('@/pages/AboutPage').then(m => ({ default: m.AboutPage })));
export const GuidePage = lazyPage(() => import('@/pages/GuidePage').then(m => ({ default: m.GuidePage })));
export const BlogIndexPage = lazyPage(() => import('@/pages/blog/BlogIndexPage').then(m => ({ default: m.BlogIndexPage })));
export const BlogArticlePage = lazyPage(() => import('@/pages/blog/BlogArticlePage').then(m => ({ default: m.BlogArticlePage })));
export const GlossaryPage = lazyPage(() => import('@/pages/glossary/GlossaryPage').then(m => ({ default: m.GlossaryPage })));
export const ResourcesPage = lazyPage(() => import('@/pages/resources/ResourcesPage').then(m => ({ default: m.ResourcesPage })));
export const PositionSizeCalculatorPage = lazyPage(() => import('@/pages/resources/PositionSizeCalculatorPage').then(m => ({ default: m.PositionSizeCalculatorPage })));
export const RiskRewardCalculatorPage = lazyPage(() => import('@/pages/resources/RiskRewardCalculatorPage').then(m => ({ default: m.RiskRewardCalculatorPage })));
export const PipCalculatorPage = lazyPage(() => import('@/pages/resources/PipCalculatorPage').then(m => ({ default: m.PipCalculatorPage })));
export const ForexMarketHoursPage = lazyPage(() => import('@/pages/resources/ForexMarketHoursPage').then(m => ({ default: m.ForexMarketHoursPage })));
export const PropFirmDrawdownCalculatorPage = lazyPage(() => import('@/pages/resources/PropFirmDrawdownCalculatorPage').then(m => ({ default: m.PropFirmDrawdownCalculatorPage })));
export const MarginCalculatorPage = lazyPage(() => import('@/pages/resources/MarginCalculatorPage').then(m => ({ default: m.MarginCalculatorPage })));
export const RiskOfRuinCalculatorPage = lazyPage(() => import('@/pages/resources/RiskOfRuinCalculatorPage').then(m => ({ default: m.RiskOfRuinCalculatorPage })));
export const CompoundingCalculatorPage = lazyPage(() => import('@/pages/resources/CompoundingCalculatorPage').then(m => ({ default: m.CompoundingCalculatorPage })));
export const ExpectancyCalculatorPage = lazyPage(() => import('@/pages/resources/ExpectancyCalculatorPage').then(m => ({ default: m.ExpectancyCalculatorPage })));
export const FoTurnoverCalculatorPage = lazyPage(() => import('@/pages/resources/FoTurnoverCalculatorPage').then(m => ({ default: m.FoTurnoverCalculatorPage })));
export const FoChargesRatesPage = lazyPage(() => import('@/pages/resources/FoChargesRatesPage').then(m => ({ default: m.FoChargesRatesPage })));
export const EquityCurveSimulatorPage = lazyPage(() => import('@/pages/resources/EquityCurveSimulatorPage').then(m => ({ default: m.EquityCurveSimulatorPage })));
export const NewYorkSessionPage = lazyPage(() => import('@/pages/resources/sessions/NewYorkSessionPage').then(m => ({ default: m.NewYorkSessionPage })));
export const LondonSessionPage = lazyPage(() => import('@/pages/resources/sessions/LondonSessionPage').then(m => ({ default: m.LondonSessionPage })));
export const AsianSessionPage = lazyPage(() => import('@/pages/resources/sessions/AsianSessionPage').then(m => ({ default: m.AsianSessionPage })));
export const LondonNewYorkOverlapPage = lazyPage(() => import('@/pages/resources/sessions/LondonNewYorkOverlapPage').then(m => ({ default: m.LondonNewYorkOverlapPage })));
export const ProfitFactorTermPage = lazyPage(() => import('@/pages/glossary/terms/ProfitFactorTermPage').then(m => ({ default: m.ProfitFactorTermPage })));
export const ExpectancyTermPage = lazyPage(() => import('@/pages/glossary/terms/ExpectancyTermPage').then(m => ({ default: m.ExpectancyTermPage })));
export const RMultipleTermPage = lazyPage(() => import('@/pages/glossary/terms/RMultipleTermPage').then(m => ({ default: m.RMultipleTermPage })));
export const WinRateTermPage = lazyPage(() => import('@/pages/glossary/terms/WinRateTermPage').then(m => ({ default: m.WinRateTermPage })));
export const MaximumDrawdownTermPage = lazyPage(() => import('@/pages/glossary/terms/MaximumDrawdownTermPage').then(m => ({ default: m.MaximumDrawdownTermPage })));
export const CaseStudiesIndexPage = lazyPage(() => import('@/pages/case-studies/CaseStudiesIndexPage').then(m => ({ default: m.CaseStudiesIndexPage })));
export const CaseStudyPage = lazyPage(() => import('@/pages/case-studies/CaseStudyPage').then(m => ({ default: m.CaseStudyPage })));
export const ChangelogPage = lazyPage(() => import('@/pages/changelog/ChangelogPage').then(m => ({ default: m.ChangelogPage })));

/** The page at each static path (articles and scenarios are matched by slug in preloadRoute.ts). */
export const PAGE_AT: Record<string, LazyPage> = {
  '/': LandingPage,
  '/login': LoginPage,
  '/signup': SignupPage,
  '/about': AboutPage,
  '/contact': ContactPage,
  '/privacy': PrivacyPolicyPage,
  '/terms': TermsOfServicePage,
  '/refund': RefundPolicyPage,
  '/guide': GuidePage,
  '/blog': BlogIndexPage,
  '/glossary': GlossaryPage,
  '/resources': ResourcesPage,
  '/resources/position-size': PositionSizeCalculatorPage,
  '/resources/risk-reward': RiskRewardCalculatorPage,
  '/resources/pip-calculator': PipCalculatorPage,
  '/resources/forex-market-hours': ForexMarketHoursPage,
  '/resources/prop-firm-drawdown-calculator': PropFirmDrawdownCalculatorPage,
  '/resources/margin-calculator': MarginCalculatorPage,
  '/resources/risk-of-ruin-calculator': RiskOfRuinCalculatorPage,
  '/resources/compounding-calculator': CompoundingCalculatorPage,
  '/resources/expectancy-calculator': ExpectancyCalculatorPage,
  '/resources/fo-turnover-calculator': FoTurnoverCalculatorPage,
  '/resources/fo-charges-rates': FoChargesRatesPage,
  '/resources/equity-curve-simulator': EquityCurveSimulatorPage,
  '/resources/forex-market-hours/new-york-session': NewYorkSessionPage,
  '/resources/forex-market-hours/london-session': LondonSessionPage,
  '/resources/forex-market-hours/asian-session': AsianSessionPage,
  '/resources/forex-market-hours/london-new-york-overlap': LondonNewYorkOverlapPage,
  '/glossary/profit-factor': ProfitFactorTermPage,
  '/glossary/expectancy': ExpectancyTermPage,
  '/glossary/r-multiple': RMultipleTermPage,
  '/glossary/win-rate': WinRateTermPage,
  '/glossary/maximum-drawdown': MaximumDrawdownTermPage,
  '/case-studies': CaseStudiesIndexPage,
  '/changelog': ChangelogPage,
  ...Object.fromEntries(CONTENT_ROUTES.map(({ path, Component }) => [path, Component])),
};
