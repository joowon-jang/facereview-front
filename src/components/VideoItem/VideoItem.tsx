import { ReactElement, useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { EmotionType } from 'types';
import { emojiOfEmotion, labelOfEmotion, parseYoutubeId } from 'utils';
import { YouTubePlayer } from 'youtube-player/dist/types';
import './videoitem.scss';

type VideoItemPropsType = {
  type: 'small-emoji' | 'big-emoji';
  videoId: string; // This is the YouTube ID
  videoUuid: string; // This is the internal UUID for navigation
  videoTitle: string;
  videoMostEmotion: EmotionType;
  videoMostEmotionPercentage: number;
  width?: number | string;
  style?: React.CSSProperties;
  hoverToPlay?: boolean;
  priority?: boolean;
  isBookmarked?: boolean;
};

const VideoItem = memo(
  ({
    type,
    videoId,
    videoUuid,
    videoTitle,
    videoMostEmotion,
    videoMostEmotionPercentage,
    width,
    style,
    hoverToPlay = true,
    priority = false,
    isBookmarked = false,
  }: VideoItemPropsType): ReactElement => {
    const navigation = useNavigate();
    const height = typeof width === 'number' ? width * (9 / 16) : undefined;
    const opts = useMemo(
      () => ({
        width: width ? width : 280,
        height: height ? height : 158,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1 as const,
          color: 'white' as const,
          controls: 0 as const,
          disablekb: 0 as const,
          fs: 0 as const,
          rel: 0 as const,
          origin: window.location.origin,
        },
      }),
      [width, height],
    );
    const [video, setVideo] = useState<YouTubePlayer | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    const parsedVideoId = useMemo(() => parseYoutubeId(videoId), [videoId]);

    const loadedVideoMostEmotion: string = videoMostEmotion as string;

    const handleClick = () => {
      navigation(`/watch/${videoUuid}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    const handleVideoReady = (e: YouTubeEvent<YouTubePlayer>) => {
      e.target.mute();
      setVideo(e.target);
    };

    const handleMouseHover = () => {
      if (!hoverToPlay) return;
      setIsHovered(true);
      // iframe이 이미 마운트된 경우 소리 켜고 재생
      if (video?.isMuted()) {
        video?.unMute();
        video?.playVideo();
      }
    };
    const handleMouseOut = () => {
      if (!hoverToPlay) return;
      // hover 이탈 시 iframe 언마운트 → 네트워크 요청 완전 종료
      setIsHovered(false);
      setVideo(null);
    };

    return (
      <div
        className="video-item-container"
        style={{ ...style, width: typeof width === 'number' ? `${width}px` : width || '280px' }}
        role="link"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseOver={handleMouseHover}
        onMouseOut={handleMouseOut}>
        <div
          className="thumbnail-wrapper"
          style={typeof width === 'number' ? { width, height } : { width: '100%', aspectRatio: '16/9' }}>
          <img
            className={`video-thumbnail ${hoverToPlay ? '' : 'fix'}`}
            // width/height HTML 속성은 숫자만 유효 — 반응형(%)일 땐 부모의
            // width/aspectRatio 스타일이 크기를 결정하므로 속성을 생략한다.
            {...(typeof width === 'number' ? { width, height } : {})}
            src={`https://img.youtube.com/vi/${parsedVideoId}/mqdefault.jpg`}
            alt={videoTitle}
            loading={priority ? 'eager' : 'lazy'}
            {...(priority ? { fetchPriority: 'high' as const } : {})}
          />
          {hoverToPlay && isHovered ? (
            <YouTube
              videoId={parsedVideoId}
              iframeClassName={'youtube-item'}
              opts={opts}
              onReady={handleVideoReady}
            />
          ) : null}
          {isBookmarked && (
            <div className="video-bookmark-indicator" aria-label="즐겨찾기됨">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
          )}
        </div>
        <div className="video-info-container">
          <h3 className="video-title font-label-large">{videoTitle}</h3>
          {loadedVideoMostEmotion === 'None' ||
          videoMostEmotionPercentage === 0 ? (
            <h3 className="video-emotion-data-empty font-body-medium">
              아직 시청기록이 없어요.
            </h3>
          ) : (
            <div className="video-emotion-container">
              <div
                className={`video-emoji-container ${type} ${videoMostEmotion}`}>
                {emojiOfEmotion[videoMostEmotion]}
              </div>
              <h3 className="video-emotion-data font-body-medium">
                {labelOfEmotion[videoMostEmotion]}
                {type === 'big-emoji' ? <br /> : ` `}
                {videoMostEmotionPercentage}%
              </h3>
            </div>
          )}
        </div>
      </div>
    );
  },
);

VideoItem.displayName = 'VideoItem';

export default VideoItem;
