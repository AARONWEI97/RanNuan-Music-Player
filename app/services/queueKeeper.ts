import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { RepeatMode, State, type Track } from 'react-native-track-player';

import request, { setApiBaseUrl } from '../api/request';
import { PLAY_MODE_LOOP, PLAY_MODE_SEQUENTIAL, PLAY_MODE_SHUFFLE } from '../constants/config';
import { musicParser, parseMusicUrl } from './musicParserService';
import { bumpPlayGen, readPlayGen } from './playGen';
import type { SongResult } from '../types';

/**
 * 锁屏后主界面 JS 会被系统冻住，只有「已经在原生队列里的下一首」能自动开播。
 * 主界面负责立刻把后面几首放进队列；headless PlaybackService 在锁屏后继续补队列。
 * 两个 JS 上下文内存不共享，歌单通过 AsyncStorage 快照传递。
 */

const AHEAD = 3;
const EXTRA_CANDIDATES = 5;
const MAX_FAILS = 5;
const LOCK_KEY = 'rn-queue-keeper-lock';
const PLAN_KEY = 'playback-upcoming-v1';
const SNAPSHOT_KEY = 'playback-snapshot-v1';
const REMOTE_PREV_KEY = 'remote-prev-once';
const DEFAULT_API = 'http://139.9.223.233:3000';

type Snapshot = {
  playList: SongResult[];
  playListIndex: number;
  playMode: number;
  musicQuality: string;
  enableMusicParsing: boolean;
  apiBaseUrl: string;
  localUris: Record<string, string>;
};

type UpcomingPlan = {
  mode: number;
  anchorId: string;
  ids: string[];
};

type ResolvedTrack = { song: SongResult; url: string };

const g = global as any;

let inflight: Promise<void> | null = null;
let rerun = false;
let lastPublishedSig = '';

function isHeadless(): boolean {
  return g.__PB_HEADLESS === true;
}

function toTrack(song: SongResult, url: string) {
  return {
    id: String(song.id),
    url,
    title: song.name || '未知歌曲',
    artist: song.ar?.map((a) => a.name).join(' / ') || '未知歌手',
    album: song.al?.name || '未知专辑',
    artwork: song.picUrl || song.al?.picUrl || undefined,
    duration: ((song.duration || song.dt || 0) as number) / 1000,
  };
}

async function readJson(key: string): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function asSnapshot(raw: any): Snapshot | null {
  if (!raw || !Array.isArray(raw.playList)) return null;
  return {
    playList: raw.playList,
    playListIndex: Number(raw.playListIndex) || 0,
    playMode: Number(raw.playMode) || 0,
    musicQuality: raw.musicQuality || 'higher',
    enableMusicParsing: raw.enableMusicParsing !== false,
    apiBaseUrl: raw.apiBaseUrl || DEFAULT_API,
    localUris: raw.localUris && typeof raw.localUris === 'object' ? raw.localUris : {},
  };
}

