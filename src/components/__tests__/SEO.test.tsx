import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { SEO } from '../SEO';

function renderSEO(props: Parameters<typeof SEO>[0]) {
  return render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>
  );
}

function getMeta(name: string): string | null {
  return (
    document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ??
    document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ??
    null
  );
}

afterEach(() => {
  document.title = '';
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach(el => el.remove());
});

describe('SEO', () => {
  it('sets title and meta description', async () => {
    renderSEO({ title: 'Test Page - TradeQut', description: 'A test description for SEO.', path: '/test' });

    await waitFor(() => {
      expect(document.title).toBe('Test Page - TradeQut');
    });
    expect(getMeta('description')).toBe('A test description for SEO.');
  });

  it('sets canonical URL', async () => {
    renderSEO({ title: 'Test', description: 'Desc', path: '/about' });

    await waitFor(() => {
      const canonical = document.querySelector('link[rel="canonical"]');
      expect(canonical?.getAttribute('href')).toBe('https://tradequt.com/about');
    });
  });

  it('sets canonical without trailing path for homepage', async () => {
    renderSEO({ title: 'Home', description: 'Desc', path: '/' });

    await waitFor(() => {
      const canonical = document.querySelector('link[rel="canonical"]');
      expect(canonical?.getAttribute('href')).toBe('https://tradequt.com');
    });
  });

  it('sets Open Graph tags', async () => {
    renderSEO({ title: 'OG Test', description: 'OG Desc', path: '/test' });

    await waitFor(() => {
      expect(getMeta('og:title')).toBe('OG Test');
    });
    expect(getMeta('og:description')).toBe('OG Desc');
    expect(getMeta('og:url')).toBe('https://tradequt.com/test');
    expect(getMeta('og:image')).toBe('https://tradequt.com/og-image.png');
    expect(getMeta('og:site_name')).toBe('TradeQut');
    expect(getMeta('og:locale')).toBe('en_US');
    expect(getMeta('og:type')).toBe('website');
  });

  it('sets Twitter Card tags', async () => {
    renderSEO({ title: 'TW Test', description: 'TW Desc', path: '/test' });

    await waitFor(() => {
      expect(getMeta('twitter:title')).toBe('TW Test');
    });
    expect(getMeta('twitter:description')).toBe('TW Desc');
    expect(getMeta('twitter:card')).toBe('summary_large_image');
    expect(getMeta('twitter:site')).toBeNull();
    expect(getMeta('twitter:image')).toBe('https://tradequt.com/og-image.png');
  });

  it('sets robots to index,follow in a production build', async () => {
    vi.stubEnv('MODE', 'production');
    renderSEO({ title: 'Public', description: 'Desc', path: '/test' });

    await waitFor(() => {
      expect(getMeta('robots')).toBe('index, follow, max-image-preview:large, max-snippet:-1');
    });
    vi.unstubAllEnvs();
  });

  it('is noindex in any non-production build, even without the noindex prop', async () => {
    vi.stubEnv('MODE', 'development');
    renderSEO({ title: 'Dev page', description: 'Desc', path: '/test' });

    await waitFor(() => {
      expect(getMeta('robots')).toBe('noindex, nofollow');
    });
    vi.unstubAllEnvs();
  });

  it('adds Search Console and Bing verification tags on the home page only', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_GSC_VERIFICATION', 'gsc-token');
    vi.stubEnv('VITE_BING_VERIFICATION', 'bing-token');
    renderSEO({ title: 'Home', description: 'Desc', path: '/' });
    await waitFor(() => {
      expect(getMeta('google-site-verification')).toBe('gsc-token');
    });
    expect(getMeta('msvalidate.01')).toBe('bing-token');
    vi.unstubAllEnvs();
  });

  it('adds article dates for type article', async () => {
    renderSEO({ title: 'Art', description: 'Desc', path: '/blog/x', type: 'article', publishedTime: '2026-11-01', modifiedTime: '2026-11-11' });
    await waitFor(() => {
      expect(getMeta('article:published_time')).toBe('2026-11-01');
    });
    expect(getMeta('article:modified_time')).toBe('2026-11-11');
  });

  it('sets robots to noindex,nofollow when noindex is true', async () => {
    renderSEO({ title: 'Private', description: 'Desc', path: '/app/dashboard', noindex: true });

    await waitFor(() => {
      expect(getMeta('robots')).toBe('noindex, nofollow');
    });
  });

  it('renders JSON-LD structured data', async () => {
    const schema = { '@context': 'https://schema.org', '@type': 'Organization', name: 'TradeQut' };
    renderSEO({ title: 'LD', description: 'Desc', path: '/', jsonLd: schema });

    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      expect(JSON.parse(script!.textContent!)).toEqual(schema);
    });
  });

  it('accepts custom og:type', async () => {
    renderSEO({ title: 'Article', description: 'Desc', path: '/guide', type: 'article' });

    await waitFor(() => {
      expect(getMeta('og:type')).toBe('article');
    });
  });
});
