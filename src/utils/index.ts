export * from './emotion';

export const getTimeToString = (time: string): string => {
  const currentDate = new Date();
  const date = new Date(time.endsWith('Z') ? time : `${time}Z`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timeDiff = currentDate.getTime() - date.getTime();
  const timeDiffSec = timeDiff / 1000;

  const yearDiff = new Date(timeDiff).getFullYear() - 1970;
  const monthDiff =
    currentDate.getMonth() -
    date.getMonth() +
    12 * (currentDate.getFullYear() - date.getFullYear());
  const dateDiff = Math.floor(timeDiffSec / (60 * 60 * 24));
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
  return minuteDiff + '분 전';
};
