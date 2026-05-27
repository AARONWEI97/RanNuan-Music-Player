import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiBaseUrl } from '../api/request';

const DEFAULT_API_URL = 'http://139.9.223.233:3000';

type ThemeType = 'light' | 'dark' | 'system' | 'dog-light' | 'dog-dark';

interface SettingsState {
  theme: ThemeType;
  language: string;
  apiBaseUrl: string;
  musicQuality: string;
  showLyricTranslation: boolean;
  autoPlay: boolean;
  volume: number;
  playbackRate: number;
  customApiUrl: string;
  unblockServiceUrl: string;
  lxMusicApiUrl: string;
  enableMusicParsing: boolean;
  showDonation: boolean;
}

interface SettingsActions {
  setTheme: (theme: ThemeType) => void;
  setLanguage: (language: string) => void;
  setApiBaseUrl: (url: string) => void;
  setMusicQuality: (quality: string) => void;
  setShowLyricTranslation: (show: boolean) => void;
  setAutoPlay: (autoPlay: boolean) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setCustomApiUrl: (url: string) => void;
  setUnblockServiceUrl: (url: string) => void;
  setLxMusicApiUrl: (url: string) => void;
  setEnableMusicParsing: (enable: boolean) => void;
  setShowDonation: (show: boolean) => void;
  initializeSettings: () => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      theme: 'dog-light',
      language: 'zh-CN',
      apiBaseUrl: DEFAULT_API_URL,
      musicQuality: 'higher',
      showLyricTranslation: false,
      autoPlay: false,
      volume: 1,
      playbackRate: 1,
      customApiUrl: '',
      unblockServiceUrl: '',
      lxMusicApiUrl: '',
      enableMusicParsing: true,
      showDonation: false,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
      setMusicQuality: (quality) => set({ musicQuality: quality }),
      setShowLyricTranslation: (show) => set({ showLyricTranslation: show }),
      setAutoPlay: (autoPlay) => set({ autoPlay }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      setCustomApiUrl: (url) => set({ customApiUrl: url }),
      setUnblockServiceUrl: (url) => set({ unblockServiceUrl: url }),
      setLxMusicApiUrl: (url) => set({ lxMusicApiUrl: url }),
      setEnableMusicParsing: (enable) => set({ enableMusicParsing: enable }),
      setShowDonation: (show) => set({ showDonation: show }),
      initializeSettings: () => {
        const { apiBaseUrl } = get();
        if (apiBaseUrl) {
          setApiBaseUrl(apiBaseUrl);
        }
      },
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
