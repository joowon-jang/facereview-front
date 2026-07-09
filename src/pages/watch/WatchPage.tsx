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
import EmotionBadge from 'components/EmotionBadge/EmotionBadge';
import Seo from 'components/Seo/Seo';
import { YouTubePlayer } from 'youtube-player/dist/types';
import './watchpage.scss';
import { socket } from 'socket';
import React from 'react';
import ProfileIcon from 'components/ProfileIcon/ProfileIcon';
import TextInput from 'components/TextInput/TextInput';
import UploadButton from 'components/UploadButton/UploadButton';
import { ResponsiveBar } from '@nivo/bar';
import { EmotionType, VideoDetailType } from 'types';
import { getRelatedVideo, getVideoDetail, toggleBookmark } from 'api/youtube';
import Divider from 'components/Divider/Divider';
import { useAuthStorage } from 'store/authStore';
import { toast } from 'react-toastify';
import {
  addLike,
  cancelLike,
  deleteComment,
  getVideoComments,
  modifyComment,
  sendNewComment,
} from 'api/watch';
import {
  getScaledTimelineGraphData,
  getTimeToString,
  mapNumberToEmotion,
} from 'utils/index';
import VideoItem from 'components/VideoItem/VideoItem';
import ModalDialog from 'components/ModalDialog/ModalDialog';
import Button from 'components/Button/Button';
import safeImage from 'assets/img/safeImage.png';
import LikeButton from 'components/LikeButton/LikeButton';
import BookmarkButton from 'components/BookmarkButton/BookmarkButton';
import {
  ResponsiveLine,
  Point,
  SliceData,
  SliceTooltipProps,
  isSliceData,
} from '@nivo/line';
import VideoCardSkeleton from 'components/Skeleton/VideoCardSkeleton';
import type { ScaledGraphDistributionDataType } from 'utils/emotion';
import { useIsMobile } from 'hooks/useMediaQuery';
import useWindowSize from 'hooks/useWindowSize';
import { useRequireSignIn } from 'hooks/useRequireSignIn';
import { EMOTION_COLORS, EMOTION_LABELS, EMOTIONS } from 'constants/index';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GraphDetailDataItem from 'components/GraphDetailDataItem/GraphDetailDataItem';
import CommentItem from 'components/CommentItem/CommentItem';

// Hoisted module-level constants to avoid re-creation on every render
const EMOTION_BY_EMOTION_TEXT = EMOTIONS.map((emotion) => ({
  emotion,
  emotionText: EMOTION_LABELS[emotion],
}));

const BAR_CHART_COLORS = EMOTIONS.map((e) => EMOTION_COLORS[e]);
const BAR_CHART_BORDER_COLOR = {
  from: 'color' as const,
  modifiers: [['darker', 1.6] as ['darker', number]],
};
const BAR_CHART_LABEL_TEXT_COLOR = {
  from: 'color' as const,
  modifiers: [['darker', 2.3] as ['darker', number]],
};
const BAR_CHART_MARGIN = { top: -10, bottom: -10 };
const LINE_CHART_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };
const WEBCAM_STYLE = {
  width: '100%',
  aspectRatio: '16 / 9',
  borderRadius: '8px',
  marginBottom: '24px',
};
const PROFILE_ICON_STYLE = { marginRight: '12px' };

// 타임라인 그래프는 데이터 없는 감정 시리즈가 필터링되므로, 순서 기반 배열 대신
// 시리즈 id 로 색상을 매핑해야 감정-색상이 어긋나지 않는다.
const LINE_CHART_COLORS = (serie: ScaledGraphDistributionDataType) =>
  EMOTION_COLORS[serie.id];

const formatSecondsToClock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};

