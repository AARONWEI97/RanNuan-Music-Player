export interface ISearchKeyword {
  code: number;
  message?: any;
  data: SearchKeywordData;
}

interface SearchKeywordData {
  showKeyword: string;
  realkeyword: string;
  searchType: number;
  action: number;
  alg: string;
  gap: number;
  source?: any;
  bizQueryInfo: string;
}

export interface IHotSearch {
  code: number;
  data: HotSearchDatum[];
  message: string;
}

interface HotSearchDatum {
  searchWord: string;
  score: number;
  content: string;
  source: number;
  iconType: number;
  iconUrl?: string;
  url: string;
  alg: string;
}

export interface ISearchDetail {
  result: SearchResult;
  code: number;
}

interface SearchResult {
  song: SearchSongResult;
  code: number;
  mlog: SearchMlogResult;
  playList: SearchPlayListResult;
  artist: SearchArtistResult;
  album: SearchAlbumResult;
  video: SearchVideoResult;
  sim_query: SearchSimQueryResult;
  djRadio: SearchDjRadioResult;
  rec_type?: any;
  talk: SearchTalkResult;
  rec_query: null[];
  user: SearchUserResult;
  order: string[];
}

interface SearchUserResult {
  moreText: string;
  more: boolean;
  users: SearchUser[];
  resourceIds: number[];
}

interface SearchUser {
  defaultAvatar: boolean;
  province: number;
  authStatus: number;
  followed: boolean;
  avatarUrl: string;
  accountStatus: number;
  gender: number;
  city: number;
  birthday: number;
  userId: number;
  userType: number;
  nickname: string;
  signature: string;
  description: string;
  detailDescription: string;
  avatarImgId: number;
  backgroundImgId: number;
  backgroundUrl: string;
  authority: number;
  mutual: boolean;
  expertTags?: any;
  experts?: any;
  djStatus: number;
  vipType: number;
  remarkName?: any;
  authenticationTypes: number;
  avatarDetail?: any;
  anchor: boolean;
  avatarImgIdStr: string;
  backgroundImgIdStr: string;
  avatarImgId_str: string;
  alg: string;
}

interface SearchTalkResult {
  more: boolean;
  talks: SearchTalk[];
  resourceIds: number[];
}

interface SearchTalk {
  talkId: number;
  shareUrl: string;
  talkName: string;
  shareCover: SearchShareCover;
  showCover: SearchShareCover;
  talkDes: string;
  follows: number;
  participations: number;
  showParticipations: number;
  status: number;
  time?: any;
  hasTag: boolean;
  alg: string;
  mlogCount: number;
  commentCount: number;
}

interface SearchShareCover {
  picKey: string;
  nosKey: string;
  width: number;
  height: number;
  url: string;
}

interface SearchDjRadioResult {
  moreText: string;
  djRadios: SearchDjRadio[];
  more: boolean;
  resourceIds: number[];
}

interface SearchDjRadio {
  id: number;
  dj: SearchDj;
  name: string;
  picUrl: string;
  desc: string;
  subCount: number;
  programCount: number;
  createTime: number;
  categoryId: number;
  category: string;
  radioFeeType: number;
  feeScope: number;
  buyed: boolean;
  videos?: any;
  finished: boolean;
  underShelf: boolean;
  purchaseCount: number;
  price: number;
  originalPrice: number;
  discountPrice?: any;
  lastProgramCreateTime: number;
  lastProgramName?: any;
  lastProgramId: number;
  picId: number;
  rcmdText?: string;
  hightQuality: boolean;
  whiteList: boolean;
  liveInfo?: any;
  playCount: number;
  icon?: any;
  composeVideo: boolean;
  shareCount: number;
  likedCount: number;
  alg: string;
  commentCount: number;
}

interface SearchDj {
  defaultAvatar: boolean;
  province: number;
  authStatus: number;
  followed: boolean;
  avatarUrl: string;
  accountStatus: number;
  gender: number;
  city: number;
  birthday: number;
  userId: number;
  userType: number;
  nickname: string;
  signature: string;
  description: string;
  detailDescription: string;
  avatarImgId: number;
  backgroundImgId: number;
  backgroundUrl: string;
  authority: number;
  mutual: boolean;
  expertTags?: any;
  experts?: any;
  djStatus: number;
  vipType: number;
  remarkName?: any;
  authenticationTypes: number;
  avatarDetail?: any;
  anchor: boolean;
  avatarImgIdStr: string;
  backgroundImgIdStr: string;
  avatarImgId_str: string;
}