async function publishSnapshot(snap: Snapshot): Promise<void> {
  const sig = [
    snap.playMode,
    snap.playListIndex,
    snap.musicQuality,
    snap.enableMusicParsing,
    snap.apiBaseUrl,
    snap.playList.map((s) => s.id).join(','),
  ].join('|');
  if (sig === lastPublishedSig) return;
  lastPublishedSig = sig;
  try {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch (e) {
    console.warn('[Queue] 写入播放快照失败:', e);
  }
}

async function readSnapshot(): Promise<Snapshot | null> {
  if (!isHeadless()) {
    try {
      const { usePlaylistStore } = await import('../store/playlistStore');
      const { useSettingsStore } = await import('../store/settingsStore');
      const { useDownloadStore } = await import('../store/downloadStore');
      const pl = usePlaylistStore.getState();
      const settings = useSettingsStore.getState();
      const localUris: Record<string, string> = {};
      for (const item of useDownloadStore.getState().completedList || []) {
        if (item?.localUri && item.song?.id != null) {
          localUris[String(item.song.id)] = item.localUri;
        }
      }
      const snap: Snapshot = {
        playList: pl.playList || [],
        playListIndex: pl.playListIndex || 0,
        playMode: pl.playMode || 0,
        musicQuality: settings.musicQuality || 'higher',
        enableMusicParsing: settings.enableMusicParsing !== false,
        apiBaseUrl: settings.apiBaseUrl || DEFAULT_API,
        localUris,
      };
      await publishSnapshot(snap);
      return snap;
    } catch (e) {
      console.warn('[Queue] 读取内存歌单失败，改读快照:', e);
    }
  }

  const published = asSnapshot(await readJson(SNAPSHOT_KEY));
  if (published) return published;

  const playlistState = (await readJson('playlist-store'))?.state;
  const settingsState = (await readJson('settings-store'))?.state;
  const downloadState = (await readJson('download-store'))?.state;
  if (!playlistState) return null;
  const localUris: Record<string, string> = {};
  for (const item of downloadState?.completedList || []) {
    if (item?.localUri && item.song?.id != null) {
      localUris[String(item.song.id)] = item.localUri;
    }
  }
  return asSnapshot({
    playList: playlistState.playList || [],
    playListIndex: playlistState.playListIndex || 0,
    playMode: playlistState.playMode || 0,
    musicQuality: settingsState?.musicQuality,
    enableMusicParsing: settingsState?.enableMusicParsing,
    apiBaseUrl: settingsState?.apiBaseUrl,
    localUris,
  });
}

async function readPlan(): Promise<UpcomingPlan | null> {
  const plan = await readJson(PLAN_KEY);
  if (!plan || !Array.isArray(plan.ids)) return null;
  return plan as UpcomingPlan;
}

async function writePlan(plan: UpcomingPlan | null): Promise<void> {
  try {
    if (!plan) {
      await AsyncStorage.removeItem(PLAN_KEY);
      return;
    }
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {}
}

function findIndexById(list: SongResult[], id: string | number | null | undefined): number {
  if (id == null) return -1;
  return list.findIndex((s) => String(s.id) === String(id));
}

function sequentialCandidateIds(list: SongResult[], activeIndex: number): string[] {
  const ids: string[] = [];
  const limit = AHEAD + EXTRA_CANDIDATES;
  for (let i = activeIndex + 1; i < list.length && ids.length < limit; i++) {
    ids.push(String(list[i].id));
  }
  return ids;
}

function extendShuffle(list: SongResult[], activeId: string, plan: UpcomingPlan | null): string[] {
  let rest: string[] = [];
  if (plan && plan.mode === PLAY_MODE_SHUFFLE) {
    const pos = plan.ids.findIndex((id) => id === activeId);
    if (pos >= 0) rest = plan.ids.slice(pos + 1);
    else if (plan.anchorId === activeId) rest = plan.ids.filter((id) => id !== activeId);
  }
  const used = new Set<string>([activeId, ...rest]);
  let guard = 0;
  while (rest.length < AHEAD + EXTRA_CANDIDATES && guard < list.length + 2) {
    guard++;
    const pool = list.filter((s) => !used.has(String(s.id)));
    if (pool.length === 0) break;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const id = String(pick.id);
    rest.push(id);
    used.add(id);
  }
  return rest;
}

async function resolveUrl(song: SongResult, snap: Snapshot): Promise<string | null> {
  const local = snap.localUris[String(song.id)];
  if (local) return local;

  try {
    const cached = await musicParser.getCachedUrl(song.id);
    if (cached) return cached;
  } catch {}

  try {
    if (snap.apiBaseUrl) setApiBaseUrl(snap.apiBaseUrl);
    const quality = snap.musicQuality || 'higher';
    const res = await request.get('/song/url/v1', {
      params: {
        id: song.id,
        level: quality,
        encodeType: quality === 'lossless' ? 'aac' : 'flac',
        unblock: true,
        randomCNIP: true,
      },
    });
    let url = res?.data?.data?.[0]?.url as string | undefined;
    const isTrial = !!res?.data?.data?.[0]?.freeTrialInfo;
    if ((isTrial || !url) && snap.enableMusicParsing) {
      const parsed = await parseMusicUrl(song.id, song, quality, true);
      if (parsed) url = parsed;
    }
    return url || null;
  } catch (e) {
    console.warn(`[Queue] 解析 "${song.name}" 失败:`, e);
    return null;
  }
}

async function tryAcquireLock(): Promise<string | null> {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const existing = await AsyncStorage.getItem(LOCK_KEY);
    if (existing) {
      const ts = Number(existing.split('-')[0]);
      if (Number.isFinite(ts) && Date.now() - ts < 20000) return null;
    }
    await AsyncStorage.setItem(LOCK_KEY, token);
    const readBack = await AsyncStorage.getItem(LOCK_KEY);
    return readBack === token ? token : null;
  } catch {
    return null;
  }
}

async function releaseLock(token: string): Promise<void> {
  try {
    const cur = await AsyncStorage.getItem(LOCK_KEY);
    if (cur === token) await AsyncStorage.removeItem(LOCK_KEY);
  } catch {}
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withLock(task: () => Promise<void>): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const token = await tryAcquireLock();
    if (!token) {
      await sleep(250);
      continue;
    }
    try {
      await task();
      return;
    } finally {
      await releaseLock(token);
    }
  }
  console.log('[Queue] 未拿到队列锁，跳过本轮');
}

