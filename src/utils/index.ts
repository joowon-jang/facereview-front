export * from './emotion';

export const getTimeToString = (time: string): string => {
  const currentDate = new Date();
  const date = new Date(time.endsWith('Z') ? time : `${time}Z`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  // 서버-클라이언트 시계 오차로 미래 시각이 내려오면 0으로 클램프
  const timeDiff = Math.max(0, currentDate.getTime() - date.getTime());
  const timeDiffSec = timeDiff / 1000;

  const yearDiff = new Date(timeDiff).getFullYear() - 1970;
  const dateDiff = Math.floor(timeDiffSec / (60 * 60 * 24));
  // 캘린더 월 차이(getMonth 비교)는 달 경계에서 하루 차이도 "1달 전"이 되므로
  // 경과 일수 기반으로 계산한다.
  const monthDiff = Math.floor(dateDiff / 30);
  const hourDiff = Math.floor(timeDiffSec / (60 * 60));
  const minuteDiff = Math.floor(timeDiffSec / 60);

  if (yearDiff) {
    return yearDiff + '년 전';
  }
  if (monthDiff) {
    return monthDiff + '달 전';
  }
  if (dateDiff) {
    return dateDiff + '일 전';
  }
  if (hourDiff) {
    return hourDiff + '시간 전';
  }
  if (minuteDiff) {
    return minuteDiff + '분 전';
  }
  return '방금 전';
};
