import {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import YouTube, { YouTubeEvent } from 'react-youtube';
import Seo from 'components/Seo/Seo';
import { YouTubePlayer } from 'youtube-player/dist/types';
import './watchpage.scss';
import { socket } from 'socket';
import React from 'react';
import { EmotionType, VideoDetailType } from 'types';
import { getRelatedVideo, getVideoDetail, toggleBookmark } from 'api/youtube';
import Divider from 'components/Divider/Divider';
import { useAuthStorage } from 'store/authStore';
import { toast } from 'react-toastify';
import { addLike, cancelLike } from 'api/watch';
import { getScaledTimelineGraphData } from 'utils/index';
import VideoItem from 'components/VideoItem/VideoItem';
import ModalDialog from 'components/ModalDialog/ModalDialog';
import Button from 'components/Button/Button';
import safeImage from 'assets/img/safeImage.png';
import LikeButton from 'components/LikeButton/LikeButton';
import BookmarkButton from 'components/BookmarkButton/BookmarkButton';
import { ResponsiveLine } from '@nivo/line';
import VideoCardSkeleton from 'components/Skeleton/VideoCardSkeleton';
import type { ScaledGraphDistributionDataType } from 'utils/emotion';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useRequireSignIn } from 'hooks/useRequireSignIn';
import { useAvailableVideos } from 'hooks/useAvailableVideos';
import { EMOTION_COLORS, EMOTIONS } from 'constants/index';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmotionPanel } from './EmotionPanel';
import { TimelineTooltip } from './TimelineTooltip';
import { CommentSection } from './CommentSection';
import VideoVolume from './VideoVolume';

// Hoisted module-level constants to avoid re-creation on every render
const LINE_CHART_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };
const WEBCAM_STYLE = {
  width: '100%',
  aspectRatio: '16 / 9',
  borderRadius: '8px',
  marginBottom: '24px',
};
// videoConstraints 는 카메라 캡처 해상도(품질)만 결정. 렌더링 크기는 WEBCAM_STYLE(width:100%) 이 담당.
const WEBCAM_OPTIONS = {
  width: 640,
  height: 360,
};

const formatPlaybackTime = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};

// 타임라인 그래프는 데이터 없는 감정 시리즈가 필터링되므로, 순서 기반 배열 대신
// 시리즈 id 로 색상을 매핑해야 감정-색상이 어긋나지 않는다.
const LINE_CHART_COLORS = (serie: ScaledGraphDistributionDataType) =>
  EMOTION_COLORS[serie.id];

const createInitialEmotionGraphData = (graphId: string) => [
  EMOTIONS.reduce(
    (acc, emotion) => ({
      ...acc,
      [emotion]: emotion === 'neutral' ? 100 : 0,
      [`${emotion}Color`]: EMOTION_COLORS[emotion],
    }),
    { id: graphId } as Record<string, string | number>,
  ),
];