interface SearchSimQueryResult {
  sim_querys: SearchSimQuery[];
  more: boolean;
}

interface SearchSimQuery {
  keyword: string;
  alg: string;
}

interface SearchVideoResult {
  moreText: string;
  more: boolean;
  videos: SearchVideo[];
  resourceIds: number[];
}

interface SearchVideo {
  coverUrl: string;
  title: string;
  durationms: number;
  playTime: number;
  type: number;
  creator: SearchVideoCreator[];
  aliaName?: any;
  transName?: any;
  vid: string;
  markTypes?: number[];
  alg: string;
}

interface SearchVideoCreator {
  userId: number;
  userName: string;
}

interface SearchAlbumResult {
  moreText: string;
  albums: SearchAlbum[];
  more: boolean;
  resourceIds: number[];
}

interface SearchAlbum {
  name: string;
  id: number;
  type: string;
  size: number;
  picId: number;
  blurPicUrl: string;
  companyId: number;
  pic: number;
  picUrl: string;
  publishTime: number;
  description: string;
  tags: string;
  company?: string;
  briefDesc: string;
  artist: SearchAlbumArtist;
  songs?: any;
  alias: string[];
  status: number;
  copyrightId: number;
  commentThreadId: string;
  artists: SearchAlbumListArtist[];
  paid: boolean;
  onSale: boolean;
  picId_str: string;
  alg: string;
}

interface SearchAlbumListArtist {
  name: string;
  id: number;
  picId: number;
  img1v1Id: number;
  briefDesc: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
  alias: any[];
  trans: string;
  musicSize: number;
  topicPerson: number;
  img1v1Id_str: string;
}

interface SearchAlbumArtist {
  name: string;
  id: number;
  picId: number;
  img1v1Id: number;
  briefDesc: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
  alias: string[];
  trans: string;
  musicSize: number;
  topicPerson: number;
  picId_str: string;
  img1v1Id_str: string;
  alia: string[];
}

interface SearchArtistResult {
  moreText: string;
  artists: SearchArtist[];
  more: boolean;
  resourceIds: number[];
}

interface SearchArtist {
  id: number;
  name: string;
  picUrl: string;
  alias: string[];
  albumSize: number;
  picId: number;
  img1v1Url: string;
  img1v1: number;
  mvSize: number;
  followed: boolean;
  alg: string;
  alia?: string[];
  trans?: any;
  accountId?: number;
}

interface SearchPlayListResult {
  moreText: string;
  more: boolean;
  playLists: SearchPlayList[];
  resourceIds: number[];
}

interface SearchPlayList {
  id: number;
  name: string;
  coverImgUrl: string;
  creator: SearchPlayListCreator;
  subscribed: boolean;
  trackCount: number;
  userId: number;
  playCount: number;
  bookCount: number;
  specialType: number;
  officialTags: string[];
  description: string;
  highQuality: boolean;
  track: SearchTrack;
  alg: string;
}

interface SearchTrack {
  name: string;
  id: number;
  position: number;
  alias: any[];
  status: number;
  fee: number;
  copyrightId: number;
  disc: string;
  no: number;
  artists: SearchTrackArtist[];
  album: SearchTrackAlbum;
  starred: boolean;
  popularity: number;
  score: number;
  starredNum: number;
  duration: number;
  playedNum: number;
  dayPlays: number;
  hearTime: number;
  ringtone?: string;
  crbt?: any;
  audition?: any;
  copyFrom: string;
  commentThreadId: string;
  rtUrl?: any;
  ftype: number;
  rtUrls: any[];
  copyright: number;
  mvid: number;
  rtype: number;
  rurl?: any;
  hMusic: SearchTrackMusic;
  mMusic: SearchTrackMusic;
  lMusic: SearchTrackMusic;
  bMusic: SearchTrackMusic;
  mp3Url?: any;
  transNames?: string[];
}

interface SearchTrackMusic {
  name?: any;
  id: number;
  size: number;
  extension: string;
  sr: number;
  dfsId: number;
  bitrate: number;
  playTime: number;
  volumeDelta: number;
}

interface SearchTrackAlbum {
  name: string;
  id: number;
  type: string;
  size: number;
  picId: number;
  blurPicUrl: string;
  companyId: number;
  pic: number;
  picUrl: string;
  publishTime: number;
  description: string;
  tags: string;
  company?: string;
  briefDesc: string;
  artist: SearchTrackArtist;
  songs: any[];
  alias: any[];
  status: number;
  copyrightId: number;
  commentThreadId: string;
  artists: SearchTrackArtist[];
  picId_str?: string;
}

