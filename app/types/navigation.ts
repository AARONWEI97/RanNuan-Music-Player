import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  Search: undefined;
  Player: undefined;
  Playlist: { id: number; name?: string };
  PlaylistDetail: { id: number };
  ArtistDetail: { id: number };
  ArtistList: undefined;
  AlbumDetail: { id: number };
  Toplist: undefined;
  MvList: undefined;
  Mv: { id: number };
  MvPlayer: { id: number; url?: string };
  Lyric: undefined;
  Settings: undefined;
  User: undefined;
  Login: undefined;
  Download: undefined;
  PlaylistImport: undefined;
  LikedSongs: undefined;
  History: undefined;
  Comment: { id: number; type: 'music' | 'playlist' | 'album' | 'mv' };
  LocalMusic: undefined;
  Heatmap: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
