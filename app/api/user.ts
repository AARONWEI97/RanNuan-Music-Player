import type { IUserDetail, IUserFollow } from '../types';
import request from './request';

export function getUserDetail(uid: number) {
  return request.get('/user/detail', { params: { uid } });
}

export function getUserPlaylist(uid: number, limit: number = 30, offset: number = 0) {
  return request.get('/user/playlist', { params: { uid, limit, offset } });
}

export function getUserRecord(uid: number, type: number = 0) {
  return request.get('/user/record', {
    params: { uid, type },
    noRetry: true
  } as any);
}

export function getRecentSongs(limit: number = 100) {
  return request.get('/record/recent/song', {
    params: { limit },
    noRetry: true
  } as any);
}

export function getRecentPlaylists(limit: number = 100) {
  return request.get('/record/recent/playlist', {
    params: { limit },
    noRetry: true
  } as any);
}

export function getRecentAlbums(limit: number = 100) {
  return request.get('/record/recent/album', {
    params: { limit },
    noRetry: true
  } as any);
}

export function getUserFollows(uid: number, limit: number = 30, offset: number = 0) {
  return request.get('/user/follows', { params: { uid, limit, offset } });
}

export function getUserFollowers(uid: number, limit: number = 30, offset: number = 0) {
  return request.post('/user/followeds', { uid, limit, offset });
}

export const getUserAccount = () => {
  return request<any>({
    url: '/user/account',
    method: 'get'
  });
};

export const getUserDetailInfo = (params: { uid: string | number }) => {
  return request<IUserDetail>({
    url: '/user/detail',
    method: 'get',
    params
  });
};

export const getUserFollowsInfo = (params: {
  uid: string | number;
  limit?: number;
  offset?: number;
}) => {
  return request<{
    follow: IUserFollow[];
    more: boolean;
  }>({
    url: '/user/follows',
    method: 'get',
    params
  });
};

export const getUserPlaylists = (params: { uid: string | number }) => {
  return request({
    url: '/user/playlist',
    method: 'get',
    params
  });
};

export const getUserAlbumSublist = (params?: { limit?: number; offset?: number }) => {
  return request({
    url: '/album/sublist',
    method: 'get',
    params: {
      limit: params?.limit || 25,
      offset: params?.offset || 0
    }
  });
};

export const getDjSublist = (params?: { limit?: number; offset?: number }) => {
  return request({
    url: '/dj/sublist',
    method: 'get',
    params: {
      limit: params?.limit || 30,
      timestamp: Date.now()
    }
  });
};

export const getDjProgram = (params: { rid: number; limit?: number; offset?: number; asc?: boolean }) => {
  return request({
    url: '/dj/program',
    method: 'get',
    params: {
      rid: params.rid,
      limit: params.limit || 30,
      offset: params.offset || 0,
      asc: params.asc ? 'true' : 'false',
      timestamp: Date.now()
    }
  });
};

export const getDjDetail = (rid: number) => {
  return request({
    url: '/dj/detail',
    method: 'get',
    params: { rid, timestamp: Date.now() }
  });
};

export const getRecentDj = (limit: number = 100) => {
  return request({
    url: '/record/recent/dj',
    method: 'get',
    params: { limit }
  });
};
