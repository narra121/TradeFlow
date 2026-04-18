import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://tradequt.com';
const OG_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'TradeQut';
const TWITTER_HANDLE = '@TradeQut';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: object;
}

export function SEO({
  title,
  description,
  path,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOProps) {
  const canonicalUrl = `${BASE_URL}${path === '/' ? '' : path}`;
  const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow';

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
