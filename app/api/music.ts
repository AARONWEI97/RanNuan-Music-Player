import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SongResult, ApiLyric } from '../types';
import request, { TOKEN_KEY } from './request';
import { useSettingsStore } from '../store/settingsStore';

export const fmTrash = (id: number) => {
  return request.post('/fm_trash', null, {
    params: { id, timestamp: Date.now() }
  });
};

export const getMusicQualityDetail = (id: number) => {
  return request.get('/song/music/detail', { params: { id } });
};

export const getMusicUrl = async (id: number, isDownloaded: boolean = false) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  // Read user's music quality setting
  const musicQuality = useSettingsStore.getState().musicQuality || 'higher';
  const encodeType = musicQuality === 'lossless' ? 'aac' : 'flac';
  const cookieWithOs = token && !token.startsWith('uid:') ? `${token} os=pc;` : undefined;

  if (isDownloaded && token && !token.startsWith('uid:')) {
    try {
      const url = '/song/download/url/v1';
      const res = await request.get(url, {
        params: {
          id,
          level: musicQuality,
          encodeType,
          cookie: `${token} os=pc;`
        }
      });

      if (res.data.data.url) {
        return { data: { data: [{ ...res.data.data }] } };
      }
    } catch (error) {
      console.error('error', error);
    }
  }

  return await request.get('/song/url/v1', {
    params: {
      id,
      level: musicQuality,
      encodeType,
      unblock: true,
      randomCNIP: true,
      ...(cookieWithOs ? { cookie: cookieWithOs } : {}),
    }
  });
};

export const getMusicDetail = (ids: Array<number>) => {
  return request.get('/song/detail', { params: { ids: ids.join(',') } });
};

export const getMusicLrc = async (id: number) => {
  const res = await request.get<ApiLyric>('/lyric/new', { params: { id } });
  return res;
};

export const getParsingMusicUrl = async (
  id: number,
  data: SongResult
): Promise<any> => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const musicQuality = useSettingsStore.getState().musicQuality || 'higher';
  const cookieWithOs = token && !token.startsWith('uid:') ? `${token} os=pc;` : undefined;
  return await request.get('/song/url/v1', {
    params: {
      id,
      level: musicQuality,
      encodeType: musicQuality === 'lossless' ? 'aac' : 'flac',
      unblock: true,
      randomCNIP: true,
      ...(cookieWithOs ? { cookie: cookieWithOs } : {}),
    }
  });
};

export const likeSong = (id: number, like: boolean = true) => {
  return request.get('/like', { params: { id, like } });
};

export const setFmMode = (mode: string, subMode?: string) => {
  return request.get('/personal/fm/mode', {
    params: { mode, ...(subMode ? { submode: subMode } : {}) }
  });
};

export const getRecommendResource = () => {
  return request.get('/recommend/resource');
};

export const dislikeRecommendedSong = (id: number | string) => {
  return request.get('/recommend/songs/dislike', {
    params: { id }
  });
};

export const getLikedList = (uid: number) => {
  return request.get('/likelist', {
    params: { uid, noLogin: true }
  });
};

export const createPlaylist = (params: { name: string; privacy: number }) => {
  return request.post('/playlist/create', params);
};

export const updatePlaylistTracks = (params: {
  op: 'add' | 'del';
  pid: number;
  tracks: string;
}) => {
  return request.post('/playlist/tracks', params);
};

export function getMusicListByType(type: string, id: string) {
  if (type === 'album') {
    return getAlbumDetail(id);
  } else if (type === 'playlist') {
    return getPlaylistDetail(id);
  }
  return Promise.reject(new Error('Unknown list type'));
}

export function getAlbumDetail(id: string) {
  return request({
    url: '/album',
    method: 'get',
    params: {
      id
    }
  });
}

export function getPlaylistDetail(id: string) {
  return request({
    url: '/playlist/detail',
    method: 'get',
    params: {
      id
    }
  });
}

export function subscribePlaylist(params: { t: number; id: number }) {
  return request({
    url: '/playlist/subscribe',
    method: 'post',
    params
  });
}

export function subscribeAlbum(params: { t: number; id: number }) {
  return request({
    url: '/album/sub',
    method: 'post',
    params
  });
}

export function getHistoryRecommendDates() {
  return request({
    url: '/history/recommend/songs',
    method: 'get'
  });
}

export function getHistoryRecommendSongs(date: string) {
  return request({
    url: '/history/recommend/songs/detail',
    method: 'get',
    params: { date }
  });
}

export function getPlaylistTrackAll(params: { id: number; limit?: number; offset?: number }) {
  return request({
    url: '/playlist/track/all',
    method: 'get',
    params: { id: params.id, limit: params.limit || 9999, offset: params.offset || 0 }
  });
}

export function getIntelligenceList(params: { id: number; pid: number; sid?: number }) {
  return request({
    url: '/playmode/intelligence/list',
    method: 'get',
    params
  });
}

// ========== Phase 11.14 歌曲增强 API ==========

/** 歌曲音乐百科简要信息 */
export const getSongWiki = (id: number) => {
  return request.get('/song/wiki/summary', { params: { id } });
};

/** 歌曲创作者信息 */
export const getSongCreators = (id: number) => {
  return request.get('/song/creators', { params: { id } });
};

/** 歌曲动态封面 */
export const getSongDynamicCover = (id: number) => {
  return request.get('/song/dynamic/cover', { params: { id } });
};

/** 副歌起始时间 */
export const getSongChorus = (id: number) => {
  return request.get('/song/chorus', { params: { id } });
};

/** 灰色歌曲可播放版本推荐 */
export const getSongCopyrightRcmd = (songid: number) => {
  return request.get('/song/copyright/rcmd', { params: { songid } });
};

/** 歌曲红心数量 */
export const getSongRedCount = (id: number) => {
  return request.get('/song/red/count', { params: { id } });
};

/** 批量判断歌曲是否喜爱 */
export const checkSongLike = (ids: number[]) => {
  return request.get('/song/like/check', { params: { ids: ids.join(',') } });
};

/** 客户端下载新版（独立导出，非VIP获取高音质下载） */
export const getSongDownloadUrl = (id: number, level?: string, encodeType?: string) => {
  return request.get('/song/download/url/v1', {
    params: { id, level, encodeType }
  });
};

/** 灰歌解灰 — 直接获取灰色歌曲链接 */
export const matchSongUrl = (id: number, source?: string) => {
  return request.get('/song/url/match', {
    params: { id, source }
  });
};

/** 歌曲乐谱列表 */
export const getSheetList = (id: number) => {
  return request.get('/sheet/list', { params: { id } });
};

/** 乐谱详情预览 */
export const getSheetPreview = (id: number) => {
  return request.get('/sheet/preview', { params: { id } });
};
