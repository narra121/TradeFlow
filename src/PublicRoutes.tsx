import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { CONTENT_ROUTES } from '@/content/routes';

// Public pages: no store, no auth. Shared by the full app (App.tsx) and the light public entry (PublicApp.tsx).
export const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
export const NotFound = lazy(() => import('./pages/NotFound'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage').then(m => ({ default: m.RefundPolicyPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const GuidePage = lazy(() => import('./pages/GuidePage').then(m => ({ default: m.GuidePage })));
const BlogIndexPage = lazy(() => import('./pages/blog/BlogIndexPage').then(m => ({ default: m.BlogIndexPage })));
const BlogArticlePage = lazy(() => import('./pages/blog/BlogArticlePage').then(m => ({ default: m.BlogArticlePage })));
const GlossaryPage = lazy(() => import('./pages/glossary/GlossaryPage').then(m => ({ default: m.GlossaryPage })));
const ResourcesPage = lazy(() => import('./pages/resources/ResourcesPage').then(m => ({ default: m.ResourcesPage })));
const PositionSizeCalculatorPage = lazy(() => import('./pages/resources/PositionSizeCalculatorPage').then(m => ({ default: m.PositionSizeCalculatorPage })));
const RiskRewardCalculatorPage = lazy(() => import('./pages/resources/RiskRewardCalculatorPage').then(m => ({ default: m.RiskRewardCalculatorPage })));
const PipCalculatorPage = lazy(() => import('./pages/resources/PipCalculatorPage').then(m => ({ default: m.PipCalculatorPage })));
const CaseStudiesIndexPage = lazy(() => import('./pages/case-studies/CaseStudiesIndexPage').then(m => ({ default: m.CaseStudiesIndexPage })));
const CaseStudyPage = lazy(() => import('./pages/case-studies/CaseStudyPage').then(m => ({ default: m.CaseStudyPage })));
const ChangelogPage = lazy(() => import('./pages/changelog/ChangelogPage').then(m => ({ default: m.ChangelogPage })));

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
        <Route path="/case-studies" element={<CaseStudiesIndexPage />} />
        <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        {CONTENT_ROUTES.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
  </>
);
