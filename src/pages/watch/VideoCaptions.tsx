import { ReactElement, useEffect, useRef, useState } from 'react';
import type { YouTubePlayer } from 'youtube-player/dist/types';

type CaptionTrack = { languageCode: string; kind?: string };

type VideoCaptionsProps = {
  video: YouTubePlayer | null;
  playerState: number;
};

// 자막(CC) 켜기/끄기.
// - 끄기: setOption('captions','track',{}) — 자동 생성 자막까지 확실히 숨긴다.
// - 켜기: tracklist 의 트랙(한국어 우선)을 지정한다. 자동 생성(ASR) 자막만 있는
//   영상은 tracklist 가 비어 있으므로 {languageCode, kind:'asr'} 최소 디스크립터로
//   켠다. (getOption 이 주는 전체 트랙 객체는 is_servable:false 라 그대로 넣으면
//   무시된다 — 실측)
// - 유튜브는 iframe localStorage 에 자막 on/off 선호를 기억해 재생 시작 때 스스로
//   자막을 켜기도 하는데, getOption 으로는 표시 여부를 읽을 수 없어 버튼 상태와
//   어긋난다. 그래서 영상마다 첫 재생 시점에 강제로 꺼서 항상 버튼(꺼짐)과
//   일치시킨다. (onReady 시점은 모듈이 선호를 복원하기 전이라 효과 없음 — 실측)
//   끈 뒤에는 getOption('captions','track') 이 {} 를 반환해 트랙 정보를 잃으므로,
//   끄기 직전 트랙을 저장해 두고 켜기 폴백으로 쓴다.
const VideoCaptions = ({
  video,
  playerState,
}: VideoCaptionsProps): ReactElement => {
  const [prevVideo, setPrevVideo] = useState(video);
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  // 강제 off 를 이미 수행(또는 유저 토글로 불필요해짐)한 플레이어 인스턴스.
  // 영상이 바뀌면 인스턴스가 달라져 자연히 다시 강제 off 대상이 된다.
  const forceOffDoneRef = useRef<YouTubePlayer | null>(null);
  const savedTrackRef = useRef<CaptionTrack | null>(null);

  // 관련 영상으로 넘어가면 플레이어 인스턴스가 바뀐다(리마운트 없음). 이전 영상의
  // 자막 상태를 이어받지 않도록 리셋한다. (렌더링 도중 상태 조정 패턴)
  if (video !== prevVideo) {
    setPrevVideo(video);
    setIsCaptionsOn(false);
  }

  useEffect(() => {
    if (playerState !== 1 || !video || forceOffDoneRef.current === video)
      return;
    forceOffDoneRef.current = video;
    void (async () => {
      const track = (await video.getOption('captions', 'track')) as
        | CaptionTrack
        | undefined;
      // 새 영상에서 이전 영상의 트랙이 이월되지 않도록 항상 덮어쓴다.
      savedTrackRef.current = track?.languageCode ? track : null;
      await video.setOption('captions', 'track', {});
    })();
  }, [playerState, video]);

  const toggleCaptions = async () => {
    if (!video) return;
    forceOffDoneRef.current = video;
    if (isCaptionsOn) {
      await video.setOption('captions', 'track', {});
      setIsCaptionsOn(false);
      return;
    }
    const tracklist = (await video.getOption(
      'captions',
      'tracklist',
    )) as CaptionTrack[] | undefined;
    if (tracklist && tracklist.length > 0) {
      const preferred =
        tracklist.find((t) => t.languageCode === 'ko') ?? tracklist[0];
      await video.setOption('captions', 'track', preferred);
      setIsCaptionsOn(true);
      return;
    }
    let fallback =
      savedTrackRef.current ??
      ((await video.getOption('captions', 'track')) as
        | CaptionTrack
        | undefined);
    if (!fallback?.languageCode) {
      // 유튜브가 선호를 '자막 없음'으로 기억한 채 시작하면 track 이 처음부터
      // {} 라 트랙 정보를 얻을 곳이 없다. 자막 데이터가 존재하는 영상인지는
      // translationLanguages(번역 가능 언어 목록)로 확인하고, 한국어 ASR 로
      // 켠다. (한국어 영상이 아니면 유튜브가 한국어 번역 자막으로 처리)
      const translationLanguages = (await video.getOption(
        'captions',
        'translationLanguages',
      )) as unknown[] | undefined;
      if (!translationLanguages || translationLanguages.length === 0) return;
      fallback = { languageCode: 'ko', kind: 'asr' };
    }
    const asrTrack = {
      languageCode: fallback.languageCode,
      kind: fallback.kind || 'asr',
    };
    savedTrackRef.current = asrTrack;
    await video.setOption('captions', 'track', asrTrack);
    setIsCaptionsOn(true);
  };

  return (
    <button
      type="button"
      className={`video-captions-btn${isCaptionsOn ? ' video-captions-btn--active' : ''}`}
      onClick={toggleCaptions}
      aria-pressed={isCaptionsOn}
      aria-label={isCaptionsOn ? '자막 끄기' : '자막 켜기'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" />
      </svg>
    </button>
  );
};

export default VideoCaptions;