function tailIds(queue: Track[], activeIdx: number): string[] {
  return queue.slice(activeIdx + 1).map((t) => String(t.id ?? ''));
}

async function removeTail(activeIdx: number, queueLength: number): Promise<void> {
  for (let i = queueLength - 1; i > activeIdx; i--) {
    await TrackPlayer.remove(i);
  }
}

async function isStalled(): Promise<boolean> {
  const playback = await TrackPlayer.getPlaybackState();
  const progress = await TrackPlayer.getProgress();
  const state = playback.state;
  if (state === State.Playing || state === State.Paused || state === State.Buffering || state === State.Loading) {
    return false;
  }
  if (state === State.Ended) return true;
  return progress.duration > 1 && progress.position >= progress.duration - 0.8;
}

async function resumeIfEnded(activeId: string): Promise<void> {
  if (!(await isStalled())) return;

  const queue = await TrackPlayer.getQueue();
  const idx = queue.findIndex((t) => String(t.id) === String(activeId));
  if (idx >= 0 && idx + 1 < queue.length) {
    console.log(`[Queue] 当前歌曲已结束，从队列续播 "${queue[idx + 1].title}"`);
    await TrackPlayer.skip(idx + 1);
    await TrackPlayer.play();
  }
}

function rememberPreload(resolved: ResolvedTrack[], list: SongResult[]): void {
  if (isHeadless() || resolved.length === 0) return;
  g.__preloadedNextSong = { songId: resolved[0].song.id, url: resolved[0].url };
  const idx = findIndexById(list, resolved[0].song.id);
  if (idx >= 0) g.__nextShuffleIndex = idx;
}

