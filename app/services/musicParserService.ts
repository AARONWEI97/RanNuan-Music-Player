import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SongResult } from '../types';
import request, { TOKEN_KEY } from '../api/request';

const URL_CACHE_PREFIX = 'music_url_cache_';
const URL_CACHE_EXPIRY = 30 * 60 * 1000;

// Fallback remote music API — same mechanism as desktop's VITE_API_MUSIC
const FALLBACK_MUSIC_API = 'https://music-api.gdstudio.xyz';

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
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const cookieWithOs = token && !token.startsWith('uid:') ? `${token} os=pc;` : undefined;
      const res = await request.get('/song/url/v1', {
        params: {
          id,
          level: quality,
          ...(cookieWithOs ? { cookie: cookieWithOs } : {}),
        },
      });
      const url = res?.data?.data?.[0]?.url;
      const isTrial = !!res?.data?.data?.[0]?.freeTrialInfo;
      if (url && !isTrial) {
        console.log(`[MusicParser] Official API returned full URL for "${songData.name}"`);
        return url;
      }
      if (isTrial) {
        console.log(`[MusicParser] Official API returned trial URL for "${songData.name}", skipping`);
      } else {
        console.log(`[MusicParser] Official API returned no URL for "${songData.name}"`);
      }
    } catch (e) {
      console.warn(`[MusicParser] Official API error:`, e);
    }
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
      if (!customApiUrl) {
        console.log(`[MusicParser] Custom API not configured, skipping`);
        return null;
      }

      const res = await axios.get(customApiUrl, {
        params: { id, type: 'song' },
        timeout: 10000,
      });

      const data = res.data;
      const url = data?.url || data?.data?.url || (Array.isArray(data?.data) && data.data[0]?.url);
      if (url) {
        console.log(`[MusicParser] Custom API found URL for "${songData.name}"`);
        return url;
      }
    } catch (e) {
      console.warn(`[MusicParser] Custom API error:`, e?.message || e);
    }
    return null;
  }
}

/**
 * GDMusic strategy — exactly aligned with desktop version
 * Desktop uses: https://music-api.gdstudio.xyz/api.php
 * Two-step: search → get URL (same as desktop's searchAndGetUrl)
 * Key differences from previous mobile impl:
 *   - br parameter: '999' (numeric) NOT '320k' (desktop sends numeric)
 *   - source for URL step: use searchResult.source (not original source)
 *   - trackId: only use matched.id (never matched.url which is NOT a track ID)
 *   - search query: "songName artistName" (desktop order)
 *   - count: 1 (desktop default)
 */
class GDMusicStrategy implements MusicSourceStrategy {
  name = 'gdmusic';
  priority = 2;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const songName = songData.name || '';
      let artistNames = '';
      if (songData.ar && Array.isArray(songData.ar)) {
        artistNames = songData.ar.map((a: any) => a.name).join(' ');
      } else if ((songData as any).artists && Array.isArray((songData as any).artists)) {
        artistNames = (songData as any).artists.map((a: any) => a.name).join(' ');
      }

      const searchQuery = `${songName} ${artistNames}`.trim();
      if (!searchQuery) return null;

      // Desktop uses br=999 (numeric) for all qualities
      const br = '999';

      // Try sources in order: joox → netease (tidal not supported by API)
      const sources = ['joox', 'netease'];

      for (const source of sources) {
        try {
          // Step 1: Search — exactly like desktop's searchAndGetUrl
          const searchUrl = `${FALLBACK_MUSIC_API}/api.php?types=search&source=${source}&name=${encodeURIComponent(searchQuery)}&count=1&pages=1`;
          console.log(`[MusicParser] GDMusic (${source}) searching: ${searchQuery}`);

          const searchRes = await axios.get(searchUrl, { timeout: 10000 });

          const searchData = searchRes.data;
          if (!Array.isArray(searchData) || searchData.length === 0) {
            console.log(`[MusicParser] GDMusic (${source}): no search results`);
            continue;
          }

          const firstResult = searchData[0];
          if (!firstResult || !firstResult.id) {
            console.log(`[MusicParser] GDMusic (${source}): search result invalid (no id)`);
            continue;
          }

          const trackId = firstResult.id;
          const trackSource = firstResult.source || source;

          // Step 2: Get URL — using trackSource from search result (desktop behavior)
          // Encode trackId for safe URL (joox IDs contain base64 '==' chars)
          const songUrl = `${FALLBACK_MUSIC_API}/api.php?types=url&source=${trackSource}&id=${encodeURIComponent(String(trackId))}&br=${br}`;
          console.log(`[MusicParser] GDMusic getting URL from ${trackSource}, id=${trackId}`);

          const urlRes = await axios.get(songUrl, { timeout: 10000 });

          if (urlRes.data && urlRes.data.url) {
            console.log(`[MusicParser] GDMusic (${trackSource}) found URL for "${songData.name}"`);
            return urlRes.data.url;
          } else {
            console.log(`[MusicParser] GDMusic (${trackSource}): no URL in response`);
          }
        } catch (e) {
          console.warn(`[MusicParser] GDMusic (${source}) failed:`, e?.message || e);
        }
      }

