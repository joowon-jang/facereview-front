import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const buildDir = resolve(root, 'build');
const indexHtmlPath = resolve(buildDir, 'index.html');

const SITE_URL = (
  process.env.VITE_SITE_URL ?? 'https://facereview.net'
).replace(/\/$/, '');

const API_BASE = (
  process.env.VITE_API_BASE_URL ?? 'https://facereview-api.winterholic.net'
).replace(/\/$/, '');

const esc = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const setTag = (html, regex, replacement) =>
  html.replace(regex, (...args) => {
    const groups = args[args.length - 1];
    return (groups.prefix ?? '') + replacement + (groups.suffix ?? '');
  });

const setMetaProperty = (html, prop, value) =>
  setTag(
    html,
    new RegExp(
      `(?<prefix><meta\\s+property="${prop}"\\s+content=")[^"]*(?<suffix>"\\s*/>)`,
    ),
    esc(value),
  );

const setMetaName = (html, name, value) =>
  setTag(
    html,
    new RegExp(
      `(?<prefix><meta\\s+name="${name}"\\s+content=")[^"]*(?<suffix>"\\s*/>)`,
    ),
    esc(value),
  );

//NOTE: baseHtml는 readFileSync 이후에 채워지며, buildPage는 그 시점의 값을 참조한다.
let baseHtml = '';

const buildPage = ({
  title,
  description,
  path,
  image,
  imageWidth,
  imageHeight,
  type,
  noindex = false,
  jsonLd,
  bodyHtml,
}) => {
  let html = baseHtml;

  html = html.replace(/<title>.*?<\/title>/s, `<title>${esc(title)}</title>`);
  html = setMetaName(html, 'description', description);
  html = html.replace(
    /(?<prefix><link\s+rel="canonical"\s+href=")[^"]*(?<suffix>"\s*\/>)/,
    (...args) => {
      const g = args[args.length - 1];
      return g.prefix + esc(`${SITE_URL}${path}`) + g.suffix;
    },
  );

  html = setMetaProperty(html, 'og:type', type);
  html = setMetaProperty(html, 'og:title', title);
  html = setMetaProperty(html, 'og:description', description);
  html = setMetaProperty(html, 'og:url', `${SITE_URL}${path}`);
  html = setMetaProperty(html, 'og:image', image);
  html = setMetaProperty(html, 'og:image:alt', title);
  if (imageWidth) html = setMetaProperty(html, 'og:image:width', imageWidth);
  if (imageHeight) html = setMetaProperty(html, 'og:image:height', imageHeight);

  html = setMetaName(html, 'twitter:title', title);
  html = setMetaName(html, 'twitter:description', description);
  html = setMetaName(html, 'twitter:image', image);

  const headTail = [];
  if (noindex) {
    headTail.push('    <meta name="robots" content="noindex, nofollow" />');
  }
  if (jsonLd) {
    headTail.push(
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    );
  }
  if (headTail.length) {
    html = html.replace('</head>', `${headTail.join('\n')}\n  </head>`);
  }

  // 크롤러(특히 JS 렌더링이 제한적인 네이버 등)가 읽을 수 있도록 정적 본문을
  // #root에 넣는다. React가 createRoot().render()로 마운트하면서 교체하므로
  // 앱 동작에는 영향이 없다. noindex 페이지는 어차피 색인되지 않으므로 생략.
  const seoBody =
    bodyHtml ??
    (noindex
      ? ''
      : `<h1>${esc(title)}</h1><p>${esc(description)}</p>`);
  if (seoBody) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"><main style="max-width:720px;margin:0 auto;padding:48px 24px;color:#e8e9ef">${seoBody}</main></div>`,
    );
  }

  const outPath = resolve(buildDir, `${path.replace(/^\//, '')}`, 'index.html');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  return outPath;
};

const defaultImage = `${SITE_URL}/og-image.png`;

const mainBodyHtml = [
  '<h1>FaceReview 페이스리뷰 - 내 표정으로 리뷰하는 AI 감정 분석 영상 플랫폼</h1>',
  '<p>FaceReview(페이스리뷰)는 AI 얼굴 인식 기술로 영상을 시청하는 동안의 표정을 실시간 분석해, 웃음·슬픔·놀람 같은 감정 변화를 자동으로 기록하고 공유하는 감정 리뷰 영상 플랫폼입니다.</p>',
  '<h2>실시간 표정 인식과 감정 분석</h2>',
  '<p>웹캠 기반 얼굴 인식으로 영상을 보는 동안의 표정을 분석해 행복, 슬픔, 놀람, 분노 등 감정을 실시간으로 기록합니다. 별도의 리뷰 작성 없이 내 표정이 곧 리뷰가 됩니다.</p>',
  '<h2>시청자 감정 타임라인</h2>',
  '<p>다른 시청자들이 영상의 어떤 장면에서 웃고 놀랐는지 구간별 감정 그래프로 확인할 수 있습니다. 리액션 영상을 따로 찾아보지 않아도 시청자들의 반응을 한눈에 볼 수 있어요.</p>',
  '<h2>감정 기반 영상 추천</h2>',
  '<p>내 감정 데이터를 바탕으로 드라마, 예능, 먹방, 음악 등 다양한 장르에서 취향에 맞는 영상을 추천해 드립니다. 영상을 많이 볼수록 추천이 더 정확해집니다.</p>',
].join('\n');

