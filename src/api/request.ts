import api from './index';

export const updateRequestVideoList = async (props: {
  youtube_url_list: string[];
}) => {
  const url = '/v2/home/video/recommend';
  const { data } = await api.post<{
    result?: string;
    message?: string;
  }>(url, props);

  return data;
};
