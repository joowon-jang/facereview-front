import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getAllVideo,
  getPersonalRecommendedVideo,
  getVideoList,
} from 'api/youtube';
import VideoItem from 'components/VideoItem/VideoItem';
import { ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStorage } from 'store/authStore';
import { EmotionType } from 'types';
import VideoCarousel from 'components/VideoCarousel/VideoCarousel';
import VideoCarouselSkeleton from 'components/VideoCarousel/VideoCarouselSkeleton';

import Chip from 'components/Chip/Chip';
import VideoCardSkeleton from 'components/Skeleton/VideoCardSkeleton';
import {
  CATEGORIES,
  CATEGORY_ITEMS,
  EMOTIONS,
  EMOTION_EMOJIS,
} from 'constants/index';
import useIntersectionObserver from 'hooks/useIntersectionObserver';
import { useIsMobile } from 'hooks/useMediaQuery';
import useGridColumnCount from 'hooks/useGridColumnCount';

// mainpage.scss `.video-wrapper` 와 동기화 (1280 기준 4열)
const VIDEO_GRID_MIN_WIDTH = 300;
const VIDEO_GRID_GAP = 24;

const HomeContentSection = (): ReactElement => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const is_sign_in = useAuthStorage((s) => s.is_sign_in);
  const user_name = useAuthStorage((s) => s.user_name);
  const videoGridRef = useRef<HTMLDivElement>(null);
  const gridColumns = useGridColumnCount(
    videoGridRef,
    VIDEO_GRID_MIN_WIDTH,
    VIDEO_GRID_GAP,
  );
  // 초기 로딩: 2줄, 추가 로딩: 1줄 — 열 수와 항상 맞춤
  const initialSkeletonCount = gridColumns * 2;
  const moreSkeletonCount = gridColumns;

  const [selectedEmotion, setSelectedEmotion] = useState<'all' | EmotionType>(
    'all',
  );

  // React Query: personal recommended videos
  const {
    data: personalRecommendedVideo = [],
    isLoading: isPersonalLoading,
  } = useQuery({
    queryKey: ['personalRecommended'],
    queryFn: () => getPersonalRecommendedVideo(),
    enabled: is_sign_in,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  // 캐시가 없을 때만 스켈레톤 (백그라운드 refetch 중엔 기존 데이터 유지)
  const showPersonalSkeleton =
    is_sign_in && isPersonalLoading && personalRecommendedVideo.length === 0;

  // React Query: infinite scroll for all videos
  const {
    data: allVideoData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['allVideos', selectedEmotion],
    queryFn: ({ pageParam = 1 }) =>
      getAllVideo({ page: pageParam, size: 20, emotion: selectedEmotion }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
  });

  const allVideo = useMemo(
    () => allVideoData?.pages.flatMap((page) => page) || [],
    [allVideoData],
  );

  // Fetch ALL category data
  const {
    data: allCategoryList = [],
    isLoading: isGenreLoading,
  } = useQuery({
    queryKey: ['videos', 'all'],
    queryFn: () => getVideoList(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const [genreCurrentIndex, setGenreCurrentIndex] = useState<number>(0);

  const currentGenreVideos =
    allCategoryList.find(
      (category) => category.category_name === CATEGORIES[genreCurrentIndex],
    )?.videos || [];

  const showGenreSkeleton = isGenreLoading && allCategoryList.length === 0;

  const genreTitle: Array<string> = CATEGORY_ITEMS.map((item) => item.label);

  const handleGenrePrev = () => {
    setGenreCurrentIndex((prev) =>
      prev === 0 ? CATEGORIES.length - 1 : prev - 1,
    );
  };
  const handleGenreNext = () => {
    setGenreCurrentIndex((prev) => (prev + 1) % CATEGORIES.length);
  };

  const handleChipClick = (emotion: 'all' | EmotionType) => {
    if (selectedEmotion !== emotion) {
      setSelectedEmotion(emotion);
    }
  };

  // Intersection Observer for infinite scroll
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
    <>
      {/* ... Hero (비로그인 방문자에게 서비스 소개) ... */}
      {!is_sign_in && (
        <div className="home-hero-wrap">
          <section className="home-hero">
            <div className="home-hero-copy">
              <h1
                className={isMobile ? 'font-title-medium' : 'font-title-large'}>
                내 표정이 곧 리뷰가 돼요
              </h1>
              <p className="font-body-large">
                영상을 보는 동안의 표정으로 감정을 기록하고,{' '}
                {!isMobile && <br />}
                나와 비슷하게 느낀 사람들이 좋아한 영상을 추천받아요.
              </p>
              <button
                type="button"
                className="home-hero-cta font-label-large"
                onClick={() => navigate('/auth/1')}>
                로그인하고 시작하기
              </button>
            </div>
            <div className="home-hero-emojis" aria-hidden="true">
              {EMOTIONS.map((emotion) => (
                <span key={emotion} className="hero-emoji">
                  {EMOTION_EMOJIS[emotion]}
                </span>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ... Personal Rec ... */}
      {is_sign_in ? (
        <div className="personal-recommend-contents-container">
          <h2
            className={
              isMobile ? 'title font-title-medium' : 'title font-title-large'
            }>
            {user_name}님이 좋아할{` `} {isMobile && <br />}
            오늘의 영상들을 골라봤어요.
          </h2>
          <h3
            className={
              isMobile
                ? 'subtitle font-title-mini'
                : 'subtitle font-title-small'
            }>
            시청 기록과 감정을 분석해서{` `}
            {isMobile && <br />}
            가장 좋아할 영상을 준비했어요.
          </h3>
          <div className="video-container">
            <div className="genre-video-container">
              {showPersonalSkeleton ? (
                <VideoCarouselSkeleton />
              ) : (
                <VideoCarousel videos={personalRecommendedVideo} />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ... Genre ... */}
      <div className="genre-contents-container">
        <div className="genre-title-row">
          <h2
            className={
              isMobile ? 'title font-title-medium' : 'title font-title-large'
            }>
            {genreTitle[genreCurrentIndex]} 추천{` `}
            {isMobile && <br />}
            영상을 골라봤어요.
          </h2>
          <div className="genre-nav-buttons">
            <button
              type="button"
              className="genre-nav-btn"
              onClick={handleGenrePrev}
              aria-label="이전 장르">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="genre-nav-btn"
              onClick={handleGenreNext}
              aria-label="다음 장르">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <h3
          className={
            isMobile ? 'subtitle font-title-mini' : 'subtitle font-title-small'
          }>
          유저들의 감정데이터를 분석해{` `}
          {isMobile && <br />}
          추천 영상을 준비했어요.
        </h3>
        <div className="genre-video-container">
          {showGenreSkeleton ? (
            <VideoCarouselSkeleton />
          ) : (
            <VideoCarousel videos={currentGenreVideos} />
          )}
        </div>
      </div>

      <div className="hot-contents-container">
        <h2
          className={
            isMobile ? 'title font-title-medium' : 'title font-title-large'
          }>
          {is_sign_in ? (
            <div>
              {`${user_name}님을 위해 준비한 `}
              {isMobile && <br />}
              인기있는 영상이에요.
            </div>
          ) : (
            <div>
              감정별로 볼 수 있는{` `}
              {isMobile && <br />}
              영상을 추천해드릴게요.
            </div>
          )}
        </h2>
        <div className="video-container">
          <div className="main-page-chip-container">
            <div className="chip-wrapper">
              {['all', ...EMOTIONS].map((emotion) => (
                <Chip
                  key={emotion}
                  type={isMobile ? 'category-small' : 'category-big'}
                  choose={emotion as 'all' | EmotionType}
                  onClick={() =>
                    handleChipClick(emotion as 'all' | EmotionType)
                  }
                  isSelected={selectedEmotion === emotion}
                  style={
                    isMobile ? { marginRight: '12px' } : { marginRight: '24px' }
                  }
                />
              ))}
            </div>
          </div>
          <div className="video-wrapper" ref={videoGridRef}>
            {allVideo.map((v, i) => (
              <VideoItem
                type="small-emoji"
                key={v.youtube_url || i}
                width="100%"
                videoId={v.youtube_url}
                videoUuid={v.uuid ?? v.id ?? v.video_id}
                videoTitle={v.title}
                videoMostEmotion={v.dominant_emotion}
                videoMostEmotionPercentage={v.dominant_emotion_per}
              />
            ))}
            {isLoading &&
              Array.from({ length: initialSkeletonCount }).map((_, i) => (
                <VideoCardSkeleton key={`skeleton-${i}`} width="100%" />
              ))}
            {isFetchingNextPage &&
              Array.from({ length: moreSkeletonCount }).map((_, i) => (
                <VideoCardSkeleton key={`more-skeleton-${i}`} width="100%" />
              ))}
            <div ref={targetRef} className="video-grid-sentinel" />
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeContentSection;
