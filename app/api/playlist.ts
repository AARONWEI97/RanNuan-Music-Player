import request from './request';

export function importPlaylist(params: {
  local?: string;
  text?: string;
  link?: string;
  importStarPlaylist?: boolean;
  playlistName?: string;
}) {
  // API docs: /playlist/import/name/task/create?text=${text}&link=${link}
  // Use POST with params in query string (same as original working version)
  console.log('[PlaylistAPI] importPlaylist request:', JSON.stringify({ ...params, text: params.text?.substring(0, 50), link: params.link?.substring(0, 80) }));
  return request({
    url: '/playlist/import/name/task/create',
    method: 'post',
    params,
  });
}

export function getImportTaskStatus(id: string | number) {
  return request({
    url: '/playlist/import/task/status',
    method: 'get',
    params: { id }
  });
}

export function deletePlaylist(id: number | string) {
  return request({
    url: '/playlist/delete',
    method: 'get',
    params: { id }
  });
}

export function updatePlaylistName(params: { id: number; name: string }) {
  return request.get('/playlist/name/update', { params });
}

export function updatePlaylistDesc(params: { id: number; desc: string }) {
  return request.get('/playlist/desc/update', { params });
}

export function updatePlaylistTags(params: { id: number; tags: string }) {
  return request.get('/playlist/tags/update', { params });
}

export function updatePlaylistCover(params: { id: number; imgFile: any }) {
  return request.post('/playlist/cover/update', params, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function updatePlaylist(params: { id: number; name: string; desc?: string; tags?: string }) {
  return request.get('/playlist/update', { params });
}
