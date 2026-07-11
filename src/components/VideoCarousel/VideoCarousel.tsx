import { ReactElement, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import './VideoCarousel.scss';

import { useIsMobile } from 'hooks/useMediaQuery';
import { BREAKPOINT_PX, TABLET_BREAKPOINT_PX } from 'constants/index';
import VideoItem from 'components/VideoItem/VideoItem';
import { VideoDataType } from 'types';
import { SwiperOptions } from 'swiper/types';

interface VideoCarouselProps<T> {
  videos: T[];
  hoverToPlay?: boolean;
  renderItem?: (video: T, index: number) => React.ReactNode;
  desktopSlidesPerView?: number;  // 한 줄에 보여줄 아이템 개수 (기본 4)
}

const ChevronIcon = ({ direction }: { direction: 'prev' | 'next' }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d={direction === 'prev' ? 'M7.5 2.5L4 6L7.5 9.5' : 'M4.5 2.5L8 6L4.5 9.5'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VideoCarousel = <T,>({
  videos,
  hoverToPlay = true,
  renderItem,
  desktopSlidesPerView = 4,
}: VideoCarouselProps<T>): ReactElement | null => {
  const isMobile = useIsMobile();
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  if (!videos || videos.length === 0) return null;

  // 고정 간격 + VideoItem width="100%" — 부모(최대 1280) 폭을 perView 로 분배
  const DESKTOP_SPACE_BETWEEN = 16;
  const TABLET_SPACE_BETWEEN = 14;

  // 태블릿(640~1023)은 카드 크기 유지를 위해 perView 한 단계 축소
  const midSlidesPerView = Math.max(2, desktopSlidesPerView - 1);

  const dynamicBreakpoints: SwiperOptions['breakpoints'] = {
    0: {
      slidesPerView: 1,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    [BREAKPOINT_PX]: {
      slidesPerView: midSlidesPerView,
      slidesPerGroup: midSlidesPerView,
      spaceBetween: TABLET_SPACE_BETWEEN,
    },
    [TABLET_BREAKPOINT_PX]: {
      slidesPerView: desktopSlidesPerView,
      slidesPerGroup: desktopSlidesPerView,
      spaceBetween: DESKTOP_SPACE_BETWEEN,
    },
  };

  const bindDesktopControls = (swiper: SwiperInstance) => {
    if (isMobile) return;

    const navigation = swiper.params.navigation;
    if (navigation && typeof navigation !== 'boolean') {
      navigation.prevEl = prevRef.current;
      navigation.nextEl = nextRef.current;
    }

    const pagination = swiper.params.pagination;
    if (pagination && typeof pagination !== 'boolean') {
      pagination.el = paginationRef.current;
    }
  };

  const initDesktopControls = (swiper: SwiperInstance) => {
    if (isMobile) return;

    bindDesktopControls(swiper);

    if (swiper.navigation) {
      swiper.navigation.destroy();
      swiper.navigation.init();
      swiper.navigation.update();
    }

    if (swiper.pagination) {
      swiper.pagination.destroy();
      swiper.pagination.init();
      swiper.pagination.render();
      swiper.pagination.update();
    }
  };

  return (
    <div className="video-carousel-container">
      {/* 데스크톱: 페이지네이션 양옆 화살표. Swiper init 전에 DOM에 있어야 하므로 위에 두고 order 로 아래로 배치 */}
      {!isMobile && (
        <div className="video-carousel-controls">
          <button
            ref={prevRef}
            type="button"
            className="video-carousel-nav-btn"
            aria-label="이전 페이지"
          >
            <ChevronIcon direction="prev" />
          </button>
          <div ref={paginationRef} className="video-carousel-pagination" />
          <button
            ref={nextRef}
            type="button"
            className="video-carousel-nav-btn"
            aria-label="다음 페이지"
          >
            <ChevronIcon direction="next" />
          </button>
        </div>
      )}

      <Swiper
        key={isMobile ? 'mobile' : 'desktop'}
        modules={[Pagination, Navigation]}
        // 실제 el/prevEl/nextEl 은 렌더 중 ref 접근을 피해 onBeforeInit(bindDesktopControls)에서 바인딩
        pagination={
          isMobile ? { enabled: false } : { clickable: true, el: null }
        }
        navigation={
          isMobile
            ? { enabled: true }
            : { enabled: true, prevEl: null, nextEl: null }
        }
        onBeforeInit={bindDesktopControls}
        onSwiper={initDesktopControls}
        watchOverflow={false}
        allowTouchMove={false}
        breakpoints={dynamicBreakpoints}
        style={
          {
            paddingTop: '16px',
            paddingBottom: isMobile ? '16px' : '6px',
            // 좌우 0 — 부모 셸 폭을 그대로 사용
            paddingLeft: 0,
            paddingRight: 0,
            marginLeft: 0,
            marginRight: 0,
            '--swiper-pagination-color': '#76FECE',
            '--swiper-pagination-bullet-inactive-color': '#76FECE',
            '--swiper-pagination-bullet-inactive-opacity': '0.4',
            '--swiper-pagination-bullet-size': '10px',
            '--swiper-pagination-bullet-horizontal-gap': '6px',
            '--swiper-navigation-color': '#76FECE',
            '--swiper-navigation-size': '18px',
          } as React.CSSProperties
        }
      >
        {videos.map((v, i) => {
          const record = v as Record<string, unknown>;
          return (
            <SwiperSlide key={`${(record.uuid ?? record.id ?? record.video_id ?? '')}-${i}`}>
              {renderItem ? (
                renderItem(v, i)
              ) : (() => {
                const video = v as unknown as VideoDataType;
                return (
                  <VideoItem
                    type="small-emoji"
                    width="100%"
                    videoId={video.youtube_url}
                    videoUuid={video.uuid ?? video.id ?? video.video_id}
                    videoTitle={video.title}
                    videoMostEmotion={video.dominant_emotion}
                    videoMostEmotionPercentage={video.dominant_emotion_per}
                    style={
                      isMobile
                        ? { marginTop: '10px', marginBottom: '10px' }
                        : { marginBottom: '24px' }
                    }
                    hoverToPlay={hoverToPlay}
                  />
                );
              })()}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default VideoCarousel;
