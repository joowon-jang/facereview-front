export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? 'https://facereview.net'
).replace(/\/$/, '');

export const SITE_NAME = 'FaceReview';
export const SITE_LOCALE = 'ko_KR';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

export const DEFAULT_TITLE =
  'FaceReview 페이스리뷰 - AI 표정 인식 감정 분석 영상 플랫폼';
export const DEFAULT_DESCRIPTION =
  'FaceReview(페이스리뷰)는 AI 얼굴 인식으로 영상을 보는 동안의 표정을 실시간 분석해 감정 리뷰를 만들어 주는 영상 플랫폼입니다. 웃음, 슬픔, 놀람 같은 감정 변화를 기록하고 다른 시청자들과 공유해 보세요.';

export const DEFAULT_KEYWORDS = [
  'FaceReview',
  '페이스리뷰',
  '감정 분석',
  'AI 감정 분석',
  '얼굴 인식',
  '표정 인식',
  '표정 분석',
  '감정 인식',
  '실시간 표정 분석',
  '감정 리뷰',
  '영상 리뷰',
  '리액션',
  '리액션 영상',
  '감정 기반 추천',
  '영상 추천',
  '유튜브 리뷰',
  '영상 플랫폼',
  'emotion AI',
  'emotion review',
  'face emotion',
  'facial expression recognition',
].join(', ');

export const buildUrl = (path = ''): string =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
