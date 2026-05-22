import request from './request';

/** 播客搜索 */
export const searchVoiceList = (keyword: string, limit?: number, offset?: number) => {
  return request.get('/voicelist/search', { params: { keyword, limit, offset } });
};

/** 获取播客列表 */
export const getVoiceList = (voiceListId: number, limit?: number, offset?: number) => {
  return request.get('/voicelist/list', { params: { voiceListId, limit, offset } });
};

/** 播客声音搜索（多种筛选参数） */
export const searchVoiceInList = (params: {
  voiceListId?: number;
  keyword?: string;
  limit?: number;
  offset?: number;
}) => {
  return request.get('/voicelist/list/search', { params });
};

/** 获取播客声音详情 */
export const getVoiceDetail = (id: number) => {
  return request.get('/voice/detail', { params: { id } });
};

/** 调整播客声音顺序 */
export const updateVoiceOrder = (voicelistId: number, ids: number[]) => {
  return request.post('/voicelist/trans', { voicelistId, ids });
};

/** 获取播客列表详情 */
export const getVoiceListDetail = (id: number) => {
  return request.get('/voicelist/detail', { params: { id } });
};

/** 删除播客声音 */
export const deleteVoice = (ids: number[]) => {
  return request.post('/voice/delete', { ids });
};

/** 上传播客声音（需 multipart/form-data） */
export const uploadVoice = (formData: FormData) => {
  return request.post('/voice/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** 获取播客声音歌词 */
export const getVoiceLyric = (id: number) => {
  return request.get('/voice/lyric', { params: { id } });
};

/** 获取我创建的播客声音 */
export const getMyCreatedVoiceList = () => {
  return request.get('/voicelist/my/created');
};
