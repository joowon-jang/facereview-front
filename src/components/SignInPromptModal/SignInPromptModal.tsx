import { useNavigate } from 'react-router-dom';
import ModalDialog from 'components/ModalDialog/ModalDialog';
import { ReactElement } from 'react';
import { useSignInPromptStore } from 'store/signInPromptStore';
import './signInPromptModal.scss';

const SignInPromptModal = (): ReactElement => {
  const isOpen = useSignInPromptStore((s) => s.isOpen);
  const close = useSignInPromptStore((s) => s.close);
  const navigate = useNavigate();

  const handleLogin = () => {
    close();
    navigate('/auth/1');
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={close}>
      <div className="sign-in-prompt-modal">
        <div className="sign-in-prompt-icon" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h2 className="sign-in-prompt-title font-title-medium">
          로그인이 필요해요
        </h2>
        <p className="sign-in-prompt-desc font-body-medium">
          로그인하고 영상을 저장하고
          <br />
          좋아요를 남겨보세요.
        </p>
        <div className="sign-in-prompt-buttons">
          <button
            type="button"
            className="sign-in-prompt-btn secondary font-label-large"
            onClick={close}>
            취소
          </button>
          <button
            type="button"
            className="sign-in-prompt-btn primary font-label-large"
            onClick={handleLogin}>
            로그인 하기
          </button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default SignInPromptModal;
