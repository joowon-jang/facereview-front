import { ReactElement, useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { searchVideos } from 'api/youtube';
import VideoItem from 'components/VideoItem/VideoItem';
import VideoCardSkeleton from 'components/Skeleton/VideoCardSkeleton';
import { useIsMobile } from 'hooks/useMediaQuery';
import useIntersectionObserver from 'hooks/useIntersectionObserver';

type SearchResultsSectionProps = {
  query: string;
};

const SearchResultsSection = ({
  query,
}: SearchResultsSectionProps): ReactElement => {
  const isMobile = useIsMobile();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['search', query],
      queryFn: ({ pageParam = 1 }) =>
        searchVideos({
          page: pageParam,
          size: 20,
          keyword_type: 'title',
          keyword: query,
        }),
      getNextPageParam: (lastPage) => {
        return lastPage.has_next ? lastPage.page + 1 : undefined;
      },
      enabled: !!query,
      initialPageParam: 1,
    });

  const videos = useMemo(() => {
    return data?.pages.flatMap((page) => page.videos) || [];
  }, [data]);

  const onIntersect: IntersectionObserverCallback = useCallback(
    ([entry]) => {
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const { targetRef } = useIntersectionObserver({
    onIntersect,
  });

  return (
    <div className="search-results-container">
      <h2
        className={
          isMobile ? 'title font-title-medium' : 'title font-title-large'
        }>
        '{query}' 검색 결과
      </h2>
      <div className="video-container">
        <div className="video-wrapper">
          {isLoading ? (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <VideoCardSkeleton key={`search-loading-${i}`} width="100%" />
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
                />
              ))}
              {isFetchingNextPage &&
                Array.from({ length: 4 }).map((_, i) => (
                  <VideoCardSkeleton key={`search-more-${i}`} width="100%" />
                ))}
              <div ref={targetRef} style={{ width: '100%', height: '20px' }} />
            </>
          ) : (
            <div role="status" className="search-empty">
              <span className="search-empty-emoji" aria-hidden="true">
                😥
              </span>
              <p className="search-empty-title font-title-small">
                '{query}'에 맞는 영상을 찾지 못했어요
              </p>
              <p className="search-empty-desc font-body-medium">
                다른 검색어로 시도하거나 홈에서 추천 영상을 둘러보세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsSection;
