import { RefObject, useEffect, useState } from 'react';
import { BREAKPOINT_PX, TABLET_BREAKPOINT_PX } from 'constants/index';

/**
 * CSS `grid-template-columns: repeat(auto-fill, minmax(minWidth, 1fr))`
 * 와 동일한 열 개수를 컨테이너 폭 기준으로 계산한다.
 */
const getGridColumnCount = (
  containerWidth: number,
  minWidth = 300,
  gap = 24,
): number => {
  if (containerWidth <= 0) return 1;
  return Math.max(1, Math.floor((containerWidth + gap) / (minWidth + gap)));
};

/** 1280 컬럼 + 반응형 거터 기준 첫 paint 열 수 추정 */
const LAYOUT_MAX = 1280;

const layoutGutter = (viewport: number): number => {
  // SCSS $layout-gutter-* 와 동기화 (16 / 20 / 40)
  if (viewport < BREAKPOINT_PX) return 16;
  if (viewport < TABLET_BREAKPOINT_PX) return 20;
  return 40;
};

const estimatePageGridWidth = (): number => {
  if (typeof window === 'undefined') return 300;
  const viewport = window.innerWidth;
  return Math.max(0, Math.min(LAYOUT_MAX, viewport - layoutGutter(viewport) * 2));
};

const useGridColumnCount = (
  containerRef: RefObject<HTMLElement | null>,
  minWidth = 300,
  gap = 24,
): number => {
  const [columns, setColumns] = useState(() =>
    getGridColumnCount(estimatePageGridWidth(), minWidth, gap),
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = (width: number) => {
      setColumns(getGridColumnCount(width, minWidth, gap));
    };

    update(el.clientWidth);

    if (typeof ResizeObserver === 'undefined') {
      const onResize = () => update(el.clientWidth);
      window.addEventListener('resize', onResize, { passive: true });
      return () => window.removeEventListener('resize', onResize);
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      update(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, minWidth, gap]);

  return columns;
};

export default useGridColumnCount;
