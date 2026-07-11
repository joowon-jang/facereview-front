import Button from 'components/Button/Button';
import ProfileIcon from 'components/ProfileIcon/ProfileIcon';
import VideoRecommendModal from 'components/VideoRecommendModal/VideoRecommendModal';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useAuthStorage } from 'store/authStore';
import AnimatedLogo from '../AnimatedLogo/AnimatedLogo';
import './header.scss';
import { mapNumberToEmotion } from 'utils/index';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useLogout } from 'hooks/useLogout';
import { useRequireSignIn } from 'hooks/useRequireSignIn';

type HeaderPropsType = {
  isMyPage?: boolean;
};

const Header = ({ isMyPage }: HeaderPropsType): ReactElement => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const is_sign_in = useAuthStorage((state) => state.is_sign_in);
  const user_profile = useAuthStorage((state) => state.user_profile);
  const { handleLogout } = useLogout();
  const requireSignIn = useRequireSignIn();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '');
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Focus the input whenever the search bar expands
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  // Close the expanded search on outside click or Escape
  useEffect(() => {
    if (!isSearchOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen]);

  const handleLogoutClick = async () => {
    await handleLogout('/main');
  };

  const runSearch = () => {
    const trimmed = keyword.trim();
    setKeyword(trimmed);
    setIsSearchOpen(false);
    if (trimmed) {
      navigate(`/main?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/main');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  // Debounced auto-search while the search bar is open.
  // Navigates (replace, to avoid history spam) shortly after typing stops.
  useEffect(() => {
    if (!isSearchOpen) return;
    const handle = window.setTimeout(() => {
      const trimmed = keyword.trim();
      const currentQ = searchParams.get('q') ?? '';
      // No-op when keyword already matches the URL — avoids redundant nav.
      if (trimmed === currentQ) return;
      const target = trimmed
        ? `/main?q=${encodeURIComponent(trimmed)}`
        : '/main';
      navigate(target, { replace: true });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [keyword, isSearchOpen, navigate, searchParams]);

  const handleSearchToggle = () => {
    if (isSearchOpen) {
      setIsSearchOpen(false);
    } else {
      setKeyword(searchParams.get('q') ?? '');
      setIsSearchOpen(true);
    }
  };

  const handleRecommendClick = () => {
    if (!requireSignIn()) return;
    setIsRecommendModalOpen(true);
  };

  const handleBookmarkClick = () => {
    if (!requireSignIn()) return;
    navigate('/bookmark');
  };

  return (
    <>
      <div className="header-background">
        <div className="header">
          <Link to="/" className="header-logo">
            <AnimatedLogo
              animationType="infinite"
              animatedWrapperWidth={isMobile ? 15 : 30}
              gap={3}
              style={isMobile ? { height: '18px' } : { height: '35px' }}
            />
          </Link>

          <div className="header-actions">
            {/* Search (Netflix-style expandable) */}
            <div
              ref={searchContainerRef}
              className={`header-search ${isSearchOpen ? 'open' : ''}`}>
              <form
                onSubmit={handleSearchSubmit}
                className="header-search-form">
                <button
                  type="button"
                  className="header-icon-button"
                  aria-label="검색"
                  aria-expanded={isSearchOpen}
                  onClick={() => {
                    if (isSearchOpen) {
                      runSearch();
                    } else {
                      handleSearchToggle();
                    }
                  }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={isMobile ? 20 : 22}
                    height={isMobile ? 20 : 22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
                <div className="header-search-input-wrap">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="header-search-input"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsSearchOpen(false);
                    }}
                    placeholder="찾고 싶은 영상을 검색해보세요…"
                    aria-label="영상 검색"
                    tabIndex={isSearchOpen ? 0 : -1}
                  />
                  <button
                    type="button"
                    className={`header-search-clear ${
                      keyword.length > 0 ? 'visible' : ''
                    }`}
                    aria-label="검색어 지우기"
                    tabIndex={keyword.length > 0 ? 0 : -1}
                    aria-hidden={keyword.length === 0}
                    onClick={() => {
                      setKeyword('');
                      searchInputRef.current?.focus();
                    }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </form>
            </div>

            {/* Video recommend (+) */}
            <button
              type="button"
              className="header-icon-button"
              aria-label="영상 추천 요청"
              onClick={handleRecommendClick}>
              <svg
                width={isMobile ? 22 : 24}
                height={isMobile ? 22 : 24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

            {/* Bookmark */}
            <button
              type="button"
              className="header-icon-button"
              aria-label="즐겨찾기"
              onClick={handleBookmarkClick}>
              <svg
                width={isMobile ? 22 : 24}
                height={isMobile ? 22 : 24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>

            {is_sign_in ? (
              isMyPage && isMobile ? (
                <button
                  type="button"
                  className="header-logout-button-mobile"
                  onClick={handleLogoutClick}>
                  <h3 className="font-label-small">로그아웃</h3>
                </button>
              ) : (
                <button
                  type="button"
                  className="header-profile-icon-button"
                  aria-label="마이페이지로 이동"
                  onClick={() => navigate('/my')}>
                  <ProfileIcon
                    type={isMobile ? 'icon-small' : 'icon-medium'}
                    color={mapNumberToEmotion(user_profile)}
                  />
                </button>
              )
            ) : (
              <Button
                label="로그인"
                variant={isMobile ? 'extra-small' : 'small'}
                onClick={() => navigate('/auth/1')}
              />
            )}
          </div>
        </div>

        <VideoRecommendModal
          isOpen={isRecommendModalOpen}
          onClose={() => setIsRecommendModalOpen(false)}
        />
      </div>
      {/* fixed header 가 차지하던 높이만큼 문서 흐름을 확보 */}
      <div className="header-spacer" aria-hidden="true" />
    </>
  );
};

export default Header;
