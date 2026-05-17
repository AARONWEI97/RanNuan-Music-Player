import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  async get<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  async set(key: string, value: any): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  async multiGet(keys: string[]): Promise<[string, any | null][]> {
    const results = await AsyncStorage.multiGet(keys);
    return results.map(([key, value]) => {
      try {
        return [key, value ? JSON.parse(value) : null];
      } catch {
        return [key, null];
      }
    });
  },

  async multiSet(pairs: [string, any][]): Promise<void> {
    await AsyncStorage.multiSet(
      pairs.map(([key, value]) => [key, JSON.stringify(value)])
    );
  },

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  },
};
