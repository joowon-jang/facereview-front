import { Helmet } from 'react-helmet-async';
import { ReactElement } from 'react';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  DEFAULT_TITLE,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  buildUrl,
} from 'constants/seo';

type SeoProps = {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  path?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
};

const Seo = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_OG_IMAGE,
  path = '',
  type = 'website',
  noindex = false,
}: SeoProps): ReactElement => {
  const url = path ? buildUrl(path) : SITE_URL;
  const fullTitle =
    title === DEFAULT_TITLE ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <html lang="ko" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={SITE_LOCALE} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={String(DEFAULT_OG_IMAGE_WIDTH)} />
      <meta
        property="og:image:height"
        content={String(DEFAULT_OG_IMAGE_HEIGHT)}
      />
      <meta property="og:image:alt" content={`${SITE_NAME} 대표 이미지`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default Seo;
