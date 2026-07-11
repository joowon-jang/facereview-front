export const parseYoutubeId = (videoId: string): string => {
  if (videoId?.includes('v=')) {
    return videoId.split('v=')[1]?.split('&')[0] || videoId;
  } else if (videoId?.includes('youtu.be/')) {
    return videoId.split('youtu.be/')[1]?.split('?')[0] || videoId;
  }
  return videoId;
};
