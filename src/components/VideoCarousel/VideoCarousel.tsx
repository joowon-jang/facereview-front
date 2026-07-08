import { ReactElement } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import './VideoCarousel.scss';

import { useIsMobile } from 'hooks/useMediaQuery';
import { BREAKPOINT_PX } from 'constants/index';
import VideoItem from 'components/VideoItem/VideoItem';
import { VideoDataType } from 'types';
import { SwiperOptions } from 'swiper/types';

interface VideoCarouselProps<T> {
  videos: T[];
  hoverToPlay?: boolean;
  renderItem?: (video: T, index: number) => React.ReactNode;
  desktopSlidesPerView?: number;  // 한 줄에 보여줄 아이템 개수 (기본 4)
}

const VideoCarousel = <T,>({
  videos,
  hoverToPlay = true,
  renderItem,
  desktopSlidesPerView = 4,
}: VideoCarouselProps<T>): ReactElement | null => {
  const isMobile = useIsMobile();

  if (!videos || videos.length === 0) return null;

  // 고정 간격 + VideoItem width="100%" 조합 — Swiper 가 컨테이너 폭을 perView 로 자동 분배.
  // (이전 desktopContainerWidth 역산은 부모 폭과 무관하게 1200px 을 가정해 좁은 화면에서 깨졌다)
  const DESKTOP_SPACE_BETWEEN = 24;

  // 태블릿 구간(768~1099px)에서는 카드가 너무 작아지지게 perView 를 한 단계 줄인다.
  const midSlidesPerView = Math.max(2, desktopSlidesPerView - 1);

  const dynamicBreakpoints: SwiperOptions['breakpoints'] = {
    0: {
      slidesPerView: 1,
      slidesPerGroup: 1,
      spaceBetween: 28, // 모바일 기본 간격
    },
    [BREAKPOINT_PX]: {
      slidesPerView: midSlidesPerView,
      slidesPerGroup: midSlidesPerView,
      spaceBetween: DESKTOP_SPACE_BETWEEN,
    },
    1100: {
      slidesPerView: desktopSlidesPerView,
      slidesPerGroup: desktopSlidesPerView,
      spaceBetween: DESKTOP_SPACE_BETWEEN,
    },
  };

  return (
    <div className="video-carousel-container">
      <Swiper
        key={isMobile ? 'mobile' : 'desktop'}
        modules={[Pagination, Navigation]}
        pagination={{ clickable: true, enabled: !isMobile }}
        navigation={{ enabled: isMobile }}
        watchOverflow={false}
        allowTouchMove={false}
        breakpoints={dynamicBreakpoints}
        style={
          {
            paddingTop: '20px',
            paddingBottom: '24px',
            paddingLeft: isMobile ? '16px' : '20px',
            paddingRight: isMobile ? '16px' : '20px',
            marginLeft: isMobile ? '-16px' : '-20px',
            marginRight: isMobile ? '-16px' : '-20px',
            '--swiper-pagination-bottom': '0px',
            '--swiper-pagination-color': '#76FECE', // 활성 점 (포인트 컬러)
            '--swiper-pagination-bullet-inactive-color': '#76FECE', // 비활성 점 (동일 통일감 부여)
            '--swiper-pagination-bullet-inactive-opacity': '0.4', // 불투명도로만 구분
            '--swiper-pagination-bullet-size': '10px',
            '--swiper-pagination-bullet-horizontal-gap': '6px',
            '--swiper-navigation-color': '#76FECE', // 모바일 네비게이션 화살표 컬러
            '--swiper-navigation-size': '18px', // 원형 내부에 맞게 화살표 크기 축소 (여백감 부여)
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
                        ? { marginTop: '14px', marginBottom: '14px' }
                        : { marginBottom: '56px' }
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