interface SearchTrackArtist {
  name: string;
  id: number;
  picId: number;
  img1v1Id: number;
  briefDesc: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
  alias: any[];
  trans: string;
  musicSize: number;
}

interface SearchPlayListCreator {
  nickname: string;
  userId: number;
  userType: number;
  avatarUrl: string;
  authStatus: number;
  expertTags?: any;
  experts?: any;
}

interface SearchMlogResult {
  moreText: string;
  more: boolean;
  mlogs: SearchMlog[];
  resourceIds: any[];
}

interface SearchMlog {
  id: string;
  type: number;
  mlogBaseDataType: number;
  position?: any;
  resource: SearchMlogResource;
  alg: string;
  reason?: any;
  matchField: number;
  matchFieldContent: string;
  sameCity: boolean;
}

interface SearchMlogResource {
  mlogBaseData: SearchMlogBaseData;
  mlogExtVO: SearchMlogExtVO;
  userProfile: SearchMlogUserProfile;
  status: number;
  shareUrl: string;
}

interface SearchMlogUserProfile {
  userId: number;
  nickname: string;
  avatarUrl: string;
  followed: boolean;
  userType: number;
  isAnchor: boolean;
}

interface SearchMlogExtVO {
  likedCount: number;
  commentCount: number;
  playCount: number;
  song?: any;
  canCollect?: any;
  artistName?: any;
  rcmdInfo?: any;
  strongPushMark?: any;
  strongPushIcon?: any;
  specialTag?: any;
  channelTag: string;
  artists: any[];
}

interface SearchMlogBaseData {
  id: string;
  type: number;
  text: string;
  interveneText?: string;
  pubTime: number;
  coverUrl: string;
  coverHeight: number;
  coverWidth: number;
  coverColor: number;
  coverPicKey: string;
  coverDynamicUrl?: any;
  audio?: any;
  threadId: string;
  duration: number;
}

interface SearchSongResult {
  moreText: string;
  songs: SearchSong[];
  more: boolean;
  ksongInfos: SearchKsongInfos;
  resourceIds: number[];
}

interface SearchKsongInfos {
  [key: string]: SearchKsongInfo;
}

interface SearchKsongInfo {
  androidDownloadUrl: string;
  accompanyId: string;
  deeplinkUrl: string;
}

interface SearchSong {
  name: string;
  id: number;
  pst: number;
  t: number;
  ar: SearchSongAr[];
  alia: any[];
  pop: number;
  st: number;
  rt: string;
  fee: number;
  v: number;
  crbt?: any;
  cf: string;
  al: SearchSongAl;
  dt: number;
  h: SearchSongQuality;
  m: SearchSongQuality;
  l: SearchSongQuality;
  a?: any;
  cd: string;
  no: number;
  rtUrl?: any;
  ftype: number;
  rtUrls: any[];
  djId: number;
  copyright: number;
  s_id: number;
  mark: number;
  originCoverType: number;
  originSongSimpleData?: any;
  resourceState: boolean;
  version: number;
  single: number;
  noCopyrightRcmd?: any;
  rtype: number;
  rurl?: any;
  mst: number;
  cp: number;
  mv: number;
  publishTime: number;
  showRecommend: boolean;
  recommendText: string;
  tns?: string[];
  officialTags: any[];
  privilege: SearchSongPrivilege;
  alg: string;
  specialTags: any[];
}

interface SearchSongPrivilege {
  id: number;
  fee: number;
  payed: number;
  st: number;
  pl: number;
  dl: number;
  sp: number;
  cp: number;
  subp: number;
  cs: boolean;
  maxbr: number;
  fl: number;
  toast: boolean;
  flag: number;
  preSell: boolean;
  playMaxbr: number;
  downloadMaxbr: number;
  rscl?: any;
  freeTrialPrivilege: SearchSongFreeTrialPrivilege;
  chargeInfoList: SearchSongChargeInfoList[];
}

interface SearchSongChargeInfoList {
  rate: number;
  chargeUrl?: any;
  chargeMessage?: any;
  chargeType: number;
}

interface SearchSongFreeTrialPrivilege {
  resConsumable: boolean;
  userConsumable: boolean;
}

interface SearchSongQuality {
  br: number;
  fid: number;
  size: number;
  vd: number;
}

interface SearchSongAl {
  id: number;
  name: string;
  picUrl: string;
  tns: any[];
  pic_str?: string;
  pic: number;
}

interface SearchSongAr {
  id: number;
  name: string;
  tns: any[];
  alias: string[];
  alia?: string[];
}
