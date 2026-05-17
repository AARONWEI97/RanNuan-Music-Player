import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getUserAccount, getUserPlaylist } from '../api/user';
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

interface UserState {
  user: UserData | null;
  loginType: 'token' | 'cookie' | 'qr' | 'uid' | 'phone' | null;
  collectedAlbumIds: Set<number>;
  playlists: UserPlaylist[];
  playlistsLoading: boolean;
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

      checkLoginStatus: async () => {
        try {
          const token = await AsyncStorage.getItem(TOKEN_KEY);
          if (!token) return false;

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
