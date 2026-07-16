import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './mypage.scss';

import Button from 'components/Button/Button';
import Chip from 'components/Chip/Chip';
import Seo from 'components/Seo/Seo';
import ProfileIcon from 'components/ProfileIcon/ProfileIcon';
import SomeIcon from 'components/SomeIcon/SomeIcon';

import { ResponsivePie } from '@nivo/pie';
import Etc from 'assets/img/etc.png';
import { useAuthStorage } from 'store/authStore';
import VideoItem from 'components/VideoItem/VideoItem';
import VideoCarousel from 'components/VideoCarousel/VideoCarousel';
import VideoCardSkeleton from 'components/Skeleton/VideoCardSkeleton';
import ModalDialog from 'components/ModalDialog/ModalDialog';
import TextInput from 'components/TextInput/TextInput';
import { sendEmailVerification, verifyEmailCode } from 'api/mypage';
import { toast } from 'react-toastify';
import { getEmotionSummary, getRecentVideo } from 'api/youtube';
import { useLogout } from 'hooks/useLogout';
import { EmotionType, VideoWatchedType } from 'types/index';
import { getScaledTimelineGraphData, mapNumberToEmotion } from 'utils/index';
import { ResponsiveLine } from '@nivo/line';
import { useIsMobile } from 'hooks/useMediaQuery';
import useWindowSize from 'hooks/useWindowSize';
import {
  EMOTION_COLORS,
  EMOTION_EMOJIS,
  EMOTION_LABELS,
  EMOTIONS,
  TABLET_BREAKPOINT_PX,
} from 'constants/index';
import { useQuery } from '@tanstack/react-query';

// Hoisted module-level constants
const PAST_TENSE_LABELS: Record<EmotionType, string> = {
  happy: '즐거웠어요',
  sad: '슬펐어요',
  surprise: '놀랐어요',
  angry: '화났어요',
  neutral: '평온했어요',
};

const INITIAL_DONUT_DATA = EMOTIONS.map((emotion) => ({
  id: emotion,
  label: EMOTION_LABELS[emotion],
  value: 0,
  color: EMOTION_COLORS[emotion],
  originalId: emotion,
}));

const INITIAL_EMOTION_TIME = {
  happy: 0,
  sad: 0,
  surprise: 0,
  angry: 0,
  neutral: 0,
};

// 타임라인 그래프는 데이터 없는 감정 시리즈가 필터링되므로, 순서 기반 배열 대신
// 시리즈 id 로 색상을 매핑해야 감정-색상이 어긋나지 않는다 (WatchPage 와 동일).
const LINE_CHART_COLORS = (serie: { id: string }) =>
  EMOTION_COLORS[serie.id as EmotionType] ?? EMOTION_COLORS.neutral;
const LINE_CHART_MARGIN = { top: 2, right: 0, bottom: 2, left: 0 };

const DURATION_UNITS = [
  { divisor: 365 * 24 * 60 * 60, label: '년' },
  { divisor: 30 * 24 * 60 * 60, label: '개월' },
  { divisor: 24 * 60 * 60, label: '일' },
  { divisor: 60 * 60, label: '시간' },
  { divisor: 60, label: '분' },
  { divisor: 1, label: '초' },
] as const;

/** 리스트 등 전체 단위 표기 */
const formatDuration = (seconds: number): string => {
  let remaining = Math.max(0, Math.floor(seconds || 0));
  const parts: string[] = [];

  for (const { divisor, label } of DURATION_UNITS) {
    const value = Math.floor(remaining / divisor);
    remaining %= divisor;
    if (value > 0) parts.push(`${value}${label}`);
  }

  return parts.join(' ') || '0초';
};

