import request from './request';

/** 相似歌曲 — 基于歌曲id */
export function getSimiSong(id: number) {
  return request.get('/simi/song', { params: { id } });
}

/** 相似歌单 — 基于歌曲id */
export function getSimiPlaylist(id: number) {
  return request.get('/simi/playlist', { params: { id } });
}

/** 相似MV — 基于mvid */
export function getSimiMv(mvid: number) {
  return request.get('/simi/mv', { params: { mvid } });
}

/** 相似歌手 — 基于歌手id */
export function getSimiArtist(id: number) {
  return request.get('/simi/artist', { params: { id } });
}

/** 最近听了这首歌的用户 — 基于歌曲id */
export function getSimiUser(id: number) {
  return request.get('/simi/user', { params: { id } });
}
