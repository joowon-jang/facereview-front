import { ReactElement, useEffect, useState } from 'react';
import type { YouTubePlayer } from 'youtube-player/dist/types';

type VideoVolumeProps = {
  video: YouTubePlayer | null;
};

// 데스크톱 음량 조절(뮤트 토글 + 슬라이더). 재생시간 옆(좌하단)에 두며,
// 터치 기기에서는 CSS(@media pointer: coarse)로 숨긴다.
const VideoVolume = ({ video }: VideoVolumeProps): ReactElement => {
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  // 플레이어의 초기 볼륨/음소거 상태를 반영(자동재생은 보통 음소거로 시작).
  useEffect(() => {
    if (!video) return;
    let active = true;
    void (async () => {
      const v = await video.getVolume();
      const m = await video.isMuted();
      if (!active) return;
      if (Number.isFinite(v)) setVolume(v);
      setIsMuted(m);
    })();
    return () => {
      active = false;
    };
  }, [video]);

  const handleVolume = async (v: number) => {
    setVolume(v);
    if (!video) return;
    if (v === 0) {
      await video.mute();
      setIsMuted(true);
    } else {
      if (isMuted) {
        await video.unMute();
        setIsMuted(false);
      }
      await video.setVolume(v);
    }
  };

  const toggleMute = async () => {
    if (!video) return;
    if (isMuted) {
      await video.unMute();
      await video.setVolume(volume || 100);
      setIsMuted(false);
    } else {
      await video.mute();
      setIsMuted(true);
    }
  };

  return (
    <div className="video-volume">
      <button
        type="button"
        className="video-volume-btn"
        onClick={toggleMute}
        aria-label={isMuted || volume === 0 ? '음소거 해제' : '음소거'}>
        {isMuted || volume === 0 ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 9v6h4l5 5V4L8 9H4z" />
            <line
              x1="16"
              y1="9"
              x2="22"
              y2="15"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="22"
              y1="9"
              x2="16"
              y2="15"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 9v6h4l5 5V4L8 9H4z" />
            <path
              d="M16 8a5 5 0 0 1 0 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      <input
        className="video-volume-slider"
        type="range"
        min={0}
        max={100}
        value={isMuted ? 0 : volume}
        onChange={(e) => handleVolume(Number(e.target.value))}
        aria-label="음량"
      />
    </div>
  );
};

export default VideoVolume;
