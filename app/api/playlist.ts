import request from './request';

export function importPlaylist(params: {
  local?: string;
  text?: string;
  link?: string;
  importStarPlaylist?: boolean;
  playlistName?: string;
}) {
  return request.post('/playlist/import/name/task/create', params);
}

export function getImportTaskStatus(id: string | number) {
  return request({
    url: '/playlist/import/task/status',
    method: 'get',
    params: { id }
  });
}
