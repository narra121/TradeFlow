# TradeQut SEO Overhaul Design

## Context

TradeQut (tradequt.com) is a React SPA trading journal hosted on S3+CloudFront. Currently all 8+ public pages share identical meta tags from a single `index.html`, there is no sitemap, no structured data, and no pre-rendering. Google sees an empty SPA shell for every page. The OG image is hosted on a third-party domain (lovable.dev). This makes the site effectively invisible to search engines beyond the homepage.

The goal is to make all public pages SEO-compliant using 2026 best practices: build-time pre-rendering, per-page metadata, structured data, sitemap, and Core Web Vitals optimization.

## Approach: Playwright Build-Time Pre-rendering

Replace the current `generate-static-routes.js` (which copies identical index.html to each route) with a Playwright-based pre-rendering pipeline that captures fully-rendered HTML for each public page at build time.

## Architecture

### Build Pipeline

```
vite build
  → prerender-routes.ts (Playwright renders 8 public pages)
    → generate-sitemap.ts (creates sitemap.xml)
      → generate-og-image.ts (creates og-image.png)
```

**New build command:** `vite build && node --loader ts-node/esm scripts/prerender-routes.ts`

### Pre-rendering Script (`scripts/prerender-routes.ts`)

1. Start Vite preview server on a random port
2. Launch Playwright (chromium, headless)
3. For each public route:
   - Navigate to `http://localhost:{port}/{route}`
   - Wait for React Helmet Async to set meta tags
   - Wait for content to render (`networkidle`)
   - Capture `document.documentElement.outerHTML`
   - Save to `dist/{route}/index.html`
4. Shut down browser and server

### Routes to Pre-render

| Route | Title (50-60 chars) | Description (150-160 chars) |
|-------|---------------------|----------------------------|
| `/` | TradeQut - Professional Trading Journal | Track, analyze, and improve your trading performance with TradeQut. The modern trading journal for serious traders. |
| `/about` | About TradeQut - Built by Traders, for Traders | Learn about TradeQut's mission to help traders track, analyze, and improve their trading performance with modern tools. |
| `/guide` | TradeQut User Guide - Trading Journal Tutorial | Step-by-step guide to using TradeQut. Learn how to log trades, analyze performance, set goals, and track your progress. |
| `/contact` | Contact TradeQut - Support & Feedback | Get in touch with the TradeQut team. We're here to help with questions, feedback, and support for your trading journal. |
| `/privacy` | Privacy Policy - TradeQut | Read TradeQut's privacy policy. Learn how we collect, use, and protect your trading data and personal information. |
| `/terms` | Terms of Service - TradeQut | Review the terms and conditions for using TradeQut's trading journal platform and services. |
| `/refund` | Refund Policy - TradeQut | Read TradeQut's refund and cancellation policy for subscription plans and services. |
| `/login` | Login - TradeQut | Sign in to your TradeQut trading journal. Access your dashboard, trades, analytics, and insights. |
| `/signup` | Sign Up for TradeQut - Free Trading Journal | Create your free TradeQut account. Start tracking trades, analyzing performance, and improving your trading today. |

## Per-Page Metadata

### Library: `react-helmet-async`

Install `react-helmet-async`. Wrap `<App>` in `<HelmetProvider>`.

### SEO Component

Create `src/components/SEO.tsx`:

```tsx
interface SEOProps {
  title: string;
  description: string;
  path: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: object;
}
```

Each public page uses `<SEO>` to set:
- `<title>`
- `<meta name="description">`
- `<link rel="canonical" href="https://tradequt.com{path}">`
- `<meta property="og:title/description/url/image/type/site_name/locale">`
- `<meta name="twitter:card/title/description/image/site">`
- `<meta name="robots" content="index, follow">` (public) or `noindex, nofollow` (protected)
- Optional `<script type="application/ld+json">` for structured data

### Protected Routes

Add `<SEO noindex>` in the `RequireAuth` component so all `/app/*` routes get `<meta name="robots" content="noindex, nofollow">`.

Login (`/login`) and Signup (`/signup`) pages also get `<SEO noindex>` explicitly — they are pre-rendered for performance but should not be indexed (no search value, and robots.txt disallows them).

## Structured Data (JSON-LD)

### Landing Page (`/`)

**Organization:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "TradeQut",
  "url": "https://tradequt.com",
  "logo": "https://tradequt.com/favicon.svg",
  "description": "Professional trading journal for tracking and analyzing trades",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "email": "Narra77888@gmail.com",
    "telephone": "+91-8501018125"
  }
}
```

**SoftwareApplication:**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "TradeQut",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://tradequt.com",
  "description": "Professional trading journal for tracking, analyzing, and improving trading performance",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free tier available"
  }
}
```

**FAQPage** (new FAQ section at bottom of landing page):
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is TradeQut?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "TradeQut is a professional trading journal..."
      }
    }
  ]
}
```

**FAQ Questions (5-6):**
1. What is TradeQut?
2. Is TradeQut free to use?
3. What markets does TradeQut support?
4. Can I import trades from my broker?
5. How does TradeQut help improve trading performance?
6. Is my trading data secure?

### Guide Page (`/guide`)

**Article schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "TradeQut User Guide - Complete Trading Journal Tutorial",
  "description": "Step-by-step guide to using TradeQut",
  "datePublished": "2026-04-18",
  "author": { "@type": "Organization", "name": "TradeQut" },
  "publisher": { "@type": "Organization", "name": "TradeQut" }
}
```

