import { useMutation } from '@tanstack/react-query';
import { updateRequestVideoList } from 'api/request';
import Button from 'components/Button/Button';
import ModalDialog from 'components/ModalDialog/ModalDialog';
import SomeIcon from 'components/SomeIcon/SomeIcon';
import TextInput from 'components/TextInput/TextInput';
import youtubeIcon from 'assets/img/youtubeIcon.png';
import { ReactElement, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStorage } from 'store/authStore';

import './videoRecommendModal.scss';

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const getUniqueVideoIds = (videoIds: string[]) => Array.from(new Set(videoIds));

const extractVideoId = (input: string): string | null => {
  const value = input.trim();

  if (YOUTUBE_VIDEO_ID_PATTERN.test(value)) {
    return value;
  }

  try {
    const url = new URL(
      value.startsWith('http://') || value.startsWith('https://')
        ? value
        : `https://${value}`,
    );
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      return videoId && YOUTUBE_VIDEO_ID_PATTERN.test(videoId)
        ? videoId
        : null;
    }

    if (host.endsWith('youtube.com')) {
      const watchVideoId = url.searchParams.get('v');
      if (watchVideoId && YOUTUBE_VIDEO_ID_PATTERN.test(watchVideoId)) {
        return watchVideoId;
      }

      const pathVideoId = url.pathname
        .split('/')
        .filter(Boolean)
        .find((segment) => YOUTUBE_VIDEO_ID_PATTERN.test(segment));

      return pathVideoId ?? null;
    }
  } catch {
    const fallbackMatch = value.match(
      /(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/,
    );
    return fallbackMatch?.[1] ?? null;
  }

  return null;
};

const extractVideoIds = (input: string): string[] => {
  const ids = input
    .split(/[\s,]+/)
    .map(extractVideoId)
    .filter((videoId): videoId is string => !!videoId);

  return getUniqueVideoIds(ids);
};

const getThumbnailUrl = (videoId: string) =>
  `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

type VideoRecommendModalPropsType = {
  isOpen: boolean;
  onClose: () => void;
};

const VideoRecommendModal = ({
  isOpen,
  onClose,
}: VideoRecommendModalPropsType): ReactElement => {
  const is_sign_in = useAuthStorage((s) => s.is_sign_in);
  const navigate = useNavigate();

  const [registerInput, setRegisterInput] = useState('');
  const [registeredVideoIds, setRegisteredVideoIds] = useState<string[]>([]);

  const registerVideoMutation = useMutation({
    mutationFn: updateRequestVideoList,
  });

  const closeModal = () => {
    document.body.style.overflow = 'auto';
    setRegisterInput('');
    setRegisteredVideoIds([]);
    registerVideoMutation.reset();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setRegisterInput('');
      setRegisteredVideoIds([]);
      registerVideoMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const { registeringVideoIds, isRegisterMatched } = useMemo(() => {
    const videoIds = extractVideoIds(registerInput);
    return {
      registeringVideoIds: videoIds,
      isRegisterMatched: videoIds.length > 0,
    };
  }, [registerInput]);

  const videoIdsToSubmit = useMemo(
    () => getUniqueVideoIds([...registeredVideoIds, ...registeringVideoIds]),
    [registeredVideoIds, registeringVideoIds],
  );

  const handleAddVideoIds = () => {
    if (!isRegisterMatched) {
      return;
    }

    setRegisteredVideoIds((prevIds) =>
      getUniqueVideoIds([...prevIds, ...registeringVideoIds]),
    );
    setRegisterInput('');
  };

  const handleRegisterButtonClick = async () => {
    if (!is_sign_in) {
      toast.warn('로그인이 필요합니다', { toastId: 'need sign in' });
      navigate('/auth/1');
      return;
    }

    if (videoIdsToSubmit.length === 0) {
      toast.warn('추가할 영상 링크를 입력해주세요.');
      return;
    }

    try {
      const result = await registerVideoMutation.mutateAsync({
        youtube_url_list: videoIdsToSubmit,
      });

      toast.success(result.message || '영상 추천 요청이 등록되었습니다.');
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error('영상 추천 요청에 실패했습니다.');
    }
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={closeModal}>
      <div className="video-register-modal-container">
        <SomeIcon
          type={'close'}
          style={{ position: 'absolute', top: '20px', right: '20px' }}
          onClick={closeModal}
        />
        <h2 className="main-page-modal-title font-title-medium">
          맞춤형 영상을 추천해드릴게요.
          <br />
          재미있게 본 영상을 추가해주세요.
        </h2>
        <div className="main-page-modal-input-container">
          <p className="main-page-modal-input-label font-title-mini">
            영상 링크를 첨부해주세요
          </p>
          <div className="main-page-modal-input-wrapper">
            <TextInput
              value={registerInput}
              variant="underline"
              onChange={(e) => setRegisterInput(e.target.value)}
              placeholder={
                'ex) https://www.youtube.com/watch?v=3rfONMofiho…'
              }
            />
          </div>
        </div>
        <div className="main-page-modal-thumbnail-container">
          {isRegisterMatched ? (
            registeringVideoIds.map((videoId) => (
              <img
                key={`registering-${videoId}`}
                className="main-page-modal-thumbnail-registering"
                src={getThumbnailUrl(videoId)}
                alt="등록할 영상 썸네일"
              />
            ))
          ) : (
            <div className="main-page-modal-thumbnail-empty">
              <img
                className="main-page-modal-thumbnail-empty-image"
                src={youtubeIcon}
                alt="youtubeIcon"
              />
            </div>
          )}

          {registeredVideoIds.map((v, i) => (
            <img
              key={v || i}
              className="main-page-modal-thumbnail-registered"
              src={getThumbnailUrl(v)}
              alt="등록된 영상 썸네일"
            />
          ))}
        </div>
        <Button
          label={''}
          variant={'add'}
          aria-label="영상 추가"
          style={{ position: 'absolute', bottom: '128px' }}
          onClick={handleAddVideoIds}
          disabled={!isRegisterMatched || registerVideoMutation.isPending}
        />
        <div className="video-register-modal-button-wrapper">
          <Button
            label={registerVideoMutation.isPending ? '등록 중...' : '확인'}
            variant={'cta-full'}
            onClick={handleRegisterButtonClick}
            disabled={
              videoIdsToSubmit.length === 0 || registerVideoMutation.isPending
            }
          />
        </div>
      </div>
    </ModalDialog>
  );
};

export default VideoRecommendModal;
