import { Helmet } from 'react-helmet-async';
import { getCanonicalUrl } from '../../lib/utils';

interface SEOProps {
  title: string;
  description?: string | null;
  image?: string | null;
  path?: string;
  type?: 'website' | 'article';
}

export function SEO({ title, description, image, path = '/', type = 'website' }: SEOProps) {
  const siteTitle = title.includes('Portfolio') ? title : `${title} | Portfolio`;
  const url = getCanonicalUrl(path);
  const finalDescription = description || 'Portfolio, blog, projects, and knowledge graph.';
  const finalImage = image || `${getCanonicalUrl('/og-image.png')}`;

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={finalDescription} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={finalImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': type === 'article' ? 'Article' : 'WebSite',
          name: title,
          description: finalDescription,
          url
        })}
      </script>
    </Helmet>
  );
}
