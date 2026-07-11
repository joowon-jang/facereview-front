import { ReactElement, useCallback, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { searchVideos } from 'api/youtube';
import VideoItem from 'components/VideoItem/VideoItem';
import VideoCardSkeleton from 'components/Skeleton/VideoCardSkeleton';
import { useIsMobile } from 'hooks/useMediaQuery';
import useIntersectionObserver from 'hooks/useIntersectionObserver';
import useGridColumnCount from 'hooks/useGridColumnCount';
import { useAvailableVideos } from 'hooks/useAvailableVideos';

const VIDEO_GRID_MIN_WIDTH = 300;
const VIDEO_GRID_GAP = 24;

type SearchResultsSectionProps = {
  query: string;
};

const SearchResultsSection = ({
  query,
}: SearchResultsSectionProps): ReactElement => {
  const isMobile = useIsMobile();
  const videoGridRef = useRef<HTMLDivElement>(null);
  const gridColumns = useGridColumnCount(
    videoGridRef,
    VIDEO_GRID_MIN_WIDTH,
    VIDEO_GRID_GAP,
  );
  const initialSkeletonCount = gridColumns * 2;
  const moreSkeletonCount = gridColumns;

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

  const videosRaw = useMemo(() => {
    return data?.pages.flatMap((page) => page.videos) || [];
  }, [data]);
  // 유튜브에서 삭제/비공개 처리된 영상은 검색 결과에서 제외한다.
  const videos = useAvailableVideos(videosRaw);

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
        <div className="video-wrapper" ref={videoGridRef}>
          {isLoading ? (
            <>
              {Array.from({ length: initialSkeletonCount }).map((_, i) => (
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
                Array.from({ length: moreSkeletonCount }).map((_, i) => (
                  <VideoCardSkeleton key={`search-more-${i}`} width="100%" />
                ))}
              <div ref={targetRef} className="video-grid-sentinel" />
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
