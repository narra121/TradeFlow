import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '@/content/product-facts';

const OG_IMAGE = `${SITE_URL}/og-image.png`;
const SITE_NAME = 'TradeQut';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  /** Forces `noindex`; builds that are not `--mode production` are always noindex. */
  noindex?: boolean;
  image?: string;
  /** YYYY-MM-DD or ISO date; only emitted for type="article". */
  publishedTime?: string;
  modifiedTime?: string;
  jsonLd?: object;
}

export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '' : path}`;
}

export function SEO({
  title,
  description,
  path,
  type = 'website',
  noindex = false,
  image = OG_IMAGE,
  publishedTime,
  modifiedTime,
  jsonLd,
}: SEOProps) {
  const url = canonicalUrl(path);
  const blocked = noindex || import.meta.env.MODE !== 'production';
  const robotsContent = blocked ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1';
  const gsc = path === '/' ? String(import.meta.env.VITE_GSC_VERIFICATION ?? '').trim() : '';
  const bing = path === '/' ? String(import.meta.env.VITE_BING_VERIFICATION ?? '').trim() : '';

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={url} />
      {gsc && <meta name="google-site-verification" content={gsc} />}
      {bing && <meta name="msvalidate.01" content={bing} />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      {type === 'article' && publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {type === 'article' && modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
