import { ReactElement } from 'react';
import './videocardskeleton.scss';

type VideoCardSkeletonProps = {
  width?: number | string;
  style?: React.CSSProperties;
};

const VideoCardSkeleton = ({
  width,
  style,
}: VideoCardSkeletonProps): ReactElement => {
  const isNumber = typeof width === 'number';
  const numericWidth = isNumber ? width : 280;
  const height = isNumber ? numericWidth * (9 / 16) : undefined;

  return (
    <div
      className="video-card-skeleton"
      role="status"
      aria-busy="true"
      aria-label="영상 정보 불러오는 중"
      style={{
        ...style,
        width: isNumber ? `${numericWidth}px` : width || '100%',
      }}>
      <div
        className="thumbnail-skeleton"
        style={
          isNumber
            ? { width: numericWidth, height: height }
            : { width: '100%', aspectRatio: '16 / 9' }
        }></div>
      <div className="info-skeleton">
        <div className="title-skeleton"></div>
        <div className="meta-skeleton">
          <div className="circle-skeleton"></div>
          <div className="text-skeleton"></div>
        </div>
      </div>
    </div>
  );
};

export default VideoCardSkeleton;