const WatchPage = (): ReactElement => {
  const isMobile = useIsMobile();
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineControlsHideTimerRef = useRef<number | null>(null);
  const [areTimelineControlsVisible, setAreTimelineControlsVisible] =
    useState(false);
  // 자동재생 진입 시에는 hover/tap 같은 사용자 상호작용이 없어 그래프가 노출될
  // 기회가 없으므로, 영상이 처음 재생 상태가 될 때 한 번은 자동으로 노출한다.
  const hasAutoRevealedTimelineRef = useRef(false);
  const { id } = useParams();
  const navigate = useNavigate();
  // iframe 의 실제 렌더링 크기는 watchpage.scss 의
  // .video-container(aspect-ratio: 16/9) + iframe(width/height: 100% !important)
  // 가 결정하므로, opts 의 width/height 는 의미가 없다. playerVars 만 남긴다.
  const opts = useMemo(
    () => ({
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1 as const,
        rel: 0 as const,
        // 유튜브의 기본 컨트롤 막대와 전체화면 버튼은 숨기고, 재생/일시정지와
        // 전체화면은 이 페이지의 커스텀 컨트롤로만 처리한다.
        controls: 0 as const,
        fs: 0 as const,
        playsinline: 1 as const,
        origin: window.location.origin,
      },
    }),
    [],
  );

  // Zustand selector optimization: subscribe to individual slices
  const is_sign_in = useAuthStorage((s) => s.is_sign_in);
  const access_token = useAuthStorage((s) => s.access_token);
  const user_id = useAuthStorage((s) => s.user_id);
  const user_profile = useAuthStorage((s) => s.user_profile);
  const user_announced = useAuthStorage((s) => s.user_announced);
  const setUserAnnounced = useAuthStorage((s) => s.setUserAnnounced);

  const [videoViewLogId, setVideoViewLogId] = useState<string>(() => uuidv4());

  const webcamRef = useRef<Webcam>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [webcamError, setWebcamError] = useState<
    'denied' | 'unavailable' | null
  >(null);
  const [webcamKey, setWebcamKey] = useState<number>(0);

  const handleWebcamError = (error: string | DOMException) => {
    const errorName = typeof error === 'string' ? error : error.name;
    setWebcamError(
      errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError'
        ? 'denied'
        : 'unavailable',
    );
  };

  const handleWebcamRetry = () => {
    setWebcamError(null);
    setWebcamKey((prev) => prev + 1);
  };

  const [myGraphData, setMyGraphData] = useState(() =>
    createInitialEmotionGraphData('my-emotion'),
  );
  const [othersGraphData, setOthersGraphData] = useState(() =>
    createInitialEmotionGraphData('others-emotion'),
  );
  const queryClient = useQueryClient();

  const {
    data: videoData,
    isError: isVideoError,
    refetch: refetchVideoDetail,
  } = useQuery({
    queryKey: ['videoDetail', id],
    queryFn: () => getVideoDetail({ video_id: id || '' }),
    enabled: !!id,
  });

  const { data: relatedVideoListRaw = [], isLoading: isRelatedLoading } =
    useQuery({
      queryKey: ['relatedVideos', id],
      queryFn: () => getRelatedVideo({ video_id: id || '' }),
      enabled: !!id,
    });
  // 유튜브에서 삭제/비공개 처리된 영상은 추천 목록에서 제외한다.
  const relatedVideoList = useAvailableVideos(relatedVideoListRaw);

  const isLikeVideo = videoData?.user_is_liked ?? false;
  const isBookmarked = videoData?.is_bookmarked ?? false;

  const requireSignIn = useRequireSignIn();

  const bookmarkMutation = useMutation({
    mutationFn: () => toggleBookmark({ video_id: id || '' }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['videoDetail', id] });
      const previousVideoData = queryClient.getQueryData([
        'videoDetail',
        id,
      ]) as VideoDetailType | undefined;

      if (previousVideoData) {
        queryClient.setQueryData(['videoDetail', id], {
          ...previousVideoData,
          is_bookmarked: !isBookmarked,
        });
      }

      return { previousVideoData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousVideoData) {
        queryClient.setQueryData(
          ['videoDetail', id],
          context.previousVideoData,
        );
      }
      toast.error('즐겨찾기 처리에 실패했습니다.', {
        toastId: 'bookmarkError',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookmarkVideos'] });
      const message = data.is_bookmarked
        ? '즐겨찾기에 추가했어요.'
        : '즐겨찾기를 해제했어요.';
      toast.success(message, { toastId: 'bookmarkToggle' });
    },
  });

  const handleBookmarkClick = () => {
    if (!requireSignIn()) return;
    bookmarkMutation.mutate();
  };

  const [video, setVideo] = useState<YouTubePlayer | null>(null);
  const [playerState, setPlayerState] = useState(-1);
  const playerStateRef = useRef(-1);
  const [currentMyEmotion, setCurrentMyEmotion] =
    useState<EmotionType>('neutral');
  const [currentOthersEmotion, setCurrentOthersEmotion] =
    useState<EmotionType>('neutral');
  const [isModalOpen1, setIsModalOpen1] = useState<boolean>(false);
  const [videoErrorKind, setVideoErrorKind] = useState<
    'deleted' | 'restricted' | 'unavailable' | null
  >(null);

  const capture = React.useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      return imageSrc.split(',')[1];
    }
    return '';
  }, [webcamRef]);

  // 백엔드의 duration 은 실제 영상 길이와 어긋난 경우가 있어 (그래프가 시간막대와
  // 안 맞는 원인) 플레이어가 보고하는 실제 길이를 그래프 기준으로 사용한다.
  const [playerDuration, setPlayerDuration] = useState<number | null>(null);

  const syncPlayerDuration = async (player: YouTubePlayer) => {
    const duration = await player.getDuration();
    if (Number.isFinite(duration) && duration > 0) {
      setPlayerDuration(duration);
    }
  };

  const handleVideoReady = (e: YouTubeEvent<YouTubePlayer>) => {
    setVideo(e.target);
    syncPlayerDuration(e.target);
    hasAutoRevealedTimelineRef.current = false;
  };

  // 관련 영상으로 이동하면 loadVideoById 로 교체되어 onReady 가 다시 오지 않으므로
  // 상태 변화 때마다 길이를 다시 동기화한다.
  const handleVideoStateChange = (e: YouTubeEvent<number>) => {
    playerStateRef.current = e.data;
    setPlayerState(e.data);
    syncPlayerDuration(e.target);

    // 자동재생으로 진입한 경우 hover/tap 없이 재생이 시작되므로, 첫 재생 시점에
    // 타임라인 그래프를 한 번 자동으로 보여준다(이후엔 기존 hover/tap 로직이 담당).
    if (e.data === 1 && !hasAutoRevealedTimelineRef.current) {
      hasAutoRevealedTimelineRef.current = true;
      showTimelineControlsTemporarily();
    }
  };

  const handleVideoError = (e: YouTubeEvent<number>) => {
    // YouTube IFrame API 에러 코드:
    // 2: 잘못된 매개변수 / 5: HTML5 플레이어 오류
    // 100: 영상 없음·비공개·삭제 / 101·150: 소유자가 임베드 금지
    const code = e.data;
    setVideoErrorKind(
      code === 100
        ? 'deleted'
        : code === 101 || code === 150
          ? 'restricted'
          : 'unavailable',
    );
  };

  const openModal1 = () => {
    setIsModalOpen1(true);
  };
  const closeModal1 = () => {
    setUserAnnounced({ user_announced: true });
    setIsModalOpen1(false);
  };
  const likeMutation = useMutation({
    mutationFn: () =>
      isLikeVideo
        ? cancelLike({ video_id: id || '' })
        : addLike({ video_id: id || '' }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['videoDetail', id] });
      const previousVideoData = queryClient.getQueryData([
        'videoDetail',
        id,
      ]) as VideoDetailType | undefined;

      if (previousVideoData) {
        queryClient.setQueryData(['videoDetail', id], {
          ...previousVideoData,
          user_is_liked: !isLikeVideo,
          like_count: isLikeVideo
            ? previousVideoData.like_count - 1
            : previousVideoData.like_count + 1,
        });
      }

      return { previousVideoData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousVideoData) {
        queryClient.setQueryData(
          ['videoDetail', id],
          context.previousVideoData,
        );
      }
      toast.error('좋아요 처리에 실패했습니다.', { toastId: 'likeError' });
    },
  });

  const handleLikeClick = () => {
    if (!requireSignIn()) return;
    likeMutation.mutate();
  };

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // 관련 영상으로 이동해도 컴포넌트는 리마운트되지 않으므로, 영상이 바뀌면
  // 시청 로그 ID(백엔드가 세션 단위로 집계)와 이전 영상의 길이·감정 상태를
  // 초기화해야 새 영상 데이터에 섞이지 않는다.
  const prevVideoIdRef = useRef(id);
  useEffect(() => {
    if (prevVideoIdRef.current === id) return;
    prevVideoIdRef.current = id;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVideoViewLogId(uuidv4());
    setPlayerDuration(null);
    playerStateRef.current = -1;
    setPlayerState(-1);
    setCurrentMyEmotion('neutral');
    setCurrentOthersEmotion('neutral');
    setMyGraphData(createInitialEmotionGraphData('my-emotion'));
    setOthersGraphData(createInitialEmotionGraphData('others-emotion'));
  }, [id]);

  const effectiveDuration = playerDuration ?? videoData?.duration ?? 0;
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const currentPlaybackRatio =
    effectiveDuration > 0
      ? Math.min(Math.max(currentPlaybackTime / effectiveDuration, 0), 1)
      : 0;

  const videoGraphData = useMemo(() => {
    if (
      videoData?.timeline_data &&
      Object.keys(videoData.timeline_data).length > 0
    ) {
      return getScaledTimelineGraphData(
        videoData.timeline_data,
        effectiveDuration,
      );
    }
    return [];
  }, [videoData, effectiveDuration]);
  const hasVideoTimeline = Boolean(
    videoData?.youtube_url && videoGraphData.length > 0,
  );

  // 직접 구현한 타임라인 툴팁. 그래프(시각)는 pointer-events:none 이고 마우스
  // 추적은 별도 오버레이에서 담당한다. 전체화면 버튼은 별도의 클릭 영역을
  // 사용한다. nivo 내장 슬라이스는 차트가 pointer-events 를 받아야 한다.
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);

  const tooltipEntries = useMemo(() => {
    if (hoverRatio === null || effectiveDuration <= 0) return null;
    const time = hoverRatio * effectiveDuration;
    const entries = videoGraphData
      .map((series) => {
        let best = series.data[0];
        let bestDist = Infinity;
        for (const p of series.data) {
          const d = Math.abs(p.x - time);
          if (d < bestDist) {
            bestDist = d;
            best = p;
          }
        }
        return {
          emotion: series.id,
          y: best?.y ?? 0,
          color: EMOTION_COLORS[series.id],
        };
      })
      .filter((e) => e.y > 0)
      .sort((a, b) => b.y - a.y);
    return { time, entries };
  }, [hoverRatio, effectiveDuration, videoGraphData]);

  const ratioFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    // 오버레이는 우하단 80px 가 빠져 rect.width 가 그래프(라인) 폭과 다르다.
    // 시간은 라인 영역인 컨테이너 전체 폭 기준으로 환산해야 영상 시간과 맞는다.
    const container = e.currentTarget.parentElement;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    return Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
  };
  const handleOverlayMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setHoverRatio(ratioFromEvent(e));
  };
  const handleOverlayLeave = () => setHoverRatio(null);
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const nextTime = ratioFromEvent(e) * effectiveDuration;
    setCurrentPlaybackTime(nextTime);
    video?.seekTo(nextTime, true);
  };

  const clearTimelineControlsHideTimer = () => {
    if (!timelineControlsHideTimerRef.current) return;
    window.clearTimeout(timelineControlsHideTimerRef.current);
    timelineControlsHideTimerRef.current = null;
  };

  // 유튜브 기본 컨트롤(중앙 재생버튼 등)은 마우스 이탈 후 4초에 완전히 사라진다
  // (Playwright 실측). 그래프/재생시간은 페이드 없이 이 시점에 곧바로 사라지도록
  // 타이머를 유튜브의 "완전 소멸" 시각에 맞춘다. (모바일은 4.3초 유지)
  const MOUSE_CONTROLS_LINGER_MS = 4000;

  const showTimelineControlsTemporarily = (duration: number = 4300) => {
    clearTimelineControlsHideTimer();
    setAreTimelineControlsVisible(true);
    timelineControlsHideTimerRef.current = window.setTimeout(() => {
      setAreTimelineControlsVisible(false);
      setHoverRatio(null);
      timelineControlsHideTimerRef.current = null;
    }, duration);
  };

  const showTimelineControls = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') {
      // 마우스가 영상 위에 있는 동안엔 계속 보인다(자동 숨김 취소).
      // ※ 교차출처 iframe 위에서는 pointermove 가 부모로 오지 않아 "이동 중 유지"를
      //   따로 구현할 수 없다. 그래서 진입=표시 / 이탈=지연 숨김 만으로 처리한다.
      clearTimelineControlsHideTimer();
      setAreTimelineControlsVisible(true);
      return;
    }

    setHoverRatio(null);
    showTimelineControlsTemporarily();
  };

  const hideTimelineControls = (e: React.PointerEvent<HTMLDivElement>) => {
    // 터치 포인터는 손을 떼는 즉시 pointerleave가 발생하므로, 기존대로 터치용
    // 타이머가 닫도록 두고 여기서 관여하지 않는다.
    if (e.pointerType !== 'mouse') return;
    // 마우스가 벗어나도 즉시 숨기지 않는다. 유튜브 재생버튼이 이탈 후 약 4초간
    // 남았다가 사라지는 것과 동일하게, 지연 숨김 타이머를 건다(툴팁은 즉시 정리).
    setHoverRatio(null);
    showTimelineControlsTemporarily(MOUSE_CONTROLS_LINGER_MS);
  };

  const handleTouchVideoToggle = () => {
    if (!video) return;
    showTimelineControlsTemporarily();

    const wasPlaying = playerStateRef.current === 1;
    const optimisticState = wasPlaying ? 2 : 1;
    playerStateRef.current = optimisticState;
    setPlayerState(optimisticState);

    try {
      if (wasPlaying) {
        void video.pauseVideo();
      } else {
        void video.playVideo();
      }
    } catch {
      // 영상 교체/리로드와 탭이 겹치면 플레이어 명령이 거절될 수 있다.
    }
  };

  useEffect(
    () => () => {
      clearTimelineControlsHideTimer();
    },
    [],
  );

  const toggleVideoFullscreen = () => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.requestFullscreen();
    }
  };

  // 시간 표시는 감정 타임라인이 표시되는 동안 플레이어 시간에 맞춘다.
  useEffect(() => {
    if (!video) return;
    let active = true;

    const syncPlaybackTime = async () => {
      const time = await video.getCurrentTime();
      if (active && Number.isFinite(time)) setCurrentPlaybackTime(time);
    };

    void syncPlaybackTime();
    const intervalId = window.setInterval(() => void syncPlaybackTime(), 500);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [video]);

  useEffect(() => {
    if (!user_announced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openModal1();
    }
  }, [user_announced]);

  // '실시간 다른 사람들의 감정'은 현재 재생 위치에 해당하는 timeline_data
  // (과거 시청자들의 진행률 bin 별 감정 분포)로 표시한다. 소켓 응답의
  // average_emotion 은 내 세션의 누적 평균만 담겨 와서 소스로 쓸 수 없다.
  useEffect(() => {
    const timelineData = videoData?.timeline_data;
    if (!video || !timelineData || effectiveDuration <= 0) return;

    const interval = setInterval(async () => {
      const currentTime = await video.getCurrentTime();
      if (!Number.isFinite(currentTime)) return;
      setCurrentPlaybackTime(currentTime);

      // timeline_data 의 x 는 진행률 bin(1~100), bin k 는 ((k-1)..k]/100 구간
      const bin = Math.min(
        Math.max(Math.ceil((currentTime / effectiveDuration) * 100), 1),
        100,
      );

      const values = EMOTIONS.map((emotion) => {
        const point = timelineData[emotion]?.find((p) => Number(p.x) === bin);
        return { emotion, y: typeof point?.y === 'number' ? point.y : 0 };
      });
      const total = values.reduce((sum, v) => sum + v.y, 0);
      if (total <= 0) return; // 해당 구간에 시청 기록이 없으면 직전 값 유지

      const percentages = Object.fromEntries(
        values.map((v) => [v.emotion, Math.round((v.y / total) * 1000) / 10]),
      );
      const most = values.reduce((a, b) => (b.y > a.y ? b : a)).emotion;

      setCurrentOthersEmotion(most);
      setOthersGraphData((prev) => [{ ...prev[0], ...percentages }]);
    }, 1000);

    return () => clearInterval(interval);
  }, [video, videoData, effectiveDuration]);

  useEffect(() => {
    if (is_sign_in) {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }

      if (!socket.connected) {
        socket.connect();
      }

      const onConnectError = (err: Error) =>
        console.error('Socket connection error:', err);

      socket.on('connect_error', onConnectError);
    }

    return () => {
      if (is_sign_in) {
        socket.off('connect_error');

        // Debounce socket disconnect to prevent "WebSocket is closed before the connection is established" in StrictMode
        disconnectTimerRef.current = setTimeout(() => {
          socket.disconnect();
        }, 300);
      }
    };
  }, [id, is_sign_in]);

  useEffect(() => {
    // 0.5초마다 웹캠 프레임을 캡처해 감정 분석 서버로 전송한다.
    const frameDataInterval = setInterval(async () => {
      // Only emit if signed in, video is playing/ready, and actually playing (state 1)
      if (!is_sign_in || !video || !videoData) return;

      const playerState = await video.getPlayerState();
      if (playerState !== 1) return;

      const capturedImage = capture();
      // Wait until webcam is ready to provide frame data
      if (!capturedImage) return;

      const currentTime = await video?.getCurrentTime();

      socket.emit(
        'watch_frame',
        {
          video_view_log_id: videoViewLogId,
          youtube_running_time: parseFloat((currentTime || 0).toFixed(2)), // Numeric, seconds
          frame_data: capturedImage,
          duration: videoData.duration || 0,
          // test
          user_id: user_id,
          video_id: videoData.video_id, // Internal UUID
        },
        (response: {
          status: string;
          response?: {
            user_emotion: {
              most_emotion: EmotionType;
              [key: string]: string | number;
            } | null;
            // 주의: average_emotion 은 '다른 사람들'이 아니라 내 세션에서 보낸
            // 프레임들의 누적 평균만 담겨 온다(다른 세션 데이터 미포함).
            // 세션 첫 프레임에서는 null. '다른 사람들의 감정'은 timeline_data
            // 기반 효과가 담당하므로 여기서는 사용하지 않는다.
            average_emotion: {
              most_emotion: EmotionType;
              [key: string]: string | number;
            } | null;
          };
        }) => {
          if (response?.status === 'success' && response?.response) {
            const { user_emotion } = response.response;

            if (user_emotion) {
              setCurrentMyEmotion(user_emotion.most_emotion);
              setMyGraphData((prev) => [
                {
                  ...prev[0],
                  ...user_emotion, // This assumes user_emotion keys match graph data keys
                },
              ]);
            }
          } else if (response?.status === 'error') {
            console.error('[Socket] watch_frame error:', response);
          }
        },
      );
    }, 500);

    return () => {
      clearInterval(frameDataInterval);
    };
  }, [
    access_token,
    capture,
    video,
    videoData,
    is_sign_in,
    user_id,
    videoViewLogId,
  ]);

  const renderWebcamArea = () => {
    if (!is_sign_in) {
      return (
        <div className="webcam-placeholder-container">
          <div className="webcam-placeholder-icon" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <p className="webcam-placeholder-text font-body-medium">
            로그인하면 영상을 보는 동안
            <br />
            실시간 감정 분석을 볼 수 있어요
          </p>
          <button
            type="button"
            className="webcam-placeholder-button font-label-large"
            onClick={() => navigate('/auth/1')}>
            로그인 하기
          </button>
        </div>
      );
    }

    if (webcamError) {
      return (
        <div className="webcam-placeholder-container">
          <div className="webcam-placeholder-icon" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <p className="webcam-placeholder-text font-body-medium">
            {webcamError === 'denied' ? (
              <>
                카메라 권한이 차단되어 있어요.
                <br />
                브라우저 설정에서 카메라를 허용한 뒤 다시 시도해 주세요.
              </>
            ) : (
              <>
                카메라를 사용할 수 없어요.
                <br />
                다른 앱이 카메라를 사용 중인지 확인해 주세요.
              </>
            )}
          </p>
          <button
            type="button"
            className="webcam-placeholder-button font-label-large"
            onClick={handleWebcamRetry}>
            다시 시도
          </button>
        </div>
      );
    }

    return (
      <Webcam
        key={webcamKey}
        style={WEBCAM_STYLE}
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={WEBCAM_OPTIONS}
        mirrored={true}
        screenshotQuality={0.5}
        onUserMediaError={handleWebcamError}
      />
    );
  };

  const videoErrorContent =
    videoErrorKind === 'deleted'
      ? {
          title: '삭제된 영상',
          description: '해당 영상은 삭제되어 접근할 수 없습니다.',
        }
      : videoErrorKind === 'restricted'
        ? {
            title: '재생할 수 없는 영상',
            description:
              '영상 소유자가 외부 재생을 허용하지 않아 볼 수 없어요.',
          }
        : {
            title: '영상을 불러올 수 없어요',
            description:
              '일시적인 오류로 영상을 재생할 수 없어요. 잠시 후 다시 시도해 주세요.',
          };

  const renderMobileContainer = () => {
    return (
      <div className="watch-page-cam-container">
        {renderWebcamArea()}
        <EmotionPanel
          title="실시간 나의 감정"
          graphData={myGraphData}
          mostEmotion={currentMyEmotion}
        />
        <EmotionPanel
          title="실시간 다른 사람들의 감정"
          graphData={othersGraphData}
          mostEmotion={currentOthersEmotion}
        />
      </div>
    );
  };

  return (
    <div className="watch-page-container">
      <Seo
        title={videoData?.title ? `${videoData.title}` : '영상 시청'}
        description={
          videoData?.title
            ? `${videoData.title} — FaceReview에서 영상을 보며 실시간으로 내 감정을 분석하고 다른 사람들의 감정 리뷰도 확인해 보세요.`
            : 'FaceReview에서 영상을 보며 실시간으로 내 감정을 분석하고 다른 사람들의 감정 리뷰를 공유해 보세요.'
        }
        image={
          videoData?.youtube_url
            ? `https://i.ytimg.com/vi/${videoData.youtube_url}/maxresdefault.jpg`
            : undefined
        }
        path={`/watch/${id}`}
        type="article"
      />
      <ModalDialog isOpen={isModalOpen1} onClose={closeModal1}>
        <div className="watch-page-safe-modal-container">
          <div className="watch-page-modal-image-container">
            <img
              className="watch-page-modal-image"
              src={safeImage}
              alt=""
              aria-hidden="true"
            />
          </div>
          <div className="watch-page-modal-label-container">
            <h2 className="watch-page-modal-title font-title-medium">
              안심하세요!
            </h2>
            <p className="font-body-large">
              영상 시청 중의 나의 모습은 기록되거나 저장되지 않아요.
            </p>
          </div>
          <div className="watch-page-modal-button-wrapper">
            <Button label={'확인'} variant={'cta-full'} onClick={closeModal1} />
          </div>
        </div>
      </ModalDialog>
      <ModalDialog
        isOpen={videoErrorKind !== null}
        onClose={() => navigate('/')}>
        <div className="deleted-video-modal-container">
          <div className="deleted-video-modal-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <div className="deleted-video-modal-label-container">
            <h2 className="deleted-video-modal-title font-title-medium">
              {videoErrorContent.title}
            </h2>
            <p className="deleted-video-modal-description font-body-large">
              {videoErrorContent.description}
            </p>
          </div>
          <div className="deleted-video-modal-button-wrapper">
            <Button
              label={'확인'}
              variant={'cta-full'}
              onClick={() => navigate('/')}
            />
          </div>
        </div>
      </ModalDialog>
      <div className="main-container">
        <div className="video-fixed-container">
          <div
            className="video-container"
            ref={videoContainerRef}
            onPointerEnter={showTimelineControls}
            onPointerLeave={hideTimelineControls}>
            {videoData?.youtube_url ? (
              <YouTube
                key={videoData.youtube_url}
                videoId={videoData.youtube_url}
                style={{ display: 'block' }}
                opts={opts}
                onReady={handleVideoReady}
                onStateChange={handleVideoStateChange}
                onError={handleVideoError}
              />
            ) : isVideoError ? (
              <div className="video-status-placeholder">
                <p className="video-status-text font-body-medium">
                  영상 정보를 불러오지 못했어요
                </p>
                <button
                  type="button"
                  className="video-retry-button font-label-large"
                  onClick={() => refetchVideoDetail()}>
                  다시 시도
                </button>
              </div>
            ) : (
              <div className="video-status-placeholder">
                <div className="video-loading-spinner" />
              </div>
            )}
            {videoData?.youtube_url && (
              <button
                type="button"
                className="video-touch-toggle"
                onClick={handleTouchVideoToggle}
                tabIndex={-1}
                aria-label={playerState === 1 ? '영상 일시정지' : '영상 재생'}
              />
            )}
            {hasVideoTimeline && (
              <div
                className={`video-bottom-left${areTimelineControlsVisible ? ' video-bottom-left--visible' : ''}`}>
                <span className="video-native-time" aria-live="off">
                  {formatPlaybackTime(currentPlaybackTime)} /{' '}
                  {formatPlaybackTime(effectiveDuration)}
                </span>
                <VideoVolume video={video} />
              </div>
            )}
            {hasVideoTimeline && (
              <div
                className={`video-graph-container${areTimelineControlsVisible ? ' video-graph-container--visible' : ''}`}>
                {videoGraphData && videoGraphData.length > 0 && (
                  <>
                    <div
                      className="video-graph-watched"
                      style={{ width: `${currentPlaybackRatio * 100}%` }}
                      aria-hidden="true"
                    />
                    <div className="video-graph-lines">
                      <ResponsiveLine
                        data={videoGraphData}
                        colors={LINE_CHART_COLORS}
                        margin={LINE_CHART_MARGIN}
                        xScale={{
                          type: 'linear',
                          min: 0,
                          max: effectiveDuration || 100,
                          // d3 nice() 가 도메인을 471→500 처럼 확장해 시간축이
                          // 유튜브 진행바와 어긋나므로 반드시 꺼야 한다
                          nice: false,
                        }}
                        yScale={{
                          type: 'linear',
                          min: 0,
                          max: 100,
                          stacked: false,
                          reverse: false,
                        }}
                        curve="monotoneX"
                        axisTop={null}
                        axisRight={null}
                        axisBottom={null}
                        axisLeft={null}
                        enableGridX={false}
                        enableGridY={false}
                        enablePoints={false}
                        useMesh={false}
                        lineWidth={2}
                        legends={[]}
                      />
                    </div>
                    <div
                      className="video-graph-playhead"
                      style={{ left: `${currentPlaybackRatio * 100}%` }}
                      aria-hidden="true"
                    />
                    {/* 시각 라인은 pointer-events:none, 이 오버레이에서만 마우스를
                      추적한다. 전체화면 버튼은 별도 클릭 영역에서 처리한다. */}
                    <div
                      className="video-graph-overlay"
                      onMouseMove={handleOverlayMove}
                      onMouseLeave={handleOverlayLeave}
                      onClick={handleOverlayClick}
                    />
                    {tooltipEntries && hoverRatio !== null && (
                      <div
                        className="video-graph-tooltip"
                        style={{ left: `${hoverRatio * 100}%` }}>
                        <TimelineTooltip
                          time={tooltipEntries.time}
                          entries={tooltipEntries.entries}
                        />
                      </div>
                    )}
                  </>
                )}
                {hasVideoTimeline && (
                  <button
                    type="button"
                    className="video-graph-fullscreen"
                    onClick={() => {
                      void toggleVideoFullscreen();
                    }}
                    aria-label="전체화면">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="video-information-container">
            <div
              className={
                isMobile ? 'title font-title-small' : 'title font-title-medium'
              }>
              {videoData?.title}
            </div>
            <div className="right-side">
              <div className="right-side-actions">
                <LikeButton
                  label={(videoData?.like_count || 0) + ''}
                  isActive={isLikeVideo}
                  onClick={handleLikeClick}
                />
                <BookmarkButton
                  variant="with-label"
                  label={isBookmarked ? '저장됨' : '저장'}
                  isActive={isBookmarked}
                  onClick={handleBookmarkClick}
                />
              </div>
              <p className="video-hits-text font-label-small">
                조회수 {videoData?.view_count || 0}회
              </p>
            </div>
          </div>
          {isMobile && <Divider />}
        </div>

        {isMobile && renderMobileContainer()}
        {isMobile && (
          <Divider style={{ width: '100vw', marginLeft: '-16px' }} />
        )}

        <CommentSection
          videoId={id || ''}
          isMobile={isMobile}
          userProfile={user_profile}
        />
        {isMobile && (
          <Divider style={{ width: '100vw', marginLeft: '-16px' }} />
        )}
      </div>
      <div className="side-container">
        {!isMobile && (
          <>
            {renderWebcamArea()}
            <EmotionPanel
              title="실시간 나의 감정"
              graphData={myGraphData}
              mostEmotion={currentMyEmotion}
            />
            <EmotionPanel
              title="실시간 다른 사람들의 감정"
              graphData={othersGraphData}
              mostEmotion={currentOthersEmotion}
            />
          </>
        )}
        <div className="recommend-container">
          <h4 className="recommend-title font-title-small">
            이 영상은 어때요?
          </h4>
          <div className="recommend-video-container">
            {isRelatedLoading &&
              [0, 1, 2].map((index) => (
                <VideoCardSkeleton
                  key={index}
                  width="100%"
                  style={{ marginBottom: '24px' }}
                />
              ))}
            {relatedVideoList.map((v, index) => (
              <VideoItem
                key={v.video_id || index}
                width="100%"
                videoId={v.youtube_url} // Corrected: use youtube_url for thumbnail
                videoUuid={v.uuid ?? v.id ?? v.video_id}
                videoTitle={v.title}
                videoMostEmotion={v.dominant_emotion}
                videoMostEmotionPercentage={v.dominant_emotion_per}
                style={{ marginBottom: '24px' }}
                type={'small-emoji'}
                priority={index === 0}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