const MyPage = () => {
  const is_sign_in = useAuthStorage((s) => s.is_sign_in);
  const user_name = useAuthStorage((s) => s.user_name);
  const user_profile = useAuthStorage((s) => s.user_profile);
  const is_verify_email_done = useAuthStorage((s) => s.is_verify_email_done);
  const setVerifyEmailDone = useAuthStorage((s) => s.setVerifyEmailDone);

  const isMobile = useIsMobile();
  const windowWidth = useWindowSize();

  const navigate = useNavigate();
  const { handleLogout } = useLogout();

  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const [selectedEmotion, setSelectedEmotion] = useState<'all' | EmotionType>(
    'all',
  );

  const [showRawSeconds, setShowRawSeconds] = useState(false);

  // React Query: fetch recent videos
  const { data: recentVideo = [], isLoading: isRecentLoading } = useQuery<
    VideoWatchedType[]
  >({
    queryKey: ['mypage', 'recentVideos'],
    queryFn: () => getRecentVideo(),
    enabled: is_sign_in,
  });

  // VideoCarousel desktopSlidesPerView={3} 과 동일한 스켈레톤 개수
  // (캐러셀 브레이크포인트와 동일하게 TABLET_BREAKPOINT_PX 기준으로 분기)
  const recentSkeletonCount = isMobile
    ? 1
    : windowWidth >= TABLET_BREAKPOINT_PX
      ? 3
      : 2;

  // React Query: fetch emotion summary
  const { data: emotionSummaryData, isLoading: isEmotionLoading } = useQuery({
    queryKey: ['mypage', 'emotionSummary'],
    queryFn: () => getEmotionSummary(),
    enabled: is_sign_in,
  });

  const emotionTimeData =
    emotionSummaryData?.emotion_seconds ?? INITIAL_EMOTION_TIME;

  const totalSeconds = useMemo(() => {
    return Object.values(emotionTimeData).reduce(
      (sum, val) => sum + (val || 0),
      0,
    );
  }, [emotionTimeData]);

  const donutGraphData = useMemo(() => {
    if (!emotionSummaryData?.emotion_percentages) return INITIAL_DONUT_DATA;
    return INITIAL_DONUT_DATA.map((item) => ({
      ...item,
      value: Math.round(
        emotionSummaryData.emotion_percentages[item.originalId] || 0,
      ),
    }));
  }, [emotionSummaryData]);

  // 0% 감정은 호 두께가 0이라 화면엔 안 보이지만 padAngle 간격은 그대로 적용돼,
  // 그 감정이 있던 자리의 간격만 유독 넓어 보인다. 차트엔 0%를 빼서 간격을
  // 모든 경계에서 동일하게 만든다(범례는 5개 전부 그대로 보여준다).
  const visibleDonutGraphData = useMemo(
    () => donutGraphData.filter((item) => item.value > 0),
    [donutGraphData],
  );

  const totalWatchLabel = useMemo(() => {
    if (totalSeconds <= 0) return '—';
    return showRawSeconds
      ? `${Math.floor(totalSeconds).toLocaleString()}초`
      : formatDuration(totalSeconds);
  }, [totalSeconds, showRawSeconds]);

  const totalWatchSizeClass = useMemo(() => {
    if (totalWatchLabel.length >= 14) return ' is-long';
    if (totalWatchLabel.length >= 8) return ' is-mid';
    return '';
  }, [totalWatchLabel]);

  const filteredRecentVideos = useMemo(
    () =>
      recentVideo
        .filter(
          (video) =>
            selectedEmotion === 'all' ||
            video.dominant_emotion === selectedEmotion,
        )
        .map((video) => {
          let graphData: { id: string; data: { x: number; y: number }[] }[] =
            [];
          if (
            video.timeline_data &&
            Object.keys(video.timeline_data).length > 0
          ) {
            graphData = getScaledTimelineGraphData(
              video.timeline_data,
              video.duration,
            );
          }

          return {
            ...video,
            graphData,
          };
        }),
    [recentVideo, selectedEmotion],
  );

  const handleChipClick = (emotion: 'all' | EmotionType) => {
    setSelectedEmotion(emotion);
  };

  const handleLogoutClick = async () => {
    await handleLogout('/main');
  };

  const handleVerifyEmailClick = async () => {
    try {
      await sendEmailVerification();
      toast.success('인증 코드가 발송되었습니다.');
      setIsVerificationModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('인증 코드 발송에 실패했습니다.');
    }
  };

  const handleVerifyCodeSubmit = async () => {
    if (verificationCode.length !== 6) {
      toast.error('인증코드 6자리를 입력해주세요.');
      return;
    }
    try {
      await verifyEmailCode({ code: verificationCode });
      toast.success('이메일 인증이 완료되었습니다.');
      setVerifyEmailDone(true);
      setIsVerificationModalOpen(false);
      setVerificationCode('');
    } catch (err) {
      console.error(err);
      toast.error('인증 코드가 올바르지 않거나 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Seo
        title="마이페이지 - FaceReview"
        description="내 감정 리뷰 통계와 최근 시청 영상을 FaceReview 마이페이지에서 확인하세요."
        keywords="마이페이지, 감정 통계, 시청 기록, FaceReview, 페이스리뷰"
        path="/my"
        noindex
      />
      <div className="my-page-container">
        {/* ── Email Verification Banner ── */}
        {!is_verify_email_done && (
          <section
            className="verify-alert-banner"
            role="alert"
            aria-live="polite">
            <p className="banner-text">
              원활한 서비스 이용을 위해 이메일 인증을 진행해주세요.
            </p>
            <button
              type="button"
              className="banner-action"
              onClick={handleVerifyEmailClick}
              aria-label="이메일 인증 진행하기">
              인증하기
            </button>
          </section>
        )}

        {/* ── Profile Hero Card ── */}
        <div className="my-page-user-container">
          <div className="my-page-user-info-container">
            <div className="my-page-profile-image-container">
              <ProfileIcon
                type={isMobile ? 'icon-medium' : 'icon-large'}
                color={mapNumberToEmotion(user_profile)}
              />
              {is_verify_email_done && (
                <span
                  className="verify-badge"
                  role="img"
                  aria-label="이메일 인증 완료된 계정입니다."
                  title="이메일 인증 완료"></span>
              )}
            </div>
            <div className="my-page-user-edit-container">
              <div className="my-page-name-container">
                <div className="my-page-name-wrapper">
                  <h2
                    className="my-page-username font-title-medium"
                    style={{ display: 'flex', alignItems: 'center' }}>
                    {user_name}님
                  </h2>
                  <SomeIcon
                    type={isMobile ? 'small-next' : 'large-next'}
                    onClick={() => navigate('/edit')}
                  />
                </div>
                <h3
                  className={
                    isMobile ? 'font-title-mini' : 'font-title-small'
                  }>
                  오늘은 어떤 기분이신가요?
                </h3>
              </div>
              {!isMobile && (
                <div className="my-page-actions">
                  <Button
                    label="비밀번호 변경"
                    variant="small-outline"
                    onClick={() => navigate('/my/password-change')}
                  />
                  <Button
                    label="로그아웃"
                    variant="small-outline"
                    onClick={handleLogoutClick}
                  />
                </div>
              )}
            </div>
          </div>
          {isMobile && (
            <div className="my-page-mobile-actions">
              <Button
                label="비밀번호 변경"
                variant="small-outline"
                onClick={() => navigate('/my/password-change')}
              />
              <Button
                label="로그아웃"
                variant="small-outline"
                onClick={handleLogoutClick}
              />
            </div>
          )}
        </div>

        {/* ── Recent Videos Section ── */}
        <div className="my-page-watched-contents-container">
          <div className="my-page-watched-title-container">
            <div className="my-page-section-header">
              <h3
                className={
                  isMobile
                    ? 'my-page-title font-title-small'
                    : 'my-page-title font-title-medium'
                }>
                최근 본 영상
              </h3>
            </div>
            <div className="my-page-chip-container">
              <div className="my-page-chip-wrapper">
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
                      isMobile
                        ? { marginRight: '12px' }
                        : { marginRight: '24px' }
                    }
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="my-page-video-container">
            <div className="my-page-video-wrapper">
              {isRecentLoading ? (
                <div
                  className="my-page-recent-skeleton"
                  role="status"
                  aria-busy="true"
                  aria-label="최근 본 영상 불러오는 중">
                  {Array.from({ length: recentSkeletonCount }).map((_, i) => (
                    <div
                      className="recent-video-item recent-video-item--skeleton"
                      key={`recent-skeleton-${i}`}>
                      <VideoCardSkeleton width="100%" />
                      <div
                        className="video-graph-container video-graph-skeleton"
                        aria-hidden="true"
                      />
                    </div>
                  ))}
                </div>
              ) : filteredRecentVideos.length > 0 ? (
                <VideoCarousel
                  videos={filteredRecentVideos}
                  desktopSlidesPerView={3}
                  renderItem={(v, i) => (
                    <div
                      className="recent-video-item"
                      key={`videoItem${v.youtube_url}${v.dominant_emotion_per}_${i}`}>
                      <VideoItem
                        type="big-emoji"
                        width="100%"
                        videoId={v.youtube_url}
                        videoUuid={v.video_id}
                        videoTitle={v.title}
                        videoMostEmotion={v.dominant_emotion}
                        videoMostEmotionPercentage={v.dominant_emotion_per}
                        style={
                          isMobile
                            ? { paddingTop: '14px', paddingBottom: '14px' }
                            : { marginRight: '0' }
                        }
                        hoverToPlay={false}
                      />
                      <div className="video-graph-container">
                        {v.graphData.length > 0 && (
                          <ResponsiveLine
                            data={v.graphData}
                            colors={LINE_CHART_COLORS}
                            margin={LINE_CHART_MARGIN}
                            xScale={{
                              type: 'linear',
                              min: 0,
                              max: v.duration || 100,
                              // d3 nice() 의 도메인 확장(예: 471→500)을 막아
                              // 그래프가 카드 오른쪽 끝까지 정확히 차게 한다
                              nice: false,
                            }}
                            yScale={{
                              type: 'linear',
                              min: 0,
                              max: 100,
                              reverse: false,
                            }}
                            curve={'monotoneX'}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={null}
                            axisLeft={null}
                            enableGridX={false}
                            enableGridY={false}
                            enablePoints={false}
                            useMesh={false}
                            legends={[]}
                            tooltip={() => null}
                          />
                        )}
                      </div>
                    </div>
                  )}
                />
              ) : (
                <div className="my-page-video-empty">
                  <img
                    className="my-page-video-empty-img"
                    src={Etc}
                    alt="아직 본 영상 없음"
                  />
                  <p
                    className={
                      isMobile ? 'font-label-medium' : 'font-label-large'
                    }>
                    아직 본 영상이 없어요
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Emotion Graph Section ── */}
        <div className="my-page-emotion-container">
          <div className="my-page-section-header">
            <h2 className={isMobile ? 'font-title-small' : 'font-title-medium'}>
              나의 감정 그래프
            </h2>
            <label className="raw-seconds-toggle">
              <span className="raw-seconds-toggle-label">초 단위로 보기</span>
              <span className="raw-seconds-toggle-switch">
                <input
                  type="checkbox"
                  checked={showRawSeconds}
                  onChange={() => setShowRawSeconds((prev) => !prev)}
                />
                <span className="raw-seconds-toggle-track" aria-hidden="true">
                  <span className="raw-seconds-toggle-thumb" />
                </span>
              </span>
            </label>
          </div>
          <div className="my-page-emotion-graph-container">
            {isEmotionLoading ? (
              <div
                className="my-page-emotion-skeleton"
                role="status"
                aria-busy="true"
                aria-label="감정 그래프 불러오는 중">
                <div className="emotion-skeleton-donut" aria-hidden="true" />
                <div className="emotion-skeleton-stats" aria-hidden="true">
                  {EMOTIONS.map((emotion) => (
                    <div
                      key={`emotion-skeleton-${emotion}`}
                      className="emotion-skeleton-row"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="pie-graph-card">
                  <div className="pie-chart-wrapper">
                    {donutGraphData.every((d) => d.value === 0) ? (
                      <ResponsivePie
                        data={[{ id: 'empty', label: 'empty', value: 1 }]}
                        colors={['#4B4B5C']}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        innerRadius={0.72}
                        enableArcLabels={false}
                        enableArcLinkLabels={false}
                        tooltip={() => null}
                        isInteractive={false}
                      />
                    ) : (
                      <ResponsivePie
                        colors={{ datum: 'data.color' }}
                        data={visibleDonutGraphData}
                        sortByValue={false}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        activeOuterRadiusOffset={6}
                        borderWidth={0}
                        innerRadius={0.72}
                        padAngle={1}
                        cornerRadius={4}
                        enableArcLabels={false}
                        enableArcLinkLabels={false}
                        tooltip={() => null}
                      />
                    )}
                    <div className="pie-center-label">
                      <div className="pie-center-title">총 시청</div>
                      <div
                        className={`pie-center-value${totalWatchSizeClass}`}>
                        {totalWatchLabel}
                      </div>
                    </div>
                  </div>
                  <div className="pie-legend-container">
                    {donutGraphData.map((item) => (
                      <div
                        key={item.originalId}
                        className="legend-item-wrapper">
                        <div
                          className={`legend-item-color ${item.originalId}`}></div>
                        <span className="legend-item-label">
                          {EMOTION_LABELS[item.originalId]}
                        </span>
                        <span className="legend-item-text">
                          {item.value || 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="emotion-time-card">
                  <h3 className="emotion-time-title">그동안 영상을 보며</h3>
                  <div className="emotion-stats-grid">
                    {EMOTIONS.map((emotion) => (
                      <div key={emotion} className="emotion-stat-row">
                        <span className="stat-emoji">
                          {EMOTION_EMOJIS[emotion]}
                        </span>
                        <span className="stat-label">
                          {PAST_TENSE_LABELS[emotion]}
                        </span>
                        <span className={`stat-value ${emotion}`}>
                          {showRawSeconds
                            ? `${Math.floor(
                                emotionTimeData?.[emotion] || 0,
                              ).toLocaleString()}초`
                            : formatDuration(emotionTimeData?.[emotion] || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Email Verification Modal ── */}
      <ModalDialog
        isOpen={isVerificationModalOpen}
        onClose={() => {
          setIsVerificationModalOpen(false);
          setVerificationCode('');
        }}>
        <div className="email-verification-modal-container">
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h3
              className="font-title-large"
              style={{
                marginTop: '0',
                marginBottom: '16px',
                fontSize: '24px',
                fontWeight: '700',
              }}>
              이메일 인증
            </h3>
            <p
              className="font-body-large"
              style={{
                marginTop: '0',
                marginBottom: '40px',
                color: '#A0A0A0',
                lineHeight: '1.6',
                fontSize: '15px',
              }}>
              가입하신 이메일로 6자리 인증 코드가 발송되었습니다.
              <br />
              수신된 메일을 확인하여 코드를 입력해주세요.
            </p>
            <TextInput
              id="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="6자리 코드"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6자리 인증 코드"
              style={{
                width: '100%',
                maxWidth: '280px',
                margin: '0 auto',
                textAlign: 'center',
                letterSpacing: '8px',
                backgroundColor: '#2A2A36',
                border: '1px solid #4B4B5C',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '20px',
                fontWeight: '700',
                color: '#FFFFFF',
              }}
            />
          </div>
          <div className="email-verification-modal-button-wrapper">
            <Button
              label={'취소'}
              variant={'cta-fixed-secondary'}
              style={{ marginRight: '12px', background: '#5D5D6D' }}
              onClick={() => {
                setIsVerificationModalOpen(false);
                setVerificationCode('');
              }}
            />
            <Button
              label={'확인'}
              variant={'cta-fixed'}
              onClick={handleVerifyCodeSubmit}
            />
          </div>
        </div>
      </ModalDialog>
    </>
  );
};

export default MyPage;
