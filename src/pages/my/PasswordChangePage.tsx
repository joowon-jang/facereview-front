import { useEffect, useState } from 'react';
import TextInput from 'components/TextInput/TextInput';
import Button from 'components/Button/Button';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  changePassword,
  sendEmailVerification,
  verifyPasswordCode,
} from 'api/mypage';
import { useLogout } from 'hooks/useLogout';

import './passwordchangepage.scss';

const PasswordChangePage = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const navigate = useNavigate();
  const { handleLogout } = useLogout();

  // 페이지 열릴 때 초기화
  useEffect(() => {
    setStep(1);
    setIsEmailSent(false);
    setVerificationCode('');
    setResetToken('');
    setNewPassword('');
    setNewPasswordConfirm('');
  }, []);

  // 이메일 발송 핸들러
  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      await sendEmailVerification();
      setIsEmailSent(true);
      toast.success('인증 코드가 발송되었습니다.');
    } catch (error) {
      console.error(error);
      toast.error('인증 코드 발송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSending(false);
    }
  };

  const handleLogoutClick = async () => {
    await handleLogout('/auth/1');
  };

  // 인증 코드 검증 핸들러
  const handleVerifyCodeSubmit = async () => {
    if (verificationCode.length !== 6) {
      toast.error('인증코드 6자리를 입력해주세요.');
      return;
    }
    if (isVerifying) return;

    setIsVerifying(true);
    try {
      const res = await verifyPasswordCode({ code: verificationCode });
      if (res.data?.reset_token) {
        setResetToken(res.data.reset_token);
        setStep(2); // 새 비밀번호 입력 단계로 전환
        toast.success('인증이 완료되었습니다. 새 비밀번호를 입력해주세요.');
      } else {
        toast.error('오류가 발생했습니다. 토큰을 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error(err);
      toast.error('인증 코드가 올바르지 않거나 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 비밀번호 변경 요청 핸들러
  const handleChangePasswordSubmit = async () => {
    if (newPassword.length < 8) {
      toast.error('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error('입력한 두 비밀번호가 서로 다릅니다.');
      return;
    }
    if (isChanging) return;

    setIsChanging(true);
    try {
      await changePassword({
        reset_token: resetToken,
        new_password: newPassword,
      });
      toast.success(
        '비밀번호가 성공적으로 변경되었습니다! 다시 로그인 해주세요.',
      );
      handleLogoutClick(); // 변경 성공 시 후속 조치(로그아웃) 실행
    } catch (err) {
      console.error(err);
      toast.error('비밀번호 변경 처리 중 오류가 발생했습니다.');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="password-change-container">
      <div className="password-card">
        {step === 1 && (
          <>
            <h3 className="password-title font-title-medium">
              비밀번호 변경 인증
            </h3>
            <p className="password-desc font-body-large">
              {isSending ? (
                '인증 메일 발송 중입니다...'
              ) : isEmailSent ? (
                <>
                  가입하신 이메일로 6자리 인증 코드가 발송되었습니다.
                  <br />
                  수신된 메일을 확인하여 코드를 입력해주세요.
                </>
              ) : (
                <>
                  가입된 이메일 계정으로 본인 권한을 확인합니다.
                  <br />
                  아래 버튼을 눌러 인증 코드를 발송해주세요.
                </>
              )}
            </p>
            <div className="password-form">
              {!isEmailSent ? (
                <Button
                  label={isSending ? '발송 중...' : '인증코드 발송'}
                  variant="small"
                  onClick={handleSendEmail}
                  disabled={isSending}
                />
              ) : (
                <>
                  <TextInput
                    id="passwordVerificationCode"
                    className="code-input"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="6자리 코드"
                    maxLength={6}
                    inputMode="numeric"
                    aria-label="6자리 인증 코드"
                  />
                  <Button
                    label={isVerifying ? '확인 중...' : '인증 확인'}
                    variant="small"
                    onClick={handleVerifyCodeSubmit}
                    disabled={
                      isSending || isVerifying || verificationCode.length !== 6
                    }
                  />
                </>
              )}
            </div>
            <div className="password-secondary-action">
              <Button
                label="취소하고 돌아가기"
                variant="small-outline"
                onClick={() => navigate('/my')}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="password-title font-title-medium">
              새 비밀번호 설정
            </h3>
            <p className="password-desc font-body-large">
              새롭게 사용할 비밀번호를 입력해주세요.
              <br />
              최소 8자 이상의 안전한 암호를 권장합니다.
            </p>
            <div className="password-form">
              <TextInput
                id="newPassword"
                className="password-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력"
                aria-label="새 비밀번호 입력"
              />
              <TextInput
                id="newPasswordConfirm"
                className="password-input"
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
                aria-label="새 비밀번호 확인"
              />
              <Button
                label={isChanging ? '변경 중...' : '비밀번호 변경'}
                variant="small"
                onClick={handleChangePasswordSubmit}
                disabled={!newPassword || !newPasswordConfirm || isChanging}
              />
            </div>
            <div className="password-secondary-action">
              <Button
                label="취소하고 돌아가기"
                variant="small-outline"
                onClick={() => navigate('/my')}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PasswordChangePage;
