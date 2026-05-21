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

export function getIntelligenceList(params: { id: number; pid: number; sid?: number }) {
  return request({
    url: '/playmode/intelligence/list',
    method: 'get',
    params
  });
}
