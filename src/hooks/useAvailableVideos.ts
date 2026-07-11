import { useEffect, useState } from 'react';
import { parseYoutubeId } from 'utils';

// 유튜브에서 삭제/비공개 처리된 영상은 썸네일 CDN이 404를 반환하지만,
// 응답 바디는 디코딩 가능한 120x90 회색 placeholder 이미지라 <img>의
// onload 가 정상적으로 발생한다(onerror 로는 구분 불가). 대신 실제
// 썸네일(mqdefault 기준 320x180)과 다른 고정 크기(120x90)로 판별한다.
// 앱 전역에서 같은 영상 ID를 반복 조회하지 않도록 판정 결과를 캐싱한다.
const PLACEHOLDER_WIDTH = 120;
const PLACEHOLDER_HEIGHT = 90;

const availabilityCache = new Map<string, boolean>();

const checkAvailability = (youtubeId: string): Promise<boolean> => {
  const cached = availabilityCache.get(youtubeId);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const isPlaceholder =
        img.naturalWidth === PLACEHOLDER_WIDTH &&
        img.naturalHeight === PLACEHOLDER_HEIGHT;
      const isAvailable = !isPlaceholder;
      availabilityCache.set(youtubeId, isAvailable);
      resolve(isAvailable);
    };
    img.onerror = () => {
      availabilityCache.set(youtubeId, false);
      resolve(false);
    };
    img.src = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
  });
};

/**
 * 유튜브에서 삭제되거나 비공개로 전환된 영상을 목록에서 제외한다.
 * WatchPage 메인 영상의 onError(react-youtube) 감지와 동일한 목적을,
 * 재생 없이 썸네일 요청만으로 확인하는 방식으로 목록 컴포넌트에 적용한 것.
 */
export function useAvailableVideos<T extends { youtube_url: string }>(
  videos: T[],
): T[] {
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    let cancelled = false;

    videos.forEach((video) => {
      const youtubeId = parseYoutubeId(video.youtube_url);
      if (!youtubeId) return;

      checkAvailability(youtubeId).then((isAvailable) => {
        if (cancelled || isAvailable) return;
        setUnavailableIds((prev) =>
          prev.has(youtubeId) ? prev : new Set(prev).add(youtubeId),
        );
      });
    });

    return () => {
      cancelled = true;
    };
  }, [videos]);

  if (unavailableIds.size === 0) return videos;
  return videos.filter(
    (video) => !unavailableIds.has(parseYoutubeId(video.youtube_url)),
  );
}

export default useAvailableVideos;