### Contact Page (`/contact`)

**ContactPage schema** with email, phone, and address from existing content.

## Sitemap Generation

### Script: `scripts/generate-sitemap.ts`

Runs after pre-rendering. Generates `dist/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tradequt.com/</loc>
    <lastmod>2026-04-18</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://tradequt.com/guide</loc>
    <lastmod>2026-04-18</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- ... all public routes ... -->
</urlset>
```

Includes: `/`, `/about`, `/guide`, `/contact`, `/privacy`, `/terms`, `/refund`
Excludes: `/login`, `/signup`, `/app/*`, `/auth/*`

## Robots.txt

Replace `TradeFlow/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /app/
Disallow: /auth/
Disallow: /login
Disallow: /signup

Sitemap: https://tradequt.com/sitemap.xml
```

## OG Image Generation

### Script: `scripts/generate-og-image.ts`

Uses Playwright to render an HTML template to a 1200x630px PNG:
- Dark background matching TradeQut brand colors
- TradeQut logo/icon (from favicon.svg)
- Tagline: "Professional Trading Journal"
- Subtle trading chart decorative element via CSS
- Output: `dist/og-image.png`

All pages reference `https://tradequt.com/og-image.png` in OG/Twitter meta tags.

## Semantic HTML Improvements

### All Public Pages

1. **`<main id="main-content">`** — wrap primary content
2. **Skip-to-content link** — `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>` in the layout
3. **`<article>`** — wrap self-contained content (guide sections, policy text)
4. **`aria-label`** — on all `<nav>` elements and interactive sections
5. **Heading hierarchy** — verify h1 → h2 → h3 consistency (already mostly good)

### Image Optimization

- Convert guide PNGs to WebP at build time using the `sharp` library
- Use `<picture>` element: `<source type="image/webp">` + `<img>` fallback
- Add explicit `width` and `height` attributes to all `<img>` tags
- Existing `loading="lazy"` and `decoding="async"` are retained

## Core Web Vitals

### LCP Optimization
- Pre-rendered HTML eliminates JS parsing delay for first paint
- Add `<link rel="preconnect" href="https://pagead2.googlesyndication.com">` for AdSense
- Hero text visible in pre-rendered HTML immediately

### CLS Prevention
- Explicit `width`/`height` on all images
- Reserve space for AdSense areas
- Already good: navbar has fixed `h-16` height

### INP
- No changes needed — existing code-splitting and lazy-loading are sufficient

## Cleanup

1. **Remove** GitHub Pages SPA redirect script from `index.html` (lines 26-38)
2. **Remove** `<meta name="keywords">` tag (Google ignores since 2009)
3. **Add** missing OG tags: `og:url`, `og:site_name`, `og:locale`
4. **Replace** lovable.dev OG image URL with `https://tradequt.com/og-image.png`
5. **Update** `<link rel="canonical">` to be dynamic per page (via SEO component)

## Files to Create/Modify

### New Files
- `src/components/SEO.tsx` — reusable SEO component
- `src/config/seo.ts` — per-page SEO configuration data
- `scripts/prerender-routes.ts` — Playwright pre-rendering script
- `scripts/generate-sitemap.ts` — sitemap generator
- `scripts/generate-og-image.ts` — OG image generator
- `scripts/og-template.html` — HTML template for OG image

### Modified Files
- `package.json` — add `react-helmet-async` dep, update build script
- `src/App.tsx` — wrap in `<HelmetProvider>`
- `src/pages/LandingPage.tsx` — add `<SEO>`, add FAQ section, semantic HTML
- `src/pages/AboutPage.tsx` — add `<SEO>`, semantic HTML
- `src/pages/GuidePage.tsx` — add `<SEO>`, `<picture>` elements, semantic HTML
- `src/pages/ContactPage.tsx` — add `<SEO>`, structured data, semantic HTML
- `src/pages/PrivacyPolicyPage.tsx` — add `<SEO>`, semantic HTML
- `src/pages/TermsOfServicePage.tsx` — add `<SEO>`, semantic HTML
- `src/pages/RefundPolicyPage.tsx` — add `<SEO>`, semantic HTML
- `src/pages/LoginPage.tsx` — add `<SEO>`
- `src/pages/SignupPage.tsx` — add `<SEO>`
- `src/components/RequireAuth.tsx` — add noindex `<SEO>`
- `index.html` — remove GH Pages script, remove keywords meta, update OG tags
- `public/robots.txt` — add Disallow rules, sitemap reference
- `scripts/generate-static-routes.js` — **DELETE** (replaced by prerender script)

## Verification

1. **Build succeeds:** `bun run build` completes without errors
2. **Pre-rendered HTML:** Check `dist/about/index.html` contains rendered content, not empty SPA shell
3. **Meta tags:** Each page's HTML has unique title, description, canonical
4. **Structured data:** Validate JSON-LD with Google's Rich Results Test
5. **Sitemap:** `dist/sitemap.xml` exists with correct URLs
6. **OG image:** `dist/og-image.png` exists and is 1200x630px
7. **robots.txt:** Verify Disallow rules and sitemap reference
8. **Tests pass:** `bun run test` — all 1,284+ frontend tests pass
9. **Dev server:** `bun run dev` — verify all pages render with correct meta tags
10. **Lighthouse audit:** Run Lighthouse on pre-rendered pages, target 90+ SEO score
