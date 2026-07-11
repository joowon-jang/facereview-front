import { useState } from 'react';
import { EMOTIONS } from 'constants/index';
import { toast } from 'react-toastify';
import Button from 'components/Button/Button';
import TextInput from 'components/TextInput/TextInput';
import { useNavigate } from 'react-router-dom';
import './editpage.scss';
import ProfileIcon from 'components/ProfileIcon/ProfileIcon';
import ModalDialog from 'components/ModalDialog/ModalDialog';
import { CategoryType, EmotionType } from 'types';
import { useAuthStorage } from 'store/authStore';
import { updateProfile } from 'api/auth';
import { withdraw } from 'api/mypage';
import { mapEmotionToNumber, mapNumberToEmotion } from 'utils/index';
import CategoryList from 'components/CategoryList/CategoryList';
import { useLogout } from 'hooks/useLogout';

const EditPage = () => {
  const setUserName = useAuthStorage((s) => s.setUserName);
  const setUserProfile = useAuthStorage((s) => s.setUserProfile);
  const setUserFavoriteGenres = useAuthStorage((s) => s.setUserFavoriteGenres);
  const user_name = useAuthStorage((s) => s.user_name);
  const user_profile = useAuthStorage((s) => s.user_profile);
  const user_favorite_genres = useAuthStorage((s) => s.user_favorite_genres);
  const navigate = useNavigate();
  const { handleLogout } = useLogout();
  const [nickName, setNickName] = useState(user_name);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>(
    user_favorite_genres as CategoryType[],
  );
  const [selectedColor, setSelectedColor] = useState<EmotionType>(
    mapNumberToEmotion(user_profile),
  );
  const [committedColor, setCommittedColor] = useState<EmotionType>(
    mapNumberToEmotion(user_profile),
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleColorSelect = (color: EmotionType) => {
    setSelectedColor(color);
  };

  // 스크롤 잠금은 ModalDialog 가 담당 — 여기서 body.overflow 를 직접 만지면
  // 잠금 카운터가 'hidden' 을 이전 값으로 저장해 닫은 뒤 스크롤이 풀리지 않는다.
  const openModal = () => {
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
  };
  const handleModalCheck = () => {
    updateProfile({
      name: nickName,
      profile_image_id: mapEmotionToNumber(selectedColor),
      favorite_genres: selectedCategories as string[],
    })
      .then((res) => {
        setCommittedColor(selectedColor);
        if (res.status === 200) {
          setUserProfile({ user_profile: mapEmotionToNumber(selectedColor) });
          toast.success('프로필사진이 변경되었어요', {
            toastId: 'success change profile image',
          });
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error('프로필사진 변경에 실패했어요');
      });

    setIsModalOpen(false);
  };

  const handleEditButtonClick = () => {
    if (isSaving) return;
    setIsSaving(true);
    updateProfile({
      name: nickName,
      profile_image_id: mapEmotionToNumber(committedColor),
      favorite_genres: selectedCategories as string[],
    })
      .then((res) => {
        if (res.status === 200) {
          setUserName({ user_name: nickName });
          setUserFavoriteGenres({ user_favorite_genres: selectedCategories });
          toast.success('회원정보가 수정되었어요', {
            toastId: 'success change info',
          });
          navigate('/my');
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error('회원정보 수정에 실패했어요');
      })
      .finally(() => setIsSaving(false));
  };

  const handleWithdrawClick = () => {
    setIsWithdrawModalOpen(true);
  };

  const handleWithdrawConfirm = async () => {
    setIsWithdrawing(true);
    try {
      await withdraw();
      toast.success('탈퇴가 완료되었어요');
      setIsWithdrawModalOpen(false);
      await handleLogout('/main');
    } catch (error) {
      console.error(error);
      toast.error('탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <>
      <div className="edit-page-container">
        <h2 className="edit-page-title font-title-large">프로필 편집</h2>

        <div className="edit-page-user-container">
          <ProfileIcon
            type={'icon-large'}
            color={committedColor}
            isEditable={true}
            onEditClick={openModal}
          />

          <div className="edit-page-edit-container">
            <div className="edit-page-input-container">
              <label
                htmlFor="editNickName"
                className="font-title-mini edit-page-input-label">
                닉네임
              </label>
              <TextInput
                id={'editNickName'}
                value={nickName}
                onChange={(e) => setNickName(e.target.value)}
                placeholder={'하하호호'}
              />
              {nickName.length < 2 && (
                <p className="edit-page-input-alert-message font-body-large">
                  최소 2자이상 입력해주세요.
                </p>
              )}
            </div>

            <div className="edit-page-category-wrapper">
              <label
                htmlFor="editCategory"
                className="font-title-mini edit-page-category-label">
                관심사 (필수)
              </label>
              <div className="category-wrapper">
                <CategoryList
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                />
              </div>
              {selectedCategories.length < 1 && (
                <p className="edit-page-input-alert-message font-body-large">
                  최소 1개의 카테고리를 선택해주세요
                </p>
              )}
            </div>
          </div>

          <Button
            label={isSaving ? '저장 중...' : '수정'}
            variant="cta-full"
            disabled={
              nickName.length < 2 || selectedCategories.length < 1 || isSaving
            }
            onClick={handleEditButtonClick}
          />
        </div>

        <div className="edit-page-withdraw-container">
          <button
            type="button"
            className="edit-page-withdraw-button font-body-large"
            onClick={handleWithdrawClick}>
            탈퇴하기
          </button>
          <p className="edit-page-withdraw-notice font-body-medium">
            * 탈퇴 시 계정 정보는 삭제되지만, 분석된 감정 데이터는 삭제되지
            않습니다.
          </p>
        </div>
      </div>

      <ModalDialog isOpen={isModalOpen} onClose={closeModal}>
        <div className="edit-page-modal-container">
          <h3 className="font-title-mini edit-page-modal-title">
            아이콘을 선택해주세요
          </h3>
          <div className="edit-page-modal-icon-wrapper">
            {EMOTIONS.map((emotion, index) => (
              <ProfileIcon
                key={emotion}
                type="icon-medium"
                color={emotion}
                onSelectClick={() => handleColorSelect(emotion)}
                style={{
                  cursor: 'pointer',
                  marginRight: index !== EMOTIONS.length - 1 ? '10px' : 0,
                  border:
                    selectedColor === emotion ? '3px solid #76FFCE' : 'none',
                }}
              />
            ))}
          </div>
          <div className="edit-page-modal-button-wrapper">
            <Button
              label={'확인'}
              variant={'cta-full'}
              onClick={() => {
                closeModal();
                handleModalCheck();
              }}
            />
          </div>
        </div>
      </ModalDialog>

      <ModalDialog
        isOpen={isWithdrawModalOpen}
        onClose={() => !isWithdrawing && setIsWithdrawModalOpen(false)}
        contentLabel="회원 탈퇴 확인">
        <div className="withdraw-modal-container" role="alertdialog">
          <div className="withdraw-modal-icon" aria-hidden="true">
            !
          </div>
          <p className="withdraw-modal-eyebrow font-label-small">위험 · 되돌릴 수 없음</p>
          <h2 className="withdraw-modal-title font-title-medium">
            정말 탈퇴하시겠어요?
          </h2>
          <p className="withdraw-modal-description font-body-medium">
            탈퇴하면 계정이 삭제되고, 같은 이메일로 다시 가입해도 이전
            정보는 복구되지 않아요.
          </p>
          <ul className="withdraw-modal-checklist">
            <li>닉네임, 프로필, 관심사 설정이 삭제됩니다</li>
            <li>즐겨찾기 등 개인 이용 기록이 사라질 수 있습니다</li>
            <li>분석된 감정 데이터는 서비스에 남을 수 있습니다</li>
          </ul>
          <div className="withdraw-modal-button-wrapper">
            <Button
              label="취소하고 유지하기"
              variant="cta-fixed-secondary"
              disabled={isWithdrawing}
              onClick={() => setIsWithdrawModalOpen(false)}
            />
            <Button
              label={isWithdrawing ? '탈퇴 처리 중...' : '탈퇴하기'}
              variant="cta-fixed"
              className="withdraw-modal-confirm"
              disabled={isWithdrawing}
              onClick={handleWithdrawConfirm}
            />
          </div>
        </div>
      </ModalDialog>
    </>
  );
};

export default EditPage;
