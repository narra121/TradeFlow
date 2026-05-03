export interface ChangelogEntry {
  date: string;
  version: string;
  title: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix';
    text: string;
  }[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: '2026-04-19',
    version: '1.8.0',
    title: 'AI Insights & Chat',
    changes: [
      { type: 'feature', text: 'AI-powered trading insights via Firebase Cloud Functions' },
      { type: 'feature', text: 'Session-based chat with Gemini for personalized trade analysis' },
      { type: 'feature', text: 'Progressive rendering for real-time insight generation' },
      { type: 'feature', text: 'Rate limiting: 6 insights and 6 chat sessions per 6 hours' },
      { type: 'improvement', text: 'Firebase auth bridge for seamless Cognito-to-Firestore authentication' },
    ],
  },
  {
    date: '2026-04-18',
    version: '1.7.0',
    title: 'User Guide & SEO',
    changes: [
      { type: 'feature', text: 'Comprehensive 830-line user guide with interactive table of contents' },
      { type: 'feature', text: 'JSON-LD structured data for all public pages (Organization, FAQ, Article schemas)' },
      { type: 'improvement', text: 'Pre-rendering pipeline for static HTML generation of public routes' },
      { type: 'improvement', text: 'Sitemap generation with content-specific last-modified dates' },
      { type: 'improvement', text: 'OG image generation for social sharing' },
    ],
  },
  {
    date: '2026-04-16',
    version: '1.6.0',
    title: 'Google OAuth',
    changes: [
      { type: 'feature', text: 'Sign in with Google via Cognito federated identity' },
      { type: 'feature', text: 'Firebase custom token authentication bridge' },
      { type: 'improvement', text: 'OAuth callback page with token extraction and redirect' },
    ],
  },
  {
    date: '2026-04-14',
    version: '1.5.0',
    title: 'Stripe Payments',
    changes: [
      { type: 'feature', text: 'Stripe checkout integration for subscription payments' },
      { type: 'feature', text: 'Monthly ($1.99) and yearly ($19.99) subscription plans' },
      { type: 'feature', text: 'INR pricing support with automatic currency detection' },
      { type: 'feature', text: 'Stripe webhook handler for subscription lifecycle events' },
      { type: 'improvement', text: 'Subscription management portal via Stripe Customer Portal' },
      { type: 'fix', text: 'Migrated from Razorpay to Stripe for global payment support' },
    ],
  },
  {
    date: '2026-04-12',
    version: '1.4.0',
    title: 'AI Trade Extraction',
    changes: [
      { type: 'feature', text: 'AI-powered trade extraction from broker statement screenshots' },
      { type: 'feature', text: 'CSV and text file import with automatic field mapping' },
      { type: 'feature', text: 'Clipboard paste for quick trade import' },
      { type: 'improvement', text: 'Gemini 2.5 Flash integration for fast, accurate extraction' },
      { type: 'improvement', text: 'Parallel image processing for multi-page statements' },
    ],
  },
  {
    date: '2026-04-11',
    version: '1.3.0',
    title: 'CloudFront & Custom Domain',
    changes: [
      { type: 'feature', text: 'Custom domain setup: tradequt.com with SSL certificate' },
      { type: 'feature', text: 'CloudFront CDN distribution with Origin Access Control' },
      { type: 'feature', text: 'API custom domain: api.tradequt.com' },
      { type: 'improvement', text: 'CORS configuration for production origins' },
      { type: 'fix', text: 'Removed CodeDeploy to eliminate 120+ unnecessary CloudFormation resources' },
    ],
  },
  {
    date: '2026-04-10',
    version: '1.2.0',
    title: 'Performance & Stats',
    changes: [
      { type: 'feature', text: 'DailyStats pre-aggregation system with DynamoDB Stream processing' },
      { type: 'feature', text: 'Incremental balance tracking with atomic O(1) operations' },
      { type: 'feature', text: '11 pluggable metric processors (Strategy pattern)' },
      { type: 'improvement', text: '32 performance fixes: lazy loading, vendor chunks, KEYS_ONLY GSIs' },
      { type: 'improvement', text: 'Full responsive UX overhaul for mobile and tablet' },
      { type: 'improvement', text: 'Safety-net stats rebuild running every 6 hours' },
    ],
  },
  {
    date: '2026-04-09',
    version: '1.1.0',
    title: 'Test Suite & CI/CD',
    changes: [
      { type: 'feature', text: 'Comprehensive test suite: 3,174 tests across backend, frontend, and Firebase' },
      { type: 'feature', text: 'CI/CD pipeline: auto-deploy to dev on push to main' },
      { type: 'feature', text: 'Privacy policy, terms of service, refund policy, and contact pages' },
      { type: 'improvement', text: 'Error reporting system with ring buffers and S3 storage' },
      { type: 'improvement', text: 'ChunkErrorBoundary for auto-reload on stale deploys' },
    ],
  },
  {
    date: '2025-12-15',
    version: '1.0.0',
    title: 'MVP Launch',
    changes: [
      { type: 'feature', text: 'Trade CRUD with full journaling fields (strategy, notes, screenshots, mistakes, lessons)' },
      { type: 'feature', text: 'Analytics dashboard with win rate, profit factor, and equity curve' },
      { type: 'feature', text: 'Multi-account support for tracking prop and personal accounts' },
      { type: 'feature', text: 'Calendar view with daily P&L and weekly summaries' },
      { type: 'feature', text: 'Goals and rules tracking with compliance monitoring' },
      { type: 'feature', text: 'RTK Query with tag-based cache invalidation' },
    ],
  },
  {
    date: '2025-08-01',
    version: '0.1.0',
    title: 'Initial Backend',
    changes: [
      { type: 'feature', text: 'Serverless backend with AWS SAM (Lambda, API Gateway, DynamoDB)' },
      { type: 'feature', text: 'Trade CRUD API with Cognito JWT authentication' },
      { type: 'feature', text: 'S3 image uploads with presigned URLs' },
      { type: 'feature', text: 'User registration and login with email confirmation' },
    ],
  },
];
