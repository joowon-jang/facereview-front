import { EMOTION_LABELS } from 'constants/index';
import { EmotionType } from 'types';

type TimelineTooltipEntry = {
  emotion: EmotionType;
  y: number;
  color: string;
};

export type TimelineTooltipProps = {
  time: number;
  entries: TimelineTooltipEntry[];
};

const formatSecondsToClock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};

// nivo 내장 슬라이스 대신 직접 구현한 툴팁. 그래프는 pointer-events:none 인 시각만
// 담당하고, 마우스 추적은 별도 오버레이에서 계산한 time/entries 만 받아 렌더한다.
export const TimelineTooltip = ({ time, entries }: TimelineTooltipProps) => (
  <div className="timeline-tooltip">
    <p className="timeline-tooltip-time font-label-small">
      {formatSecondsToClock(time)}
    </p>
    {entries.map((e) => (
      <div className="timeline-tooltip-row" key={e.emotion}>
        <span
          className="timeline-tooltip-dot"
          style={{ background: e.color }}
        />
        <span className="timeline-tooltip-label font-label-small">
          {EMOTION_LABELS[e.emotion]} {Math.round(e.y)}%
        </span>
      </div>
    ))}
    <p className="timeline-tooltip-hint font-label-small">
      클릭해서 이 장면으로 이동
    </p>
  </div>
);