const staticRoutes = [
  {
    path: '/main',
    title: 'FaceReview 페이스리뷰 - AI 표정 인식 감정 분석 영상 플랫폼',
    description:
      'FaceReview(페이스리뷰) 홈에서 감정 기반으로 추천되는 영상들을 만나보세요. AI 얼굴 인식으로 표정을 분석해 드라마, 예능, 먹방, 음악까지 다양한 장르의 인기 영상을 내 표정으로 리뷰할 수 있어요.',
    type: 'website',
    index: true,
    priority: '1.0',
    changefreq: 'daily',
    bodyHtml: mainBodyHtml,
  },
  {
    path: '/auth/1',
    title: '로그인 | FaceReview',
    description:
      'FaceReview에 로그인하고 내 표정으로 영상을 리뷰해 보세요. 회원가입 후 좋아하는 장르를 선택하면 더 정확한 영상 추천을 받을 수 있어요.',
    type: 'website',
    index: true,
    priority: '0.5',
    changefreq: 'monthly',
  },
  {
    path: '/auth/2',
    title: '회원가입 | FaceReview',
    description:
      'FaceReview에 가입하고 내 표정으로 영상을 리뷰해 보세요. 좋아하는 장르를 선택하면 더 정확한 영상 추천을 받을 수 있어요.',
    type: 'website',
    index: true,
    priority: '0.5',
    changefreq: 'monthly',
  },
  {
    path: '/auth/3',
    title: '관심사 선택 | FaceReview',
    description:
      '관심 있는 장르를 선택해 맞춤 영상 추천을 받아보세요. FaceReview에서 감정 기반으로 큐레이션된 영상을 즐겨보세요.',
    type: 'website',
    index: true,
    priority: '0.4',
    changefreq: 'monthly',
  },
  {
    path: '/tutorial/1',
    title: '사용 방법 안내 (1/3) | FaceReview',
    description:
      'FaceReview 사용법을 알아보세요. 감정 기반 영상 추천, 실시간 표정 기록, 맞춤 추천 기능이 어떻게 작동하는지 단계별로 안내해 드려요.',
    type: 'website',
    index: true,
    priority: '0.4',
    changefreq: 'monthly',
  },
  {
    path: '/tutorial/2',
    title: '사용 방법 안내 (2/3) | FaceReview',
    description:
      'FaceReview 사용법 - 영상 시청 중 실시간 표정 기록이 어떻게 작동하는지 알아보세요.',
    type: 'website',
    index: true,
    priority: '0.4',
    changefreq: 'monthly',
  },
  {
    path: '/tutorial/3',
    title: '사용 방법 안내 (3/3) | FaceReview',
    description:
      'FaceReview 사용법 - 영상을 많이 볼수록 더 정확한 맞춤 추천을 받을 수 있어요.',
    type: 'website',
    index: true,
    priority: '0.4',
    changefreq: 'monthly',
  },
  {
    path: '/my',
    title: '마이페이지 | FaceReview',
    description:
      '내 감정 리뷰 통계와 최근 시청 영상을 FaceReview 마이페이지에서 확인하세요.',
    type: 'website',
    noindex: true,
  },
  {
    path: '/bookmark',
    title: '즐겨찾기 | FaceReview',
    description: '내가 북마크한 영상들을 감정별로 모아보세요.',
    type: 'website',
    noindex: true,
  },
  {
    path: '/my/password-change',
    title: '비밀번호 변경 | FaceReview',
    description:
      'FaceReview 계정의 비밀번호를 이메일 인증으로 안전하게 변경하세요.',
    type: 'website',
    noindex: true,
  },
  {
    path: '/edit',
    title: '프로필 편집 | FaceReview',
    description:
      '닉네임, 프로필 이미지, 관심 장르를 수정하고 FaceReview를 나에게 맞게 설정하세요.',
    type: 'website',
    noindex: true,
  },
];

