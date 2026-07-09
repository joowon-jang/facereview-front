import { ReactElement, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStorage } from 'store/authStore';
import Header from '../Header/Header';

import './screencontainer.scss';

const ScreenContainer = ({
  headerShown,
  isSignIn = false,
}: {
  headerShown: boolean;
  isSignIn?: boolean;
}): ReactElement | null => {
  const is_sign_in = useAuthStorage((s) => s.is_sign_in);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isMyPage = pathname === '/my';
  const denied = isSignIn && !is_sign_in;

  useEffect(() => {
    if (isSignIn && !is_sign_in) {
      toast.error('로그인을 해주세요', { toastId: 'need signin' });
      navigate('/auth/1');
    }
  }, [isSignIn, is_sign_in, navigate]);

  if (denied) return null;

  return (
    <div className="screen-container">
      {headerShown ? <Header isMyPage={isMyPage} /> : null}
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default ScreenContainer;
