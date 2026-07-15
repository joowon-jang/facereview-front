import { ReactElement } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import EmotionBadge from 'components/EmotionBadge/EmotionBadge';
import GraphDetailDataItem from 'components/GraphDetailDataItem/GraphDetailDataItem';
import { EmotionType } from 'types';
import { EMOTION_COLORS, EMOTION_LABELS, EMOTIONS } from 'constants/index';

// Hoisted module-level constants to avoid re-creation on every render
const EMOTION_BY_EMOTION_TEXT = EMOTIONS.map((emotion) => ({
  emotion,
  emotionText: EMOTION_LABELS[emotion],
}));

const BAR_CHART_COLORS = EMOTIONS.map((e) => EMOTION_COLORS[e]);
const BAR_CHART_BORDER_COLOR = {
  from: 'color' as const,
  modifiers: [['darker', 1.6] as ['darker', number]],
};
const BAR_CHART_LABEL_TEXT_COLOR = {
  from: 'color' as const,
  modifiers: [['darker', 2.3] as ['darker', number]],
};
const BAR_CHART_MARGIN = { top: -10, bottom: -10 };

// 실시간 감정 패널 (제목 + 막대 그래프 + 감정별 상세).
// 모바일/데스크톱 × 나/다른 사람들 4곳에서 동일 마크업을 공유한다.
export const EmotionPanel = ({
  title,
  graphData,
  mostEmotion,
}: {
  title: string;
  graphData: Record<string, string | number>[];
  mostEmotion: EmotionType;
}): ReactElement => (
  <div className="emotion-container">
    <div className="emotion-title-wrapper">
      <h4 className="emotion-title font-title-small">{title}</h4>
      <EmotionBadge type="big" emotion={mostEmotion} />
    </div>
    <div className="graph-container">
      <ResponsiveBar
        data={graphData}
        keys={EMOTIONS as unknown as string[]}
        indexBy="id"
        padding={0.3}
        layout="horizontal"
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={BAR_CHART_COLORS}
        borderColor={BAR_CHART_BORDER_COLOR}
        axisTop={null}
        axisRight={null}
        axisBottom={null}
        axisLeft={null}
        enableGridY={false}
        enableLabel={false}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={BAR_CHART_LABEL_TEXT_COLOR}
        margin={BAR_CHART_MARGIN}
        legends={[]}
        role="application"
        ariaLabel={`${title} 차트`}
        barAriaLabel={(e) => `${e.id}: ${e.formattedValue}%`}
        tooltip={() => null}
      />
    </div>
    <div className="graph-detail-container">
      {EMOTION_BY_EMOTION_TEXT.map((e) => (
        <GraphDetailDataItem
          key={e.emotion}
          graphData={graphData}
          emotion={e.emotion}
          emotionText={e.emotionText}
          mostEmotion={mostEmotion}
        />
      ))}
    </div>
  </div>
);
