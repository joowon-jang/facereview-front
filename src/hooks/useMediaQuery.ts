import { useEffect, useState } from 'react';
import { BREAKPOINT_PX, TABLET_BREAKPOINT_PX } from 'constants/index';

const useMediaQuery = (query: string) => {
  const getMatches = (q: string): boolean =>
    typeof window !== 'undefined' ? window.matchMedia(q).matches : false;

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const update = () => setMatches(mediaQuery.matches);

    // matchMedia 의 change 이벤트는 브레이크포인트를 교차할 때만 발생하므로,
    // resize 이벤트에서도 rAF로 재평가하여 모든 리사이즈에 즉시 반영한다.
    // (setMatches 에 동일한 boolean 이 전달되면 React 가 리렌더를 건너뛴다)
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    mediaQuery.addEventListener('change', update);
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      mediaQuery.removeEventListener('change', update);
      window.removeEventListener('resize', onResize);
    };
  }, [query]);

  return matches;
};

// SCSS mixins 와 동기화
// mobile  < 640
// tablet  640–1023
// desktop ≥ 1024
export const useIsMobile = () =>
  useMediaQuery(`(max-width: ${BREAKPOINT_PX - 1}px)`);

export const useIsTablet = () =>
  useMediaQuery(
    `(min-width: ${BREAKPOINT_PX}px) and (max-width: ${TABLET_BREAKPOINT_PX - 1}px)`,
  );

export const useIsDesktopLg = () =>
  useMediaQuery(`(min-width: ${TABLET_BREAKPOINT_PX}px)`);

export default useMediaQuery;