const TimelineSliceTooltip = ({
  slice,
}: SliceTooltipProps<ScaledGraphDistributionDataType>) => {
  const time = Number(slice.points[0]?.data.x ?? 0);
  // 데이터가 없어 필터링된 감정이 있을 수 있으므로 slice 에 있는 모든 감정을 표시
  const sortedPoints = [...slice.points].sort(
    (a, b) => Number(b.data.y) - Number(a.data.y),
  );

  return (
    <div className="timeline-tooltip">
      <p className="timeline-tooltip-time font-label-small">
        {formatSecondsToClock(time)}
      </p>
      {sortedPoints.map((point) => (
        <div className="timeline-tooltip-row" key={point.id}>
          <span
            className="timeline-tooltip-dot"
            style={{ background: point.seriesColor }}
          />
          <span className="timeline-tooltip-label font-label-small">
            {EMOTION_LABELS[point.seriesId]} {Math.round(Number(point.data.y))}%
          </span>
        </div>
      ))}
      <p className="timeline-tooltip-hint font-label-small">
        클릭해서 이 장면으로 이동
      </p>
    </div>
  );
};

const WatchPage = (): ReactElement => {
  const isMobile = useIsMobile();
  const windowWidth = useWindowSize();
  const [modifyingComment, setModifyingComment] = useState<string>('');
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const opts = useMemo(
    () =>
      isMobile
        ? {
            width: '100%',
            height: `${windowWidth * (9 / 16)}px`,
            host: 'https://www.youtube-nocookie.com',
            playerVars: {
              autoplay: 1 as const,
              color: 'white' as const,
              rel: 0 as const,
              origin: window.location.origin,
            },
          }
        : {
            width: 852,
            height: 480,
            host: 'https://www.youtube-nocookie.com',
            playerVars: {
              autoplay: 1 as const,
              color: 'white' as const,
              rel: 0 as const,
              origin: window.location.origin,
            },
          },
    [isMobile, windowWidth],
  );

  // Zustand selector optimization: subscribe to individual slices
  const is_sign_in = useAuthStorage((s) => s.is_sign_in);
  const access_token = useAuthStorage((s) => s.access_token);
  const user_id = useAuthStorage((s) => s.user_id);
  const user_profile = useAuthStorage((s) => s.user_profile);
  const user_announced = useAuthStorage((s) => s.user_announced);
  const setUserAnnounced = useAuthStorage((s) => s.setUserAnnounced);

  const [videoViewLogId] = useState<string>(uuidv4()); // Generate log ID once

  const webcamRef = useRef<Webcam>(null);
  // videoConstraints 는 카메라 캡처 해상도(품질)만 결정. 렌더링 크기는 WEBCAM_STYLE(width:100%) 이 담당.
  const webcamOptions = {
    width: 640,
    height: 360,
  };

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

  const [myGraphData, setMyGraphData] = useState([
    EMOTIONS.reduce(
      (acc, emotion) => ({
        ...acc,
        [emotion]: emotion === 'neutral' ? 100 : 0,
        [`${emotion}Color`]: EMOTION_COLORS[emotion],
      }),
      { id: 'my-emotion' } as Record<string, string | number>,
    ),
  ]);
  const [othersGraphData, setOthersGraphData] = useState([
    EMOTIONS.reduce(
      (acc, emotion) => ({
        ...acc,
        [emotion]: emotion === 'neutral' ? 100 : 0,
        [`${emotion}Color`]: EMOTION_COLORS[emotion],
      }),
      { id: 'others-emotion' } as Record<string, string | number>,
    ),
  ]);
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

  const { data: relatedVideoList = [], isLoading: isRelatedLoading } = useQuery(
    {
      queryKey: ['relatedVideos', id],
      queryFn: () => getRelatedVideo({ video_id: id || '' }),
      enabled: !!id,
    },
  );

  const { data: commentList = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['videoComments', id],
    queryFn: () => getVideoComments({ video_id: id || '' }),
    enabled: !!id,
  });

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
    onError: (err, variables, context) => {
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
  const [currentMyEmotion, setCurrentMyEmotion] =
    useState<EmotionType>('neutral');
  const [currentOthersEmotion, setCurrentOthersEmotion] =
    useState<EmotionType>('neutral');
  const [isModalOpen1, setIsModalOpen1] = useState<boolean>(false);
  const [isModalOpen2, setIsModalOpen2] = useState<boolean>(false);
  const [isDeletedModalOpen, setIsDeletedModalOpen] = useState<boolean>(false);

  const [comment, setComment] = useState('');

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
  };

  // 관련 영상으로 이동하면 loadVideoById 로 교체되어 onReady 가 다시 오지 않으므로
  // 상태 변화 때마다 길이를 다시 동기화한다.
  const handleVideoStateChange = (e: YouTubeEvent<number>) => {
    syncPlayerDuration(e.target);
  };

  const handleVideoError = () => {
    setIsDeletedModalOpen(true);
  };

  const commentMutation = useMutation({
    mutationFn: (newComment: string) =>
      sendNewComment({ content: newComment, video_id: id || '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoComments', id] });
      setComment('');
    },
    onError: () => {
      toast.error('댓글이 달리지 않았어요', { toastId: 'error new comment' });
    },
  });

  const modifyCommentMutation = useMutation({
    mutationFn: (params: { comment_id: string; content: string }) =>
      modifyComment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoComments', id] });
      setEditingcommentindex(null);
    },
    onError: () => {
      toast.error('댓글 수정에 실패했어요', {
        toastId: 'error modify comment',
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (comment_id: string) => deleteComment({ comment_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoComments', id] });
      closeModal2();
    },
    onError: () => {
      toast.error('댓글 삭제에 실패했어요', {
        toastId: 'error delete comment',
      });
    },
  });

  const handleCommentSubmit = () => {
    if (!requireSignIn()) return;
    if (commentMutation.isPending) return;
    if (comment.length > 0) {
      commentMutation.mutate(comment);
    }
  };

  useEffect(() => {
    if (isModalOpen1 || isModalOpen2) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isModalOpen1, isModalOpen2]);

  const openModal1 = () => {
    setIsModalOpen1(true);
  };
  const closeModal1 = () => {
    setUserAnnounced({ user_announced: true });
    setIsModalOpen1(false);
  };
  const openModal2 = () => {
    setIsModalOpen2(true);
  };
  const closeModal2 = () => {
    setIsModalOpen2(false);
    setIsEditVisible(null);
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
    onError: (err, variables, context) => {
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

  const effectiveDuration = playerDuration ?? videoData?.duration ?? 0;

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

  useEffect(() => {
    if (!user_announced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openModal1();
    }
  }, [user_announced]);

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
    const captureInterval = setInterval(() => {
      capture();
    }, 500);

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
            };
            average_emotion: {
              most_emotion: EmotionType;
              [key: string]: string | number;
            };
          };
        }) => {
          if (response?.status === 'success' && response?.response) {
            const { user_emotion, average_emotion } = response.response;

            setCurrentMyEmotion(user_emotion.most_emotion);
            setMyGraphData((prev) => [
              {
                ...prev[0],
                ...user_emotion, // This assumes user_emotion keys match graph data keys
              },
            ]);
            setCurrentOthersEmotion(average_emotion.most_emotion);
            setOthersGraphData((prev) => [
              {
                ...prev[0],
                ...average_emotion,
              },
            ]);
          } else if (response?.status === 'error') {
            console.error('[Socket] watch_frame error:', response);
          }
        },
      );
    }, 1000);

    return () => {
      clearInterval(frameDataInterval);
      clearInterval(captureInterval);
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

  // GraphDetailDataItem and CommentItem are now external components

  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [isEditVisible, setIsEditVisible] = useState<string | null>(null);
  const [editingcommentindex, setEditingcommentindex] = useState<string | null>(
    null,
  );
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );

  // CommentItem callbacks — React Compiler handles memoization automatically
  const handleCommentMouseEnter = (commentId: string) => {
    setHoveredComment(commentId);
  };

  const handleCommentMouseLeave = () => {
    setHoveredComment(null);
    setIsEditVisible(null);
  };

  const handleCommentEditClick = (commentId: string) => {
    // 터치 환경에서는 mouseLeave 가 발생하지 않으므로 토글로 닫을 수 있게 한다
    setIsEditVisible((prev) => (prev === commentId ? null : commentId));
  };

  const handleCommentDeleteClick = () => {
    setIsEditVisible(null);
    openModal2();
  };

  const handleCommentStartEditing = (commentId: string) => {
    setIsEditVisible(null);
    setEditingcommentindex(commentId);
    const target = commentList.find((item) => item.comment_id === commentId);
    if (target) {
      setModifyingComment(target.content);
    }
  };

  const handleTimelineClick = (
    datum:
      | Readonly<Point<ScaledGraphDistributionDataType>>
      | Readonly<SliceData<ScaledGraphDistributionDataType>>,
  ) => {
    if (!isSliceData(datum)) return;
    const seconds = datum.points[0]?.data.x;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      video?.seekTo(seconds, true);
    }
  };

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
        videoConstraints={webcamOptions}
        mirrored={true}
        screenshotQuality={0.5}
        onUserMediaError={handleWebcamError}
      />
    );
  };

  const renderMobileContainer = () => {
    return (
      <div className="watch-page-cam-container">
        {renderWebcamArea()}
        <div className="emotion-container">
          <div className="emotion-title-wrapper">
            <h4 className="emotion-title font-title-small">실시간 나의 감정</h4>
            <EmotionBadge type="big" emotion={currentMyEmotion} />
          </div>
          <div className="graph-container">
            <ResponsiveBar
              data={myGraphData}
              keys={EMOTIONS as unknown as string[]}
              indexBy="id"
              padding={0.3}
              layout="horizontal"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={BAR_CHART_COLORS}
              borderColor={BAR_CHART_BORDER_COLOR}
              axisTop={null}
              axisRight={null}
              axisBottom={null}
              axisLeft={null}
              enableGridY={false}
              enableLabel={false}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={BAR_CHART_LABEL_TEXT_COLOR}
              margin={BAR_CHART_MARGIN}
              legends={[]}
              role="application"
              ariaLabel="실시간 감정 분석 차트"
              barAriaLabel={(e) => `${e.id}: ${e.formattedValue}%`}
            />
          </div>

          <div className="graph-detail-container">
            {EMOTION_BY_EMOTION_TEXT.map((e) => (
              <GraphDetailDataItem
                key={e.emotion}
                graphData={myGraphData}
                emotion={e.emotion}
                emotionText={e.emotionText}
                mostEmotion={currentMyEmotion}
              />
            ))}
          </div>
        </div>
        <div className="emotion-container">
          <div className="emotion-title-wrapper">
            <h4 className="emotion-title font-title-small">
              실시간 다른 사람들의 감정
            </h4>
            <EmotionBadge type="big" emotion={currentOthersEmotion} />
          </div>

          <div className="graph-container">
            <ResponsiveBar
              data={othersGraphData}
              keys={EMOTIONS as unknown as string[]}
              indexBy="id"
              padding={0.3}
              layout="horizontal"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={BAR_CHART_COLORS}
              borderColor={BAR_CHART_BORDER_COLOR}
              axisTop={null}
              axisRight={null}
              axisBottom={null}
              axisLeft={null}
              enableGridY={false}
              enableLabel={false}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={BAR_CHART_LABEL_TEXT_COLOR}
              margin={BAR_CHART_MARGIN}
              legends={[]}
              role="application"
              ariaLabel="실시간 감정 분석 차트"
              barAriaLabel={(e) => `${e.id}: ${e.formattedValue}%`}
            />
          </div>
          <div className="graph-detail-container">
            {EMOTION_BY_EMOTION_TEXT.map((e) => (
              <GraphDetailDataItem
                key={e.emotion}
                graphData={othersGraphData}
                emotion={e.emotion}
                emotionText={e.emotionText}
                mostEmotion={currentOthersEmotion}
              />
            ))}
          </div>
        </div>
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
              alt="safe-img"
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
      <ModalDialog isOpen={isDeletedModalOpen} onClose={() => navigate('/')}>
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
              삭제된 영상
            </h2>
            <p className="deleted-video-modal-description font-body-large">
              해당 영상은 삭제되어 접근할 수 없습니다.
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
          <div className="video-container">
            {videoData?.youtube_url ? (
              <YouTube
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
            <div className="video-graph-container">
              {videoGraphData && videoGraphData.length > 0 && (
                <ResponsiveLine
                  data={videoGraphData}
                  colors={LINE_CHART_COLORS}
                  margin={LINE_CHART_MARGIN}
                  xScale={{
                    type: 'linear',
                    min: 0,
                    max: effectiveDuration || 100,
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
                  enableSlices="x"
                  sliceTooltip={TimelineSliceTooltip}
                  onClick={handleTimelineClick}
                  lineWidth={2}
                  legends={[]}
                />
              )}
            </div>
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

        <div className="comment-container">
          <div className="comment-input-container">
            <ProfileIcon
              type={isMobile ? 'icon-small' : 'icon-medium'}
              color={mapNumberToEmotion(user_profile)}
              style={PROFILE_ICON_STYLE}
            />
            <TextInput
              variant="underline"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                // 한글 IME 조합 중 Enter 는 무시 (isComposing)
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleCommentSubmit();
                }
              }}
              placeholder={'영상에 대한 의견을 남겨보아요'}
              aria-label="댓글 입력"
              disabled={commentMutation.isPending}
            />
            <UploadButton
              onClick={handleCommentSubmit}
              aria-label="댓글 등록"
              isDisabled={commentMutation.isPending}
              style={{
                marginLeft: '12px',
                display: comment.length > 0 ? 'block' : 'none',
              }}
            />
          </div>
          <div
            className={
              isMobile
                ? 'comment-info-text font-title-mini'
                : 'comment-info-text font-title-small'
            }>
            {isCommentsLoading ? '댓글' : `댓글 ${commentList.length}개`}
          </div>
          <div className="comment-list-container">
            {isCommentsLoading ? (
              [0, 1, 2].map((index) => (
                <div
                  className="comment-skeleton"
                  key={index}
                  role="status"
                  aria-busy="true"
                  aria-label="댓글 불러오는 중">
                  <div className="comment-skeleton-avatar" />
                  <div className="comment-skeleton-lines">
                    <div className="comment-skeleton-line short" />
                    <div className="comment-skeleton-line" />
                  </div>
                </div>
              ))
            ) : commentList.length > 0 ? (
              commentList.map((comment) =>
                comment.comment_id === editingcommentindex ? (
                  <div
                    key={comment.comment_id}
                    className="comment-modifying-container">
                    <ProfileIcon
                      type={'icon-small'}
                      color={mapNumberToEmotion(user_profile)}
                      style={PROFILE_ICON_STYLE}
                    />
                    <div className="comment-modifying-wrapper">
                      <div className="comment-modifying-info-wrapper">
                        <div className="comment-modifying-nickname font-label-small">
                          {comment.user_name}
                        </div>
                        <div className="comment-modifying-time-text font-label-small">
                          {getTimeToString(comment.created_at)}
                        </div>
                      </div>
                      <TextInput
                        variant="underline"
                        value={modifyingComment}
                        onChange={(e) => setModifyingComment(e.target.value)}
                        placeholder={''}
                        style={{ marginBottom: '16px' }}
                      />
                      <div className="comment-modifying-button-wrapper">
                        <button
                          type="button"
                          className="comment-modifying-cancel font-label-small"
                          onClick={() => {
                            setEditingcommentindex(null);
                          }}>
                          취소
                        </button>
                        <button
                          type="button"
                          className="comment-modifying-save font-label-small"
                          disabled={
                            modifyingComment.length === 0 ||
                            modifyCommentMutation.isPending
                          }
                          onClick={() => {
                            if (editingcommentindex !== null) {
                              modifyCommentMutation.mutate({
                                comment_id: editingcommentindex,
                                content: modifyingComment,
                              });
                            }
                          }}>
                          저장
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <CommentItem
                    key={comment.comment_id}
                    user_name={comment.user_name}
                    created_at={getTimeToString(comment.created_at)}
                    content={comment.content}
                    user_profile_image_id={comment.user_profile_image_id}
                    comment_id={comment.comment_id}
                    is_modified={comment.is_modified}
                    is_mine={comment.is_mine}
                    user_id={comment.user_id}
                    hoveredComment={hoveredComment}
                    isEditVisible={isEditVisible}
                    isMobile={isMobile}
                    onMouseEnter={handleCommentMouseEnter}
                    onMouseLeave={handleCommentMouseLeave}
                    onEditClick={handleCommentEditClick}
                    onDeleteClick={() => {
                      setDeletingCommentId(comment.comment_id);
                      handleCommentDeleteClick();
                    }}
                    onStartEditing={handleCommentStartEditing}
                  />
                ),
              )
            ) : (
              <p className="no-comments-text font-label-large">
                아직 댓글이 없어요
              </p>
            )}
            {/* Single modal instance outside the loop */}
            <ModalDialog isOpen={isModalOpen2} onClose={closeModal2}>
              <div className="comment-delete-modal-container">
                <h2>댓글을 삭제하시겠어요?</h2>
                <div className="comment-delete-modal-button-wrapper">
                  <Button
                    label={'취소'}
                    variant={'cta-fixed-secondary'}
                    style={{
                      marginRight: '12px',
                      background: '#5D5D6D',
                    }}
                    onClick={closeModal2}
                  />
                  <Button
                    label={'확인'}
                    variant={'cta-fixed'}
                    disabled={deleteCommentMutation.isPending}
                    onClick={() => {
                      if (deletingCommentId) {
                        deleteCommentMutation.mutate(deletingCommentId);
                      }
                    }}
                  />
                </div>
              </div>
            </ModalDialog>
          </div>
        </div>
        {isMobile && (
          <Divider style={{ width: '100vw', marginLeft: '-16px' }} />
        )}
      </div>
      <div className="side-container">
        {!isMobile && (
          <>
            {renderWebcamArea()}
            <div className="emotion-container">
              <div className="emotion-title-wrapper">
                <h4 className="emotion-title font-title-small">
                  실시간 나의 감정
                </h4>
                <EmotionBadge type="big" emotion={currentMyEmotion} />
              </div>
              <div className="graph-container">
                <ResponsiveBar
                  data={myGraphData}
                  keys={EMOTIONS as unknown as string[]}
                  indexBy="id"
                  padding={0.3}
                  layout="horizontal"
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={BAR_CHART_COLORS}
                  borderColor={BAR_CHART_BORDER_COLOR}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={null}
                  axisLeft={null}
                  enableGridY={false}
                  enableLabel={false}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={BAR_CHART_LABEL_TEXT_COLOR}
                  margin={BAR_CHART_MARGIN}
                  legends={[]}
                  role="application"
                  ariaLabel="실시간 감정 분석 차트"
                  barAriaLabel={(e) => `${e.id}: ${e.formattedValue}%`}
                />
              </div>
              <div className="graph-detail-container">
                {EMOTION_BY_EMOTION_TEXT.map((e) => (
                  <GraphDetailDataItem
                    key={e.emotion}
                    graphData={myGraphData}
                    emotion={e.emotion}
                    emotionText={e.emotionText}
                    mostEmotion={currentMyEmotion}
                  />
                ))}
              </div>
            </div>
            <div className="emotion-container">
              <div className="emotion-title-wrapper">
                <h4 className="emotion-title font-title-small">
                  실시간 다른 사람들의 감정
                </h4>
                <EmotionBadge type="big" emotion={currentOthersEmotion} />
              </div>
              <div className="graph-container">
                <ResponsiveBar
                  data={othersGraphData}
                  keys={EMOTIONS as unknown as string[]}
                  indexBy="id"
                  padding={0.3}
                  layout="horizontal"
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={BAR_CHART_COLORS}
                  borderColor={BAR_CHART_BORDER_COLOR}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={null}
                  axisLeft={null}
                  enableGridY={false}
                  enableLabel={false}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={BAR_CHART_LABEL_TEXT_COLOR}
                  margin={BAR_CHART_MARGIN}
                  legends={[]}
                  role="application"
                  ariaLabel="실시간 감정 분석 차트"
                  barAriaLabel={(e) => `${e.id}: ${e.formattedValue}%`}
                />
              </div>
              <div className="graph-detail-container">
                {EMOTION_BY_EMOTION_TEXT.map((e) => (
                  <GraphDetailDataItem
                    key={e.emotion}
                    graphData={othersGraphData}
                    emotion={e.emotion}
                    emotionText={e.emotionText}
                    mostEmotion={currentOthersEmotion}
                  />
                ))}
              </div>
            </div>
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
