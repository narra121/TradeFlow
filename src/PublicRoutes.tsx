import { Route } from 'react-router-dom';
import { CONTENT_ROUTES } from '@/content/routes';
import {
  PrivacyPolicyPage,
  TermsOfServicePage,
  RefundPolicyPage,
  ContactPage,
  AboutPage,
  GuidePage,
  BlogIndexPage,
  BlogArticlePage,
  GlossaryPage,
  ResourcesPage,
  PositionSizeCalculatorPage,
  RiskRewardCalculatorPage,
  PipCalculatorPage,
  ForexMarketHoursPage,
  PropFirmDrawdownCalculatorPage,
  MarginCalculatorPage,
  RiskOfRuinCalculatorPage,
  CompoundingCalculatorPage,
  ExpectancyCalculatorPage,
  FoTurnoverCalculatorPage,
  FoChargesRatesPage,
  EquityCurveSimulatorPage,
  NewYorkSessionPage,
  LondonSessionPage,
  AsianSessionPage,
  LondonNewYorkOverlapPage,
  ProfitFactorTermPage,
  ExpectancyTermPage,
  RMultipleTermPage,
  WinRateTermPage,
  MaximumDrawdownTermPage,
  CaseStudiesIndexPage,
  CaseStudyPage,
  ChangelogPage,
} from '@/content/publicPages';

// Public pages: no store, no auth. Shared by the full app (App.tsx) and the light public entry (PublicApp.tsx).
export { LandingPage, NotFound } from '@/content/publicPages';

export const PublicRoutes = (
  <>
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/refund" element={<RefundPolicyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/blog" element={<BlogIndexPage />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
        <Route path="/glossary" element={<GlossaryPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/resources/position-size" element={<PositionSizeCalculatorPage />} />
        <Route path="/resources/risk-reward" element={<RiskRewardCalculatorPage />} />
        <Route path="/resources/pip-calculator" element={<PipCalculatorPage />} />
        <Route path="/resources/forex-market-hours" element={<ForexMarketHoursPage />} />
        <Route path="/resources/prop-firm-drawdown-calculator" element={<PropFirmDrawdownCalculatorPage />} />
        <Route path="/resources/margin-calculator" element={<MarginCalculatorPage />} />
        <Route path="/resources/risk-of-ruin-calculator" element={<RiskOfRuinCalculatorPage />} />
        <Route path="/resources/compounding-calculator" element={<CompoundingCalculatorPage />} />
        <Route path="/resources/expectancy-calculator" element={<ExpectancyCalculatorPage />} />
        <Route path="/resources/fo-turnover-calculator" element={<FoTurnoverCalculatorPage />} />
        <Route path="/resources/fo-charges-rates" element={<FoChargesRatesPage />} />
        <Route path="/resources/equity-curve-simulator" element={<EquityCurveSimulatorPage />} />
        <Route path="/resources/forex-market-hours/new-york-session" element={<NewYorkSessionPage />} />
        <Route path="/resources/forex-market-hours/london-session" element={<LondonSessionPage />} />
        <Route path="/resources/forex-market-hours/asian-session" element={<AsianSessionPage />} />
        <Route path="/resources/forex-market-hours/london-new-york-overlap" element={<LondonNewYorkOverlapPage />} />
        <Route path="/glossary/profit-factor" element={<ProfitFactorTermPage />} />
        <Route path="/glossary/expectancy" element={<ExpectancyTermPage />} />
        <Route path="/glossary/r-multiple" element={<RMultipleTermPage />} />
        <Route path="/glossary/win-rate" element={<WinRateTermPage />} />
        <Route path="/glossary/maximum-drawdown" element={<MaximumDrawdownTermPage />} />
        <Route path="/case-studies" element={<CaseStudiesIndexPage />} />
        <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        {CONTENT_ROUTES.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
  </>
);
