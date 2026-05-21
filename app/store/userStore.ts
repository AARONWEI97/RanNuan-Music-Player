import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getUserAccount, getUserPlaylist, getUserSubcount, getUserLevel } from '../api/user';
import { followUser } from '../api/user';
import { logout as apiLogout } from '../api/login';
import { TOKEN_KEY } from '../api/request';

interface UserData {
  userId: number;
  nickname?: string;
  avatarUrl?: string;
  backgroundUrl?: string;
  vipType?: number;
  profile?: any;
  account?: any;
  [key: string]: any;
}

interface UserPlaylist {
  id: number;
  name: string;
  coverImgUrl: string;
  trackCount: number;
  playCount: number;
  creator?: { nickname: string };
  subscribed?: boolean;
}

interface SubcountData {
  programCount: number;
  djRadioCount: number;
  mvCount: number;
  artistCount: number;
  newProgramCount: number;
  createDjRadioCount: number;
  createdPlaylistCount: number;
  subPlaylistCount: number;
  code: number;
}

interface LevelData {
  userId: number;
  info: string;
  progress: number;
  nextPlayCount: number;
  nextLoginCount: number;
  nowPlayCount: number;
  nowLoginCount: number;
  level: number;
}

interface UserState {
  user: UserData | null;
  loginType: 'token' | 'cookie' | 'qr' | 'uid' | 'phone' | 'guest' | null;
  collectedAlbumIds: Set<number>;
  playlists: UserPlaylist[];
  playlistsLoading: boolean;
  subcount: SubcountData | null;
  subcountLoading: boolean;
  levelData: LevelData | null;
  levelLoading: boolean;
  followingMap: Record<number, boolean>;
}

interface UserActions {
  setUser: (userData: UserData) => void;
  setLoginType: (type: UserState['loginType']) => void;
  handleLogout: () => void;
  initializeUser: (userData: UserData | null) => void;
  addCollectedAlbum: (albumId: number) => void;
  removeCollectedAlbum: (albumId: number) => void;
  isAlbumCollected: (albumId: number) => boolean;
  fetchUserPlaylists: () => Promise<void>;
  fetchSubcount: () => Promise<void>;
  fetchLevel: () => Promise<void>;
  toggleFollow: (userId: number, currentFollowed: boolean) => Promise<boolean>;
  checkLoginStatus: () => Promise<boolean>;
}

export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set, get) => ({
      user: null,
      loginType: null,
      collectedAlbumIds: new Set<number>(),
      playlists: [],
      playlistsLoading: false,
      subcount: null,
      subcountLoading: false,
      levelData: null,
      levelLoading: false,
      followingMap: {},

      setUser: (userData) => set({ user: userData }),

      setLoginType: (type) => set({ loginType: type }),

      handleLogout: async () => {
        try {
          await apiLogout();
        } catch {}
        await AsyncStorage.removeItem(TOKEN_KEY);
        set({
          user: null,
          loginType: null,
          collectedAlbumIds: new Set<number>(),
          playlists: [],
          subcount: null,
          levelData: null,
          followingMap: {},
        });
      },

      initializeUser: (userData) => {
        if (userData) {
          set({ user: userData });
        }
      },

      addCollectedAlbum: (albumId) => {
        const { collectedAlbumIds } = get();
        const newSet = new Set(collectedAlbumIds);
        newSet.add(albumId);
        set({ collectedAlbumIds: newSet });
      },

      removeCollectedAlbum: (albumId) => {
        const { collectedAlbumIds } = get();
        const newSet = new Set(collectedAlbumIds);
        newSet.delete(albumId);
        set({ collectedAlbumIds: newSet });
      },

      isAlbumCollected: (albumId) => get().collectedAlbumIds.has(albumId),

      fetchUserPlaylists: async () => {
        const { user } = get();
        if (!user?.userId) return;

        set({ playlistsLoading: true });
        try {
          const res = await getUserPlaylist(user.userId);
          const data = res?.data?.playlist;
          if (Array.isArray(data)) {
            set({
              playlists: data.map((p: any) => ({
                id: p.id,
                name: p.name,
                coverImgUrl: p.coverImgUrl || '',
                trackCount: p.trackCount || 0,
                playCount: p.playCount || 0,
                creator: { nickname: p.creator?.nickname || '' },
                subscribed: p.subscribed || false,
              })),
            });
          }
        } catch {
        } finally {
          set({ playlistsLoading: false });
        }
      },

      fetchSubcount: async () => {
        const { user } = get();
        if (!user?.userId) return;

        set({ subcountLoading: true });
        try {
          const res = await getUserSubcount();
          if (res?.data?.code === 200) {
            set({ subcount: res.data });
          }
        } catch {
        } finally {
          set({ subcountLoading: false });
        }
      },

      fetchLevel: async () => {
        const { user } = get();
        if (!user?.userId) return;

        set({ levelLoading: true });
        try {
          const res = await getUserLevel();
          if (res?.data?.data) {
            set({ levelData: res.data.data });
          }
        } catch {
        } finally {
          set({ levelLoading: false });
        }
      },

      toggleFollow: async (userId, currentFollowed) => {
        try {
          const t = currentFollowed ? 0 : 1;
          const res = await followUser(userId, t);
          if (res?.data?.code === 200) {
            const { followingMap } = get();
            set({
              followingMap: {
                ...followingMap,
                [userId]: !currentFollowed,
              },
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      checkLoginStatus: async () => {
        try {
          const token = await AsyncStorage.getItem(TOKEN_KEY);
          if (!token) return false;

          if (token.startsWith('uid:')) {
            return !!get().user;
          }

          const res = await getUserAccount();
          const profile = res?.data?.profile;
          const account = res?.data?.account;

          if (profile) {
            set({
              user: {
                userId: profile.userId || account?.id,
                nickname: profile.nickname,
                avatarUrl: profile.avatarUrl,
                backgroundUrl: profile.backgroundUrl,
                vipType: profile.vipType,
                profile,
                account,
              },
            });
            // 登录成功后自动拉取统计/等级数据
            if (get().loginType !== 'uid') {
              get().fetchSubcount();
              get().fetchLevel();
            }
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user
          ? {
              userId: state.user.userId,
              nickname: state.user.nickname,
              avatarUrl: state.user.avatarUrl,
              backgroundUrl: state.user.backgroundUrl,
              vipType: state.user.vipType,
            }
          : null,
        loginType: state.loginType,
      }),
    }
  )
);
