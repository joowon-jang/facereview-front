import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTimeToString } from 'utils/index';
import {
  getScaledTimelineGraphData,
  mapNumberToEmotion,
  mapEmotionToNumber,
} from 'utils/emotion';

describe('getTimeToString', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1분 미만은 "방금 전"으로 표시한다', () => {
    expect(getTimeToString('2026-07-11T11:59:30Z')).toBe('방금 전');
  });

  it('분·시간·일 단위를 표시한다', () => {
    expect(getTimeToString('2026-07-11T11:30:00Z')).toBe('30분 전');
    expect(getTimeToString('2026-07-11T09:00:00Z')).toBe('3시간 전');
    expect(getTimeToString('2026-07-09T12:00:00Z')).toBe('2일 전');
  });

  it('달 경계를 하루 넘겼다고 "1달 전"이 되지 않는다', () => {
    // 6/30 → 7/11 은 11일 전
    expect(getTimeToString('2026-06-30T12:00:00Z')).toBe('11일 전');
    expect(getTimeToString('2026-05-11T12:00:00Z')).toBe('2달 전');
    expect(getTimeToString('2024-07-11T12:00:00Z')).toBe('2년 전');
  });

  it('미래 시각(시계 오차)은 "방금 전"으로 클램프한다', () => {
    expect(getTimeToString('2026-07-11T12:05:00Z')).toBe('방금 전');
  });

  it('Z 없는 UTC 문자열도 처리하고, 잘못된 값은 빈 문자열을 반환한다', () => {
    expect(getTimeToString('2026-07-11T11:30:00')).toBe('30분 전');
    expect(getTimeToString('not-a-date')).toBe('');
  });
});

describe('emotion mapping', () => {
  it('숫자 ↔ 감정 매핑이 서로 왕복된다', () => {
    (['neutral', 'happy', 'surprise', 'sad', 'angry'] as const).forEach(
      (emotion) => {
        expect(mapNumberToEmotion(mapEmotionToNumber(emotion))).toBe(emotion);
      },
    );
  });

  it('범위 밖 숫자는 neutral 로 폴백한다', () => {
    expect(mapNumberToEmotion(99)).toBe('neutral');
    expect(mapNumberToEmotion(-1)).toBe('neutral');
  });
});

const makeDist = (
  overrides: Partial<
    Record<'happy' | 'surprise' | 'sad' | 'angry' | 'neutral', { x: number; y: number }[]>
  > = {},
) => ({
  happy: [],
  surprise: [],
  sad: [],
  angry: [],
  neutral: [],
  ...overrides,
});

describe('getScaledTimelineGraphData', () => {
  it('진행률 bin(1~100)을 bin 중심 기준 초 단위 x 로 변환한다', () => {
    const result = getScaledTimelineGraphData(
      makeDist({ happy: [{ x: 50, y: 10 }] }),
      200,
    );
    const happy = result.find((s) => s.id === 'happy');
    // bin 50 의 중심 = (50 - 0.5) / 100 * 200 = 99
    expect(happy?.data).toEqual([
      { x: 0, y: 10 },
      { x: 99, y: 10 },
      { x: 200, y: 10 },
    ]);
  });

  it('데이터 없는 감정 시리즈는 제외한다', () => {
    const result = getScaledTimelineGraphData(
      makeDist({ happy: [{ x: 1, y: 5 }] }),
      100,
    );
    expect(result.map((s) => s.id)).toEqual(['happy']);
  });

  it('빈 입력이면 빈 배열을 반환한다', () => {
    expect(getScaledTimelineGraphData(makeDist(), 100)).toEqual([]);
  });
});