      console.log(`[MusicParser] GDMusic: no URL found for "${songData.name}" from any source`);
    } catch (e) {
      console.warn(`[MusicParser] GDMusic error:`, e?.message || e);
    }
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

      // Quick connectivity check — LxMusic public API is often down
      try {
        await axios.get(baseUrl, { timeout: 3000 });
      } catch {
        if (!lxApiUrl) {
          console.log(`[MusicParser] LxMusic: public API unreachable, skipping (configure custom URL in settings)`);
          return null;
        }
      }

      const searchRes = await axios.get(`${baseUrl}/search`, {
        params: { keywords: `${songName} ${artistName}`, limit: 5, page: 1 },
        timeout: 8000,
      });

      const songs = searchRes.data?.data?.songs || searchRes.data?.result?.songs;
      if (!Array.isArray(songs) || songs.length === 0) {
        console.log(`[MusicParser] LxMusic: no search results for "${songData.name}"`);
        return null;
      }

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
        timeout: 8000,
      });

      const url = urlRes.data?.data?.url || urlRes.data?.url;
      if (url) {
        console.log(`[MusicParser] LxMusic found URL for "${songData.name}"`);
        return url;
      }
    } catch (e) {
      console.warn(`[MusicParser] LxMusic error:`, e?.message || e);
    }
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
      if (url) {
        console.log(`[MusicParser] Unblock service found URL for "${songData.name}"`);
        return url;
      }
    } catch (e) {
      console.warn(`[MusicParser] Unblock service error:`, e?.message || e);
    }
    return null;
  }
}

/**
 * Fallback remote API — searches by song name on gdstudio as last resort
 * Note: Cannot use netease song ID directly — gdstudio's URL endpoint
 * expects IDs from its OWN search results, not netease song IDs.
 * So we do a full search → get URL flow just like GDMusicStrategy,
 * but only as a final fallback with source=netease.
 */
class FallbackApiStrategy implements MusicSourceStrategy {
  name = 'fallback';
  priority = 5;
  enabled = true;

  async parse(id: string | number, songData: SongResult, quality: string): Promise<string | null> {
    try {
      const songName = songData.name || '';
      let artistNames = '';
      if (songData.ar && Array.isArray(songData.ar)) {
        artistNames = songData.ar.map((a: any) => a.name).join(' ');
      }

      const searchQuery = `${songName} ${artistNames}`.trim();
      if (!searchQuery) return null;

      // Step 1: Search on netease source as fallback
      const searchUrl = `${FALLBACK_MUSIC_API}/api.php?types=search&source=netease&name=${encodeURIComponent(searchQuery)}&count=1&pages=1`;
      console.log(`[MusicParser] Fallback API searching: ${searchQuery}`);

      const searchRes = await axios.get(searchUrl, { timeout: 10000 });
      const searchData = searchRes.data;

      if (!Array.isArray(searchData) || searchData.length === 0 || !searchData[0]?.id) {
        console.log(`[MusicParser] Fallback API: no search results`);
        return null;
      }

      const trackId = searchData[0].id;
      const trackSource = searchData[0].source || 'netease';

      // Step 2: Get URL
      const urlEndpoint = `${FALLBACK_MUSIC_API}/api.php?types=url&source=${trackSource}&id=${encodeURIComponent(String(trackId))}&br=999`;
      const urlRes = await axios.get(urlEndpoint, { timeout: 10000 });

      if (urlRes.data && urlRes.data.url) {
        console.log(`[MusicParser] Fallback API found URL for "${songData.name}"`);
        return urlRes.data.url;
      }
    } catch (e) {
      console.warn(`[MusicParser] Fallback API error:`, e?.message || e);
    }
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
      new FallbackApiStrategy(),
    ].sort((a, b) => a.priority - b.priority);
  }

  async parseMusic(
    id: string | number,
    songData: SongResult,
    quality: string = 'exhigh',
    skipOfficial: boolean = false
  ): Promise<string | null> {
    const cachedUrl = await this.getCachedUrl(id);
    if (cachedUrl) {
      console.log(`[MusicParser] Using cached URL for "${songData.name}"`);
      return cachedUrl;
    }

    console.log(`[MusicParser] Parsing URL for "${songData.name}" (id: ${id}, quality: ${quality}, skipOfficial: ${skipOfficial})`);

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
        console.warn(`[MusicParser] Strategy "${strategy.name}" threw:`, e);
      }
    }

    console.warn(`[MusicParser] All strategies failed for "${songData.name}" (id: ${id})`);
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
