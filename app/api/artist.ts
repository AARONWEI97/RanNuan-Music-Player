import request from './request';

export const getArtistDetail = (id: number | string) => {
  return request.get('/artist/detail', { params: { id } });
};

export const getArtistTopSongs = (params: { id: number | string; limit?: number; offset?: number }) => {
  return request.get('/artist/songs', {
    params: {
      ...params,
      order: 'hot'
    }
  });
};

export const getArtistAlbums = (params: { id: number | string; limit?: number; offset?: number }) => {
  return request.get('/artist/album', { params });
};

export const getArtistNewSongs = (limit: number = 20) => {
  return request.get<any>('/artist/new/song', { params: { limit } });
};
