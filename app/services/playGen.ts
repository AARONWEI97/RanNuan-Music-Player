import AsyncStorage from '@react-native-async-storage/async-storage';

/** 每次真正换源播放时递增。预加载入队前再读一次，避免把歌加进已经 reset 过的新队列。 */
export const PLAY_GEN_KEY = 'tp-play-gen';

export async function bumpPlayGen(): Promise<string> {
  const gen = String(Date.now());
  await AsyncStorage.setItem(PLAY_GEN_KEY, gen);
  return gen;
}

export async function readPlayGen(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PLAY_GEN_KEY);
  } catch {
    return null;
  }
}