const fetchAllVideos = async () => {
  const videos = [];
  let page = 1;
  const size = 100;
  const maxPages = 50;
  while (page <= maxPages) {
    const url = `${API_BASE}/api/v2/home/video/all?page=${page}&size=${size}&emotion=all`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const payload = json.data ?? json;
    const items = Array.isArray(payload?.videos) ? payload.videos : [];
    if (items.length === 0) break;
    for (const v of items) {
      if (!v?.video_id || !v?.youtube_url || !v?.title) continue;
      videos.push({
        video_id: String(v.video_id),
        title: String(v.title),
        youtube_url: String(v.youtube_url),
      });
    }
    if (!payload?.has_next) break;
    page += 1;
  }
  return videos;
};

// 영상별 고화질 썸네일을 빌드 시점에 검증한다. 일부 영상은 maxresdefault 가
// 없어(404) OG 미리보기가 깨지므로, HEAD 로 확인 후 항상 존재하는 hqdefault
// 로 폴백한다. ytimg CDN 은 maxresdefault 가 없으면 200 placeholder 가 아니라
// 404를 주므로 상태코드로 신뢰 가능하다.
const pickThumbnail = async (youtubeId) => {
  const variants = [
    { file: 'maxresdefault', width: 1280, height: 720 },
    { file: 'hqdefault', width: 480, height: 360 },
  ];
  for (const v of variants) {
    const url = `https://i.ytimg.com/vi/${youtubeId}/${v.file}.jpg`;
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (res.status === 200) {
        return { url, width: v.width, height: v.height };
      }
    } catch {
      // 네트워크/CDN 일시 오류면 다음 후보로
    }
  }
  return {
    url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    width: 480,
    height: 360,
  };
};

// 동시성을 제한하며 매핑(수백 개 영상의 썸네일을 한 번에 요청하지 않도록).
const mapPool = async (items, limit, fn) => {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const idx = cursor;
        cursor += 1;
        results[idx] = await fn(items[idx], idx);
      }
    },
  );
  await Promise.all(workers);
  return results;
};

const writeSitemap = (videos) => {
  const urls = [];
  for (const r of staticRoutes.filter((r) => r.index)) {
    urls.push(
      `  <url>\n    <loc>${esc(`${SITE_URL}${r.path}`)}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
    );
  }
  for (const v of videos) {
    urls.push(
      `  <url>\n    <loc>${esc(`${SITE_URL}/watch/${v.video_id}`)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
    );
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  writeFileSync(resolve(buildDir, 'sitemap.xml'), xml);
  return urls.length;
};

console.log('▶ Prerendering static routes...');
baseHtml = readFileSync(indexHtmlPath, 'utf8');

for (const route of staticRoutes) {
  buildPage({
    ...route,
    image: defaultImage,
    imageWidth: 1200,
    imageHeight: 630,
  });
  console.log(`  ✓ ${route.path}`);
}

let videos = [];
try {
  console.log('▶ Fetching video list from backend...');
  videos = await fetchAllVideos();
  console.log(`  ✓ Fetched ${videos.length} videos`);
} catch (e) {
  console.warn(
    `  ⚠ Video fetch failed (${e.message}); skipping dynamic /watch/* and video sitemap entries`,
  );
}

if (videos.length) {
  console.log('▶ Resolving video thumbnails...');
  const thumbnails = await mapPool(videos, 8, (v) =>
    pickThumbnail(String(v.youtube_url)),
  );
  console.log(`  ✓ Resolved ${thumbnails.length} thumbnails`);

  console.log('▶ Prerendering video watch pages...');
  videos.forEach((v, i) => {
    const thumbnail = thumbnails[i];
    const description = `${v.title} — FaceReview에서 영상을 보며 AI 얼굴 인식으로 실시간 감정을 분석하고, 다른 시청자들의 감정 리뷰를 확인해 보세요.`;
    buildPage({
      path: `/watch/${v.video_id}`,
      title: `${v.title} | FaceReview`,
      description,
      bodyHtml: `<h1>${esc(v.title)}</h1><p>${esc(description)}</p><p>FaceReview(페이스리뷰)는 영상을 시청하는 동안 표정 인식으로 감정 변화를 기록하고, 시청자들의 감정 타임라인을 구간별로 보여주는 감정 분석 영상 플랫폼입니다.</p>`,
      image: thumbnail.url,
      imageWidth: thumbnail.width,
      imageHeight: thumbnail.height,
      type: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: v.title,
        description,
        thumbnailUrl: [thumbnail.url],
        embedUrl: `https://www.youtube.com/embed/${v.youtube_url}`,
        contentUrl: `https://www.youtube.com/watch?v=${v.youtube_url}`,
      },
    });
  });
  console.log(`  ✓ ${videos.length} watch pages`);
}

console.log('▶ Generating sitemap.xml...');
const sitemapCount = writeSitemap(videos);
console.log(`  ✓ sitemap.xml (${sitemapCount} urls)`);

console.log('▶ Done.');
