import request from './request';

/** 获取所有曲风列表及 tagId */
export const getStyleList = () => {
  return request.get('/style/list');
};

/** 获取我的曲风偏好（需登录） */
export const getStylePreference = () => {
  return request.get('/style/preference');
};

/** 获取曲风详情描述 */
export const getStyleDetail = (tagId: number) => {
  return request.get('/style/detail', { params: { tagId } });
};

/** 获取曲风下的歌曲 */
export const getStyleSong = (tagId: number) => {
  return request.get('/style/song', { params: { tagId } });
};

/** 获取曲风下的专辑 */
export const getStyleAlbum = (tagId: number) => {
  return request.get('/style/album', { params: { tagId } });
};

/** 获取曲风下的歌单 */
export const getStylePlaylist = (tagId: number) => {
  return request.get('/style/playlist', { params: { tagId } });
};

/** 获取曲风下的歌手 */
export const getStyleArtist = (tagId: number) => {
  return request.get('/style/artist', { params: { tagId } });
};
