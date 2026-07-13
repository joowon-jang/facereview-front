export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? 'https://www.facereview.net'
).replace(/\/$/, '');

export const SITE_NAME = 'FaceReview';
export const SITE_LOCALE = 'ko_KR';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

export const DEFAULT_TITLE = 'FaceReview';
export const DEFAULT_DESCRIPTION =
  '영상을 보며 느끼는 감정을 분석하고 공유하세요. FaceReview에서 내 표정으로 리뷰하는 새로운 영상 경험을 시작해 보세요.';

export const DEFAULT_KEYWORDS = [
  'FaceReview',
  '페이스리뷰',
  '감정 리뷰',
  '영상 리뷰',
  '표정 분석',
  '감정 분석',
  '얼굴 표정',
  '영상 추천',
  '감정 기반 추천',
  '리액션 영상',
  '유튜브 리뷰',
  '영상 플랫폼',
  'emotion review',
  'face emotion',
].join(', ');

export const buildUrl = (path = ''): string =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
