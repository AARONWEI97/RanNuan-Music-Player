import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  SearchDetail: { keyword: string };
  Player: undefined;
  Playlist: { id: number; name?: string };
  PlaylistDetail: { id: number };
  ArtistDetail: { id: number };
  AlbumDetail: { id: number };
  Mv: { id: number };
  MvPlayer: { id: number; url?: string };
  Lyric: undefined;
  Settings: undefined;
  User: undefined;
  Login: undefined;
  Download: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
