import { EMOTION_EMOJIS, EMOTION_LABELS, EMOTIONS } from 'constants/index';
import {
  EmotionType,
  GraphDistributionDataType,
  VideoDistributionDataType,
} from 'types/index';

export const labelOfEmotion = EMOTION_LABELS;

export const emojiOfEmotion = EMOTION_EMOJIS;

export const mapEmotionToNumber = (emotion: EmotionType): number => {
  const mapping: Record<EmotionType, number> = {
    neutral: 0,
    happy: 1,
    surprise: 2,
    sad: 3,
    angry: 4,
  };
  return mapping[emotion];
};

export const mapNumberToEmotion = (num: number): EmotionType => {
  const mapping: Record<number, EmotionType> = {
    0: 'neutral',
    1: 'happy',
    2: 'surprise',
    3: 'sad',
    4: 'angry',
  };
  return mapping[num] ?? 'neutral';
};

export const getDistributionToGraphData = (
  dist: VideoDistributionDataType,
): GraphDistributionDataType[] => {
  if (!dist) return [];
  return EMOTIONS.map((emotion) => {
    const rawPoints = Array.isArray(dist[emotion]) ? dist[emotion] : [];
    const pointMap = new Map<number, { total: number; count: number }>();

    rawPoints.forEach((point) => {
      const x =
        typeof point?.x === 'number' ? point.x : Number(point?.x ?? NaN);
      const y =
        typeof point?.y === 'number' ? point.y : Number(point?.y ?? NaN);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }

      const prev = pointMap.get(x);

      if (prev) {
        pointMap.set(x, {
          total: prev.total + y,
          count: prev.count + 1,
        });
        return;
      }

      pointMap.set(x, { total: y, count: 1 });
    });

    const data = Array.from(pointMap.entries())
      .sort(([xA], [xB]) => xA - xB)
      .map(([x, value]) => ({
        x,
        y: value.total / value.count,
      }));

    return {
      id: emotion,
      data,
    };
  });
};

export type ScaledGraphDistributionDataType = {
  id: EmotionType;
  data: { x: number; y: number }[];
};

export const getScaledTimelineGraphData = (
  dist: VideoDistributionDataType,
  duration = 100,
): ScaledGraphDistributionDataType[] => {
  const graphData = getDistributionToGraphData(dist).filter(
    (series) => series.data.length > 0,
  );

  if (graphData.length === 0) {
    return [];
  }

  const graphDuration =
    Number.isFinite(duration) && duration > 0 ? duration : 100;

  // [백엔드 계약] timeline_data 의 x 는 진행률 bin 인덱스. 100분율을 의도했지만
  // 백엔드 처리 한계로 bin 개수가 정확히 100 이 아니라 100 근처의 불특정 수다
  // (적을 수도, 많을 수도 있음). 시청 기록이 없는 구간은 bin 이 빠질 수 있다.
  // 분모를 max(100, 실제 최대 x) 로 잡으면:
  //  - bin 이 100 을 넘는 영상: 마지막 bin 이 영상 끝에 정확히 붙는다
  //  - bin 이 100 이하(끝까지 시청되지 않은 경우 포함): 100분율 근사로 배치되어
  //    부분 시청 데이터가 전체 길이로 늘어나는 왜곡을 막는다
  // bin k 는 영상 구간 ((k-1)..k]/G 를 대표하므로 bin "중심" (k-0.5)/G 위치에
  // 그려야 반 bin 우측 밀림이 없다. 실제 시각(초) = (x - 0.5) / 분모 * duration.
  // 남는 오차는 실제 bin 총수(G)가 100 에서 벗어난 만큼이며, 백엔드가 응답에
  // bin 총수(total_bins 등)를 내려주면 분모를 그 값으로 바꿔 제거할 수 있다.
  const maxBinX = graphData.reduce((max, series) => {
    for (const point of series.data) {
      const x = typeof point.x === 'number' ? point.x : Number(point.x);
      if (Number.isFinite(x) && x > max) max = x;
    }
    return max;
  }, 0);
  const scale = graphDuration / Math.max(100, maxBinX);

  return graphData.map((series) => {
    let newData = series.data
      .map((point) => ({
        x: typeof point.x === 'number' ? point.x : Number(point.x),
        y: point.y,
      }))
      .filter((point) => Number.isFinite(point.x))
      .map((point) => ({
        x: Math.min(Math.max((point.x - 0.5) * scale, 0), graphDuration),
        y: point.y,
      }))
      .sort((a, b) => a.x - b.x);

    if (newData.length === 0) {
      newData = [{ x: 0, y: 0 }];
    } else {
      const firstPoint = newData[0];
      const lastPoint = newData[newData.length - 1];
      if (!firstPoint || !lastPoint) {
        newData = [{ x: 0, y: 0 }];
      } else if (firstPoint.x !== 0) {
        newData = [{ x: 0, y: firstPoint.y }, ...newData];
      } else {
        newData[0] = { x: 0, y: firstPoint.y };
      }

      if (lastPoint && lastPoint.x !== graphDuration) {
        newData = [...newData, { x: graphDuration, y: lastPoint.y }];
      }
    }

    return {
      ...series,
      data: newData,
    };
  });
};
