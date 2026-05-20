export { default as request, setApiBaseUrl, getApiBaseUrl, TOKEN_KEY } from './request';

export {
  getHotSinger,
  getSearchKeyword,
  getHotSearch,
  getPlaylistCategory,
  getRecommendMusic,
  getDayRecommend,
  getNewAlbum,
  getBanners,
  getPersonalizedPlaylist,
  getPersonalFM,
  getPrivateContent,
  getPersonalizedMV,
  getTopAlbum,
  getPersonalizedDJ,
} from './home';

export {
  fmTrash,
  getMusicQualityDetail,
  getMusicUrl,
  getMusicDetail,
  getMusicLrc,
  getParsingMusicUrl,
  likeSong,
  dislikeRecommendedSong,
  getLikedList,
  createPlaylist,
  updatePlaylistTracks,
  getMusicListByType,
  getAlbumDetail,
  getPlaylistDetail,
  subscribePlaylist,
  subscribeAlbum,
  getHistoryRecommendDates,
  getHistoryRecommendSongs,
  getIntelligenceList,
} from './music';

export {
  getQrKey,
  createQr,
  checkQr,
  getLoginStatus,
  getUserDetail as getLoginUserDetail,
  logout,
  loginByCellphone,
  loginByUid,
} from './login';

export {
  getSearch,
  getSearchSuggestions,
} from './search';

export {
  getUserDetail,
  getUserPlaylist,
  getUserRecord,
  getRecentSongs,
  getRecentPlaylists,
  getRecentAlbums,
  getUserFollows,
  getUserFollowers,
  getUserAccount,
  getUserDetailInfo,
  getUserFollowsInfo,
  getUserPlaylists,
  getUserAlbumSublist,
} from './user';

export {
  importPlaylist,
  getImportTaskStatus,
} from './playlist';

export {
  getArtistDetail,
  getArtistTopSongs,
  getArtistAlbums,
  getArtistNewSongs,
} from './artist';

export {
  getNewAlbums,
} from './album';

export {
  getMusicComment,
  getPlaylistComment,
  getAlbumComment,
  getMvComment,
  getHotComment,
  getFloorComment,
  sendComment,
  likeComment,
  getHotwallComment,
  getUserCommentHistory,
  getEventComment,
} from './comment';

export {
  getTopMv,
  getAllMv,
  getMvDetail,
  getMvUrl,
} from './mv';

export {
  getListByTag,
  getListByCat,
  getRecommendList,
  getListDetail,
  getAlbum as getAlbumList,
  getToplist,
} from './list';
