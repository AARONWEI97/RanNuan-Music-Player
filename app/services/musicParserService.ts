import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SongResult, Platform } from '../types';
import request from '../api/request';

const URL_CACHE_PREFIX = 'music_url_cache_';
const URL_CACHE_EXPIRY = 30 * 60 * 1000;

interface MusicSourceStrategy {
  name: string;
  priority: number;
  enabled: boolean;
  parse(id: string | number, songData: SongResult, quality: string): Promise<string | null>;
}

class OfficialApiStrategy implements MusicSourceStrategy {
  name = 'official';
  priority = 0;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const res = await request.get('/song/url/v1', {
        params: { id, level: quality },
      });
      const url = res?.data?.data?.[0]?.url;
      if (url) return url;
    } catch {}
    return null;
  }
}

class CustomApiStrategy implements MusicSourceStrategy {
  name = 'custom';
  priority = 1;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const customApiUrl = await AsyncStorage.getItem('custom_api_url');
      if (!customApiUrl) return null;

      const res = await axios.get(customApiUrl, {
        params: { id, type: 'song' },
        timeout: 10000,
      });

      const data = res.data;
      if (data?.url) return data.url;
      if (data?.data?.url) return data.data.url;
      if (Array.isArray(data?.data) && data.data[0]?.url) return data.data[0].url;
    } catch {}
    return null;
  }
}

class GDMusicStrategy implements MusicSourceStrategy {
  name = 'gdmusic';
  priority = 2;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const songName = songData.name;
      const artistName = songData.ar?.map((a) => a.name).join(' ') || '';
      if (!songName || !artistName) return null;

      const searchRes = await axios.get('https://api.gdmusic.click/api/search', {
        params: { keyword: `${artistName} ${songName}`, page: 1, limit: 5 },
        timeout: 10000,
      });

      const searchList = searchRes.data?.data?.list;
      if (!Array.isArray(searchList) || searchList.length === 0) return null;

      const matched = searchList.find(
        (item: any) =>
          item.songname?.includes(songName) ||
          item.name?.includes(songName) ||
          songName.includes(item.songname || item.name || '')
      ) || searchList[0];

      const songId = matched.id || matched.songid;
      if (!songId) return null;

      const detailRes = await axios.get('https://api.gdmusic.click/api/song', {
        params: { id: songId },
        timeout: 10000,
      });

      const url = detailRes.data?.data?.url || detailRes.data?.url;
      if (url) return url;
    } catch {}
    return null;
  }
}

class LxMusicStrategy implements MusicSourceStrategy {
  name = 'lxMusic';
  priority = 3;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const songName = songData.name;
      const artistName = songData.ar?.map((a) => a.name).join(' ') || '';
      if (!songName || !artistName) return null;

      const lxApiUrl = await AsyncStorage.getItem('lxmusic_api_url');
      const baseUrl = lxApiUrl || 'https://lxmusicapi.pages.dev';

      const searchRes = await axios.get(`${baseUrl}/search`, {
        params: { keywords: `${artistName} ${songName}`, limit: 5, page: 1 },
        timeout: 10000,
      });

      const songs = searchRes.data?.data?.songs || searchRes.data?.result?.songs;
      if (!Array.isArray(songs) || songs.length === 0) return null;

      const matched = songs.find(
        (item: any) =>
          String(item.songid || item.id) === String(id) ||
          item.name?.includes(songName)
      ) || songs[0];

      const matchId = matched.songid || matched.id;
      if (!matchId) return null;

      const qualityMap: Record<string, string> = {
        standard: '128',
        higher: '320',
        exhigh: '320',
        lossless: 'flac',
      };
      const lxQuality = qualityMap[quality] || '320';

      const urlRes = await axios.get(`${baseUrl}/url`, {
        params: { id: matchId, quality: lxQuality },
        timeout: 10000,
      });

      const url = urlRes.data?.data?.url || urlRes.data?.url;
      if (url) return url;
    } catch {}
    return null;
  }
}

class UnblockMusicServiceStrategy implements MusicSourceStrategy {
  name = 'unblock';
  priority = 4;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const unblockUrl = await AsyncStorage.getItem('unblock_service_url');
      if (!unblockUrl) return null;

      const res = await axios.post(`${unblockUrl}/unblock`, {
        id: Number(id),
        quality,
      }, { timeout: 15000 });

      const url = res.data?.data?.url || res.data?.url;
      if (url) return url;
    } catch {}
    return null;
  }
}

export class MusicParser {
  strategies: MusicSourceStrategy[] = [];

  constructor() {
    this.strategies = [
      new OfficialApiStrategy(),
      new CustomApiStrategy(),
      new GDMusicStrategy(),
      new LxMusicStrategy(),
      new UnblockMusicServiceStrategy(),
    ].sort((a, b) => a.priority - b.priority);
  }

  async parseMusic(
    id: string | number,
    songData: SongResult,
    quality: string = 'exhigh',
    skipOfficial: boolean = false
  ): Promise<string | null> {
    const cachedUrl = await this.getCachedUrl(id);
    if (cachedUrl) return cachedUrl;

    for (const strategy of this.strategies) {
      if (!strategy.enabled) continue;
      if (skipOfficial && strategy.name === 'official') continue;

      try {
        const url = await strategy.parse(id, songData, quality);
        if (url) {
          await this.cacheUrl(id, url);
          return url;
        }
      } catch (e) {
        console.warn(`[MusicParser] Strategy "${strategy.name}" failed:`, e);
      }
    }

    return null;
  }

  async getCachedUrl(id: string | number): Promise<string | null> {
    try {
      const cached = await AsyncStorage.getItem(`${URL_CACHE_PREFIX}${id}`);
      if (!cached) return null;
      const { url, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > URL_CACHE_EXPIRY) {
        await AsyncStorage.removeItem(`${URL_CACHE_PREFIX}${id}`);
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }

  async cacheUrl(id: string | number, url: string): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${URL_CACHE_PREFIX}${id}`,
        JSON.stringify({ url, timestamp: Date.now() })
      );
    } catch {}
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(URL_CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch {}
  }

  setStrategyEnabled(name: string, enabled: boolean): void {
    const strategy = this.strategies.find((s) => s.name === name);
    if (strategy) {
      strategy.enabled = enabled;
    }
  }

  getStrategies(): { name: string; priority: number; enabled: boolean }[] {
    return this.strategies.map((s) => ({
      name: s.name,
      priority: s.priority,
      enabled: s.enabled,
    }));
  }
}

export const musicParser = new MusicParser();

export async function parseMusicUrl(
  id: string | number,
  songData: SongResult,
  quality: string = 'exhigh',
  skipOfficial: boolean = false
): Promise<string | null> {
  return musicParser.parseMusic(id, songData, quality, skipOfficial);
}
