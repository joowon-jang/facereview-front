import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Router from './components/Router';
import ErrorBoundary from 'components/ErrorBoundary/ErrorBoundary';
import { useAuthStorage } from 'store/authStore';
import { getUserName } from 'api/auth';

function App() {
  useEffect(() => {
    const handleUnauthorized = () => {
      useAuthStorage.getState().clearAuth();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const { is_sign_in, setUserInfo } = useAuthStorage.getState();

    if (!is_sign_in) return; // 게스트는 사용자 정보를 조회하지 않음

    // access_token이 만료되어 있어도 response interceptor가 refresh 후
    // 재시도하므로, 여기서는 단순히 getUserName만 호출합니다.
    // (refresh 경로를 단일화하여 isRefreshing 경쟁을 방지)
    getUserName()
      .then((res) => {
        if (res.status === 200) {
          const userData = res.data;
          setUserInfo({
            is_admin: userData.role === 'ADMIN',
            is_sign_in: true,
            user_id: userData.user_id,
            user_name: userData.name,
            user_profile: userData.profile_image_id,
            user_tutorial: userData.is_tutorial_done ? 1 : 0,
            access_token: useAuthStorage.getState().access_token,
            user_favorite_genres: userData.favorite_genres,
            is_verify_email_done: userData.is_verify_email_done,
          });
        }
      })
      .catch(() => {
        // refresh 실패 시 auth:unauthorized 이벤트가 clearAuth를 처리함
      });
  }, []);
  return (
    <div className="App">
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        limit={5}
      />
    </div>
  );
}

export default App;
