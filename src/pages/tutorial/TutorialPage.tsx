import { completeTutorial } from 'api/auth';
import tutorial1 from 'assets/img/tutorial1.gif';
import tutorial2 from 'assets/img/tutorial2.gif';
import tutorial3 from 'assets/img/tutorial3.gif';
import Button from 'components/Button/Button';
import Seo from 'components/Seo/Seo';
import StepIndicator from 'components/StepIndicator/StepIndicator';
import { ReactElement, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useIsDesktopLg } from 'hooks/useMediaQuery';
import './tutorialpage.scss';

type TutorialContent = { headline: string; desc: string };

// index 0은 사용하지 않음 — step은 1부터 시작
const TUTORIAL: (TutorialContent | null)[] = [
  null,
  {
    headline: '감정 기반 영상 추천',
    desc: '다른 사람들이 영상을 보며 가장 많이 느낀 감정을 토대로 영상을 추천받아요.',
  },
  {
    headline: '실시간 표정 기록',
    desc: '영상을 시청하며 보여지는 나의 생생한 표정이 실시간으로 기록돼요.',
  },
  {
    headline: '더 정확한 맞춤 추천',
    desc: '영상을 많이 볼수록 내가 좋아할만한 영상을 더 정확히 추천받을 수 있어요.',
  },
];
const TUTORIAL_IMG = [null, tutorial1, tutorial2, tutorial3];
const TUTORIAL_ALT = [
  '',
  '추천 영상 기능 설명 이미지',
  '실시간 표정 기록 기능 설명 이미지',
  '맞춤 추천 기능 설명 이미지',
];

const TutorialPage = (): ReactElement => {
  // 2열 레이아웃은 넓은 데스크톱에서만 — 태블릿·모바일은 1열
  const isDesktopLg = useIsDesktopLg();
  const { step } = useParams();
  const navigate = useNavigate();

  const currentStep = Number(step ?? 1);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextButtonRef.current?.focus();
  }, [currentStep]);

  const handleSkipClick = async () => {
    try {
      await completeTutorial();
      toast.success('튜토리얼 완료');
    } catch (err) {
      console.error('Failed to complete tutorial:', err);
    } finally {
      navigate('/');
    }
  };

  const handleContinueClick = () => {
    if (currentStep < 3) {
      navigate(`/tutorial/${currentStep + 1}`);
      return;
    }
    handleSkipClick();
  };

  const visual = (
    <div className="visual-wrapper">
      <img
        src={TUTORIAL_IMG[currentStep] ?? ''}
        alt={TUTORIAL_ALT[currentStep] ?? '튜토리얼 이미지'}
      />
    </div>
  );

  return (
    <div className="tutorial-container">
      <Seo
        title={`사용 방법 안내 (${currentStep}/3)`}
        description="FaceReview 사용법을 알아보세요. 감정 기반 영상 추천, 실시간 표정 기록, 맞춤 추천 기능이 어떻게 작동하는지 단계별로 안내해 드려요."
        keywords="FaceReview 사용법, 튜토리얼, 감정 추천 방법, 표정 기록, 페이스리뷰 도움말"
        path={`/tutorial/${currentStep}`}
      />
      <div className="tutorial-content" key={currentStep}>
        {isDesktopLg && (
          <div className="tutorial-left-container">{visual}</div>
        )}

        <div className="tutorial-right-container">
          <div className="tutorial-body">
            {isDesktopLg && <StepIndicator step={currentStep} maxStep={3} />}

            <div className="step-number">
              {currentStep.toString().padStart(2, '0')}
              <span className="step-total"> / 03</span>
            </div>

            <h2 className="tutorial-headline">
              {TUTORIAL[currentStep]?.headline}
            </h2>

            <p className="tutorial-text">{TUTORIAL[currentStep]?.desc}</p>

            {!isDesktopLg && (
              <div className="tutorial-compact-visual">
                {visual}
                <StepIndicator step={currentStep} maxStep={3} />
              </div>
            )}
          </div>

          <div className="button-container">
            {currentStep !== 3 ? (
              <Button
                label={'건너뛰기'}
                variant={'cta-fixed-secondary'}
                onClick={handleSkipClick}
              />
            ) : null}
            <Button
              ref={nextButtonRef}
              label={currentStep === 3 ? '완료' : '다음'}
              variant={currentStep === 3 ? 'cta-full' : 'cta-fixed'}
              onClick={handleContinueClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialPage;