async function runOnce(reason: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const snap = await readSnapshot();
  if (!snap || snap.playList.length === 0) return;

  let active: Track | undefined;
  try {
    active = await TrackPlayer.getActiveTrack();
  } catch {
    return;
  }
  if (!active?.id) return;

  const activeId = String(active.id);
  if (findIndexById(snap.playList, activeId) < 0) {
    console.log(`[Queue] 当前曲目 ${activeId} 不在歌单里，跳过 (${reason})`);
    return;
  }

  const genAtStart = await readPlayGen();

  await withLock(async () => {
    if ((await readPlayGen()) !== genAtStart) return;

    // 进锁后再读一次。否则模式切换后，排队中的 headless 仍会按旧的单曲循环把原生重复模式改回去。
    const live = await readSnapshot();
    if (!live || live.playList.length === 0) return;
    const liveIndex = findIndexById(live.playList, activeId);
    if (liveIndex < 0) return;

    const queue = await TrackPlayer.getQueue();
    const activeIdx = queue.findIndex((t) => String(t.id) === activeId);
    if (activeIdx < 0) return;

    const mode = live.playMode;
    // 只有一首时，随机也只能重复这一首。顺序播放到末尾则停，不在这里重播。
    const repeatCurrent = mode === PLAY_MODE_LOOP || (mode === PLAY_MODE_SHUFFLE && live.playList.length <= 1);
    if (repeatCurrent) {
      await TrackPlayer.setRepeatMode(RepeatMode.Track);
      if (!isHeadless() && queue.length > activeIdx + 1) {
        await removeTail(activeIdx, queue.length);
        console.log('[Queue] 单曲循环：清空队列尾巴，交给原生重复当前曲');
      }
      if (await isStalled()) {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
        console.log('[Queue] 单曲循环：歌曲已结束，从头重播');
      }
      return;
    }

    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    const existingPlan = await readPlan();
    const candidateIds =
      mode === PLAY_MODE_SHUFFLE
        ? extendShuffle(live.playList, activeId, existingPlan)
        : sequentialCandidateIds(live.playList, liveIndex);

    if (mode === PLAY_MODE_SEQUENTIAL && candidateIds.length === 0) {
      if (!isHeadless() && queue.length > activeIdx + 1) {
        await removeTail(activeIdx, queue.length);
      }
      return;
    }

    const planForSave: UpcomingPlan = {
      mode,
      anchorId: activeId,
      ids: candidateIds.slice(0, AHEAD + EXTRA_CANDIDATES),
    };

    const currentTail = tailIds(queue, activeIdx);
    const headless = isHeadless();
    const plannedIds = planForSave.ids;
    const tailIsPrefix =
      currentTail.length > 0 && currentTail.every((id, i) => plannedIds[i] === id);

    // 尾巴已经是计划的前缀：只补后面缺的，不要先删再加（临近切歌时删尾巴会断档）
    if (tailIsPrefix && currentTail.length >= AHEAD) {
      await writePlan({ ...planForSave, ids: currentTail });
      await resumeIfEnded(activeId);
      return;
    }

    // headless 发现尾巴和计划对不上时不改写，避免用过期快照覆盖主界面刚排好的队列
    if (headless && currentTail.length > 0 && !tailIsPrefix) {
      await resumeIfEnded(activeId);
      return;
    }

    const missingIds = tailIsPrefix ? plannedIds.slice(currentTail.length) : plannedIds;
    if (missingIds.length === 0) {
      await resumeIfEnded(activeId);
      return;
    }

    if (!tailIsPrefix && !headless) {
      const queueNow = await TrackPlayer.getQueue();
      const activeNow = queueNow.findIndex((t) => String(t.id) === activeId);
      if (activeNow < 0) return;
      if (queueNow.length > activeNow + 1) await removeTail(activeNow, queueNow.length);
    }

    // 解析一首就入队一首。用户经常在第一首 URL 返回前就锁屏，不能等后面几首全部解析完。
    const queuedIds = tailIsPrefix ? [...currentTail] : [];
    const remembered: ResolvedTrack[] = [];
    let fails = 0;
    for (const id of missingIds) {
      if (queuedIds.length >= AHEAD) break;
      if (queuedIds.includes(id)) continue;
      if ((await readPlayGen()) !== genAtStart) return;
      const song = live.playList.find((item) => String(item.id) === id);
      if (!song) continue;
      const url = await resolveUrl(song, live);
      if (!url) {
        fails++;
        console.log(`[Queue] 跳过无音源歌曲 "${song.name}"`);
        if (fails >= MAX_FAILS) break;
        continue;
      }
      fails = 0;
      if ((await readPlayGen()) !== genAtStart) return;

      const queueNow = await TrackPlayer.getQueue();
      const activeNow = queueNow.findIndex((t) => String(t.id) === activeId);
      if (activeNow < 0) return;
      const tailNow = tailIds(queueNow, activeNow);
      if (headless && tailNow.length > 0 && !tailNow.every((tailId, index) => queuedIds[index] === tailId)) {
        break;
      }
      if (tailNow.includes(id)) {
        queuedIds.splice(0, queuedIds.length, ...tailNow);
        continue;
      }
      await TrackPlayer.add(toTrack(song, url));
      queuedIds.push(id);
      remembered.push({ song, url });
      console.log(`[Queue] ${headless ? '后台补队' : '入队'} "${song.name}" (${reason})`);
    }

    if (queuedIds.length > 0) {
      await writePlan({ mode, anchorId: activeId, ids: queuedIds });
      if (remembered.length > 0 && String(remembered[0].song.id) === queuedIds[0]) {
        rememberPreload(remembered, live.playList);
      }
    }

    await resumeIfEnded(activeId);
  });
}

export function ensureNativeQueue(reason: string): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (inflight) {
    rerun = true;
    return inflight;
  }
  const run = (async () => {
    do {
      rerun = false;
      try {
        await runOnce(reason);
      } catch (e) {
        console.warn(`[Queue] ensure 失败 (${reason}):`, e);
      }
    } while (rerun);
  })().finally(() => {
    inflight = null;
  });
  inflight = run;
  return run;
}

