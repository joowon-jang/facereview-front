import { ReactElement } from 'react';
import './bookmarkbutton.scss';

type BookmarkButtonPropsType = {
  isActive: boolean;
  onClick?: (e: React.MouseEvent) => void;
  label?: string;
  size?: number;
  variant?: 'icon' | 'with-label';
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

const BookmarkButton = ({
  isActive,
  onClick,
  label,
  size = 24,
  variant = 'icon',
  className = '',
  style,
  ariaLabel,
}: BookmarkButtonPropsType): ReactElement => {
  const filled = isActive;
  return (
    <button
      type="button"
      className={`bookmark-button ${variant} ${className} ${
        filled ? 'active' : ''
      }`.trim()}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-pressed={isActive}
      aria-label={ariaLabel ?? (isActive ? '즐겨찾기 해제' : '즐겨찾기 추가')}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
      {variant === 'with-label' && label ? (
        <span className="bookmark-label font-label-small">{label}</span>
      ) : null}
    </button>
  );
};

export default BookmarkButton;
