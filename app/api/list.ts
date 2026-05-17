import type { IList } from '../types';
import request from './request';

interface IListByTagParams {
  tag: string;
  before: number;
  limit: number;
}

interface IListByCatParams {
  cat: string;
  offset: number;
  limit: number;
}

export function getListByTag(params: IListByTagParams) {
  return request.get<IList>('/top/playlist/highquality', { params });
}

export function getListByCat(params: IListByCatParams) {
  return request.get('/top/playlist', {
    params
  });
}

export function getRecommendList(limit: number = 30) {
  return request.get('/personalized', { params: { limit } });
}

export function getListDetail(id: number | string) {
  return request.get<any>('/playlist/detail', { params: { id } });
}

export function getAlbum(id: number | string) {
  return request.get('/album', { params: { id } });
}

export function getToplist() {
  return request.get('/toplist');
}