/**
 * 锁屏「上一首」会同时送到主界面和 headless。
 * 只允许一个上下文在 1 秒内真正切歌，避免亮屏时连跳两首。
 */
async function acquireRemotePrev(): Promise<boolean> {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const existing = await AsyncStorage.getItem(REMOTE_PREV_KEY);
    if (existing) {
      const ts = Number(existing.split('-')[0]);
      if (Number.isFinite(ts) && Date.now() - ts < 1000) return false;
    }
    await AsyncStorage.setItem(REMOTE_PREV_KEY, token);
    await sleep(80);
    return (await AsyncStorage.getItem(REMOTE_PREV_KEY)) === token;
  } catch {
    return true;
  }
}

async function syncMainToSong(song: SongResult, index: number): Promise<void> {
  if (isHeadless()) return;
  const { usePlaylistStore } = await import('../store/playlistStore');
  const { usePlayerStore } = await import('../store/playerStore');
  g.__currentPlayingSongId = song.id;
  const token = (g.__transitionToken || 0) + 1;
  g.__transitionToken = token;
  g.__isPlayTransitioning = true;
  g.__isActiveTrackSyncing = true;
  const player = usePlayerStore.getState();
  player.setPlayMusic(song);
  player.setIsPlay(true);
  player.setIsLoading(false);
  usePlaylistStore.getState().setPlayListIndex(index);
  g.__isActiveTrackSyncing = false;
  setTimeout(() => {
    if (g.__transitionToken === token) g.__isPlayTransitioning = false;
  }, 400);
}

/** 通知栏 / 锁屏「上一首」。主界面和后台服务都必须走这里，且只会生效一次。返回是否由本上下文完成切歌。 */
export async function playRemotePrevious(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!(await acquireRemotePrev())) {
    console.log('[Queue] 上一首已处理，忽略重复事件');
    return false;
  }

  const snap = await readSnapshot();
  if (!snap || snap.playList.length === 0) return false;

  let activeId: string | undefined;
  try {
    activeId = (await TrackPlayer.getActiveTrack())?.id;
  } catch {}

  let index = findIndexById(snap.playList, activeId);
  if (index < 0) index = Math.min(snap.playListIndex, snap.playList.length - 1);

  let prevIndex: number;
  if (snap.playMode === PLAY_MODE_SHUFFLE) {
    prevIndex = Math.floor(Math.random() * snap.playList.length);
  } else {
    prevIndex = (index - 1 + snap.playList.length) % snap.playList.length;
  }

  const song = snap.playList[prevIndex];
  if (!song) return false;
  const url = await resolveUrl(song, snap);
  if (!url) {
    console.log(`[Queue] 上一首 "${song.name}" 没有可播放地址`);
    return false;
  }

  const gen = await bumpPlayGen();
  await syncMainToSong(song, prevIndex);
  g.__preloadedNextSong = null;
  g.__nextShuffleIndex = null;
  lastPublishedSig = '';
  await writePlan(null);

  try {
    const repeatCurrent = snap.playMode === PLAY_MODE_LOOP || (snap.playMode === PLAY_MODE_SHUFFLE && snap.playList.length <= 1);
    await TrackPlayer.setRepeatMode(repeatCurrent ? RepeatMode.Track : RepeatMode.Off);
    await TrackPlayer.reset();
    if ((await readPlayGen()) !== gen) return false;
    await TrackPlayer.add(toTrack(song, url));
    if ((await readPlayGen()) !== gen) {
      await TrackPlayer.reset();
      return false;
    }
    await TrackPlayer.play();
    console.log(`[Queue] 上一首 → "${song.name}"`);
  } catch (e) {
    console.warn('[Queue] 上一首播放失败:', e);
    return false;
  }

  await ensureNativeQueue('remote-prev');
  return true;
}

/** 播放模式切换后丢掉已规划的下一首，按新模式重排原生队列。 */
export async function onPlayModeChanged(): Promise<void> {
  g.__nextShuffleIndex = null;
  g.__preloadedNextSong = null;
  lastPublishedSig = '';
  await writePlan(null);
  await ensureNativeQueue('mode-change');
}
