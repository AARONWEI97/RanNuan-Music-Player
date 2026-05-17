import type { IMvUrlData } from '../types';
import request from './request';

interface MvParams {
  limit?: number;
  offset?: number;
  area?: string;
}

export const getTopMv = (params: MvParams) => {
  return request({
    url: '/mv/all',
    method: 'get',
    params
  });
};

export const getAllMv = (params: MvParams) => {
  return request({
    url: '/mv/all',
    method: 'get',
    params
  });
};

export const getMvDetail = (mvid: string) => {
  return request.get('/mv/detail', {
    params: {
      mvid
    }
  });
};

export const getMvUrl = (id: number) => {
  return request.get<{ data: IMvUrlData }>('/mv/url', {
    params: {
      id
    }
  });
};
