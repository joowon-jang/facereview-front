import { ReactElement } from 'react';
import VideoCardSkeleton from 'components/Skeleton/VideoCardSkeleton';
import { useIsMobile } from 'hooks/useMediaQuery';
import useWindowSize from 'hooks/useWindowSize';
import './VideoCarousel.scss';

type VideoCarouselSkeletonProps = {
  /** VideoCarousel desktopSlidesPerView 와 동일 (기본 4) */
  desktopSlidesPerView?: number;
};

/**
 * VideoCarousel 의 breakpoints 와 같은 개수의 스켈레톤 카드를 한 줄로 렌더한다.
 * - mobile (&lt;640): 1
 * - tablet (640~1099): max(2, desktopSlidesPerView - 1)
 * - desktop (≥1100): desktopSlidesPerView
 */
const VideoCarouselSkeleton = ({
  desktopSlidesPerView = 4,
}: VideoCarouselSkeletonProps): ReactElement => {
  const isMobile = useIsMobile();
  const windowWidth = useWindowSize();

  const count = isMobile
    ? 1
    : windowWidth >= 1100
      ? desktopSlidesPerView
      : Math.max(2, desktopSlidesPerView - 1);

  return (
    <div
      className="video-carousel-skeleton"
      role="status"
      aria-busy="true"
      aria-label="추천 영상 불러오는 중">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton
          key={`carousel-skeleton-${i}`}
          width="100%"
          style={
            isMobile
              ? { marginTop: 10, marginBottom: 10 }
              : { marginBottom: 32 }
          }
        />
      ))}
    </div>
  );
};

export default VideoCarouselSkeleton;
