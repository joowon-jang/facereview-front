import { useInfiniteQuery } from '@tanstack/react-query';
import { getBookmarkVideos } from 'api/youtube';
import Chip from 'components/Chip/Chip';
import Seo from 'components/Seo/Seo';
import VideoCardSkeleton from 'components/Skeleton/VideoCardSkeleton';
import VideoItem from 'components/VideoItem/VideoItem';
import { EMOTIONS } from 'constants/index';
import useIntersectionObserver from 'hooks/useIntersectionObserver';
import { useIsMobile } from 'hooks/useMediaQuery';
import { ReactElement, useCallback, useMemo, useState } from 'react';
import { EmotionType } from 'types';

import './bookmarkpage.scss';

const BookmarkPage = (): ReactElement => {
  const isMobile = useIsMobile();
  const [selectedEmotion, setSelectedEmotion] = useState<'all' | EmotionType>(
    'all',
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['bookmarkVideos', selectedEmotion],
    queryFn: ({ pageParam = 1 }) =>
      getBookmarkVideos({
        page: pageParam,
        size: 20,
        emotion: selectedEmotion,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
  });

  const videos = useMemo(
    () => data?.pages.flatMap((page) => page) || [],
    [data],
  );

  const handleChipClick = (emotion: 'all' | EmotionType) => {
    if (selectedEmotion !== emotion) {
      setSelectedEmotion(emotion);
    }
  };

  const onIntersect: IntersectionObserverCallback = useCallback(
    ([entry]) => {
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const { targetRef } = useIntersectionObserver({ onIntersect });

  return (
    <div className="bookmark-page-container">
      <Seo
        title="즐겨찾기 - FaceReview"
        description="내가 북마크한 영상들을 감정별로 모아보세요."
        keywords="즐겨찾기, 북마크, FaceReview, 페이스리뷰"
        path="/bookmark"
      />
      <h2
        className={
          isMobile ? 'title font-title-medium' : 'title font-title-large'
        }>
        나의 즐겨찾기 영상
      </h2>
      <h3
        className={
          isMobile ? 'subtitle font-title-mini' : 'subtitle font-title-small'
        }>
        저장해둔 영상을 언제든 다시 감상해보세요.
      </h3>

      <div className="bookmark-chip-container">
        <div className="chip-wrapper">
          {['all', ...EMOTIONS].map((emotion) => (
            <Chip
              key={emotion}
              type={isMobile ? 'category-small' : 'category-big'}
              choose={emotion as 'all' | EmotionType}
              onClick={() => handleChipClick(emotion as 'all' | EmotionType)}
              isSelected={selectedEmotion === emotion}
              style={
                isMobile ? { marginRight: '12px' } : { marginRight: '24px' }
              }
            />
          ))}
        </div>
      </div>

      <div className="video-wrapper">
        {isLoading ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton
                key={`bookmark-loading-${i}`}
                width="100%"              />
            ))}
          </>
        ) : videos.length > 0 ? (
          <>
            {videos.map((v, i) => (
              <VideoItem
                type="small-emoji"
                key={`${v.youtube_url}-${i}`}
                width="100%"
                videoId={v.youtube_url}
                videoUuid={v.uuid ?? v.id ?? v.video_id}
                videoTitle={v.title}
                videoMostEmotion={v.dominant_emotion}
                videoMostEmotionPercentage={v.dominant_emotion_per}
                isBookmarked              />
            ))}
            {isFetchingNextPage && (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <VideoCardSkeleton
                    key={`bookmark-more-${i}`}
                    width="100%"
                    style={
                      isMobile
                        ? { marginTop: '14px', marginBottom: '14px' }
                        : {
                            marginRight: (i + 1) % 4 === 0 ? 0 : '26px',
                            marginBottom: '56px',
                          }
                    }
                  />
                ))}
              </>
            )}
            <div ref={targetRef} style={{ width: '100%', height: '20px' }} />
          </>
        ) : (
          <div
            role="status"
            className="bookmark-empty font-title-medium"
            style={{
              color: 'white',
              padding: '60px 0',
              textAlign: 'center',
              width: '100%',
            }}>
            즐겨찾기한 영상이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarkPage;
