import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const buildDir = resolve(root, 'build');
const indexHtmlPath = resolve(buildDir, 'index.html');

const SITE_URL = (
  process.env.VITE_SITE_URL ?? 'https://www.facereview.net'
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
    const prefix = groups.prefix ?? '';
    const suffix = groups.suffix ?? '';
    return prefix + replacement + suffix;
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

const buildPage = ({ title, description, path, image, imageWidth, imageHeight, type, jsonLd }) => {
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

  if (jsonLd) {
    const block = `<script type="application/ld+json">${JSON.stringify(
      jsonLd,
    )}</script>`;
    html = html.replace('</head>', `${block}\n  </head>`);
  }

  const outPath = resolve(buildDir, `${path.replace(/^\//, '')}`, 'index.html');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  return outPath;
};

console.log('▶ Prerendering static routes...');
const baseHtml = readFileSync(indexHtmlPath, 'utf8');

const staticRoutes = [
  {
    path: '/main',
    title: '홈 - 감정 기반 영상 추천 | FaceReview',
    description:
      'FaceReview 홈에서 감정 기반으로 추천되는 영상들을 만나보세요. 드라마, 예능, 먹방, 음악까지 다양한 장르의 인기 영상을 내 표정으로 리뷰하세요.',
    type: 'website',
  },
  {
    path: '/auth/1',
    title: '로그인 | FaceReview',
    description:
      'FaceReview에 로그인하고 내 표정으로 영상을 리뷰해 보세요. 회원가입 후 좋아하는 장르를 선택하면 더 정확한 영상 추천을 받을 수 있어요.',
    type: 'website',
  },
  {
    path: '/auth/2',
    title: '회원가입 | FaceReview',
    description:
      'FaceReview에 가입하고 내 표정으로 영상을 리뷰해 보세요. 좋아하는 장르를 선택하면 더 정확한 영상 추천을 받을 수 있어요.',
    type: 'website',
  },
  {
    path: '/auth/3',
    title: '관심사 선택 | FaceReview',
    description:
      '관심 있는 장르를 선택해 맞춤 영상 추천을 받아보세요. FaceReview에서 감정 기반으로 큐레이션된 영상을 즐겨보세요.',
    type: 'website',
  },
  {
    path: '/tutorial/1',
    title: '사용 방법 안내 (1/3) | FaceReview',
    description:
      'FaceReview 사용법을 알아보세요. 감정 기반 영상 추천, 실시간 표정 기록, 맞춤 추천 기능이 어떻게 작동하는지 단계별로 안내해 드려요.',
    type: 'website',
  },
  {
    path: '/tutorial/2',
    title: '사용 방법 안내 (2/3) | FaceReview',
    description:
      'FaceReview 사용법 - 영상 시청 중 실시간 표정 기록이 어떻게 작동하는지 알아보세요.',
    type: 'website',
  },
  {
    path: '/tutorial/3',
    title: '사용 방법 안내 (3/3) | FaceReview',
    description:
      'FaceReview 사용법 - 영상을 많이 볼수록 더 정확한 맞춤 추천을 받을 수 있어요.',
    type: 'website',
  },
];

const defaultImage = `${SITE_URL}/og-image.png`;
for (const route of staticRoutes) {
  const out = buildPage({ ...route, image: defaultImage, imageWidth: 1200, imageHeight: 630 });
  console.log(`  ✓ ${route.path}`);
}

console.log('▶ Done.');
