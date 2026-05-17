# RanNuan Music Player 移动端开发文档

> 基于 React Native + TypeScript 的跨平台移动端音乐播放器
> 目标平台：Android + iOS
> GitHub: https://github.com/AARONWEI97/RanNuan-Music-Player

---

## 一、项目概述

### 1.1 项目背景

RanNuan Music Player 是一款基于 React Native + Expo 的跨平台移动端网易云音乐播放器，具备以下核心能力：

- 网易云音乐在线播放（基于 netease-cloud-music-api）
- 多音源解析解锁（落雪音乐、GD音乐台、UnblockNeteaseMusic、自定义API）
- 歌词显示（逐字歌词 + 翻译 + 点击跳转）
- 用户登录与歌单管理
- 下载管理 + 离线播放
- 暗色主题 + 国际化（中/英）
- 完整的错误处理与性能优化

### 1.2 核心原则

| 原则 | 说明 |
|------|------|
| **后端 API 零改动** | netease-cloud-music-api 完全复用，仅需远程部署 |
| **业务逻辑最大化复用** | API 层、类型定义、Store 逻辑从 Vue/Pinia 迁移到 React/Zustand |
| **Electron 依赖全部替换** | IPC 通道、electron-store、桌面歌词等用移动端原生方案替代 |
| **渐进式开发** | 先跑通核心播放链，再逐步添加增强功能 |

### 1.3 项目状态

**全部 8 个开发阶段已完成** ✅

| Phase | 状态 | 核心功能 |
|-------|------|---------|
| Phase 1 | ✅ | 项目初始化 + 核心播放链 |
| Phase 2 | ✅ | 首页 + 搜索 + 登录 |
| Phase 3 | ✅ | 歌单/专辑/歌手详情 + 收藏 + 播放模式 |
| Phase 4 | ✅ | 歌词系统（LRC/YRC/翻译/滚动/点击跳转） |
| Phase 5 | ✅ | 音源解析 + 灰色歌曲解锁（5 策略引擎） |
| Phase 6 | ✅ | 下载管理 + 离线播放 |
| Phase 7 | ✅ | 暗色主题 + 国际化 + 错误处理 + EAS Build |
| Phase 8 | ✅ | 音源解析修复 + 切歌优化 + 狗狗主题 + 首页logo + 卡片点击 |

### 1.4 测试说明

#### API 服务配置

移动端需要本地运行 `netease-cloud-music-api` 服务：

```bash
# 方式一：同时启动 API + Expo（推荐）
npm run dev

# 方式二：同时启动 API + Expo Web
npm run dev:web

# 方式三：分开启动
npm run api      # 启动 API 服务（端口 3000）
npm start        # 启动 Expo
```

**可用脚本**：

| 命令 | 作用 |
|------|------|
| `npm run api` | 只启动 API 服务 |
| `npm run dev` | 同时启动 API + Expo（手机端） |
| `npm run dev:web` | 同时启动 API + Expo Web |
| `npm start` | 只启动 Expo |
| `npm run web` | 只启动 Expo Web |

默认 API 地址已配置为 `http://192.168.1.6:3000`（局域网 IP），手机和电脑需在同一 WiFi 下。如 IP 变动，可在设置页修改 API 地址，或修改 `app/constants/config.ts` 和 `app/api/request.ts` 中的 `DEFAULT_API_URL`。

#### 测试方式

| 平台 | 命令 | 说明 |
|------|------|------|
| Web | `npm run dev:web` | 同时启动 API + Web |
| Android/iOS | `npm run dev` → Expo Go 扫码 | 完整功能测试 |

#### Web 平台兼容性

- `setNativeProps` 在 Web 不可用，已添加 `Platform.OS !== 'web'` 检测
- 音频播放使用 `expo-av`（Expo Go 兼容），Web 端播放受限

---

## 二、技术架构

### 2.1 技术栈选型

| 层级 | 桌面端（现有） | 移动端（新） | 选型理由 |
|------|---------------|-------------|----------|
| **框架** | Vue 3 | React Native 0.76+ | 跨平台、JS/TS 生态、社区成熟 |
| **语言** | TypeScript | TypeScript | 类型安全，与原项目一致 |
| **状态管理** | Pinia | Zustand | 轻量、无 Provider 包裹、API 类似 Pinia |
| **路由** | Vue Router | React Navigation 7 | RN 生态标准路由方案 |
| **HTTP 客户端** | axios | axios | 直接复用原项目请求逻辑 |
| **音频播放** | HTMLAudioElement | expo-av（Expo Go）/ react-native-track-player（Development Build） | expo-av 开箱即用；track-player 支持后台播放但需原生链接 |
| **本地存储** | electron-store / localStorage | @react-native-async-storage/async-storage | RN 标准异步存储 |
| **持久化** | pinia-plugin-persistedstate | zustand/middleware (persist) | Zustand 内置 persist 中间件 |
| **国际化** | vue-i18n | react-i18next | React 生态标准 i18n 方案 |
| **图标** | remixicon | react-native-vector-icons (MaterialCommunityIcons) | RN 最全图标库 |
| **样式** | Tailwind CSS | NativeWind (Tailwind for RN) | 与 Tailwind 语法一致，降低学习成本 |
| **安全区域** | - | react-native-safe-area-context | 处理刘海屏/底部安全区 |
| **手势** | - | react-native-gesture-handler + reanimated | RN 手势和动画标准方案 |
| **构建** | electron-vite | Expo / React Native CLI | 推荐 Expo（开箱即用，新手友好） |

### 2.2 架构图

```
┌────────────────────────────────────────────────────────────────────┐
│                        React Native App                             │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │ Screens   │  │ Components│  │ Hooks      │  │ Navigation       │ │
│  │ (页面)    │  │ (组件)    │  │ (业务逻辑) │  │ (路由)           │ │
│  └─────┬────┘  └─────┬────┘  └─────┬─────┘  └────────┬─────────┘ │
│        │             │             │                   │           │
│        └─────────────┴──────┬──────┴───────────────────┘           │
│                              │                                      │
│                    ┌─────────▼──────────┐                          │
│                    │   Zustand Stores    │                          │
│                    │  (状态管理 + 持久化) │                          │
│                    └─────────┬──────────┘                          │
│                              │                                      │
│           ┌──────────────────┼──────────────────┐                  │
│           │                  │                  │                   │
│  ┌────────▼───────┐ ┌───────▼───────┐ ┌───────▼────────┐        │
│  │   API Layer     │ │ Track Player   │ │ Native Bridge  │        │
│  │  (axios HTTP)   │ │ (音频播放)     │ │ (原生能力)     │        │
│  └────────┬───────┘ └───────────────┘ └────────────────┘        │
│           │                                                        │
└───────────┼────────────────────────────────────────────────────────┘
            │ HTTPS
┌───────────▼────────────────────────────────────────────────────────┐
│                     远程后端服务                                     │
│                                                                    │
│  ┌─────────────────────┐  ┌──────────────────────┐                │
│  │ netease-cloud-music-│  │ 音源解锁服务          │                │
│  │ api                 │  │ (UnblockNeteaseMusic) │                │
│  └─────────────────────┘  └──────────────────────┘                │
│                                                                    │
│  ┌─────────────────────┐  ┌──────────────────────┐                │
│  │ CORS 代理服务       │  │ 落雪音乐代理服务      │                │
│  │ (搜索建议等)        │  │ (LxMusic HTTP Proxy)  │                │
│  └─────────────────────┘  └──────────────────────┘                │
└────────────────────────────────────────────────────────────────────┘
```

### 2.3 与桌面端的对应关系

| 桌面端模块 | 移动端替代方案 | 变化说明 |
|-----------|--------------|---------|
| Electron 主进程 (server.ts) | 远程部署 netease-cloud-music-api | 从本地内嵌变为远程服务 |
| Electron IPC (50+ 通道) | 直接函数调用 / 原生模块 | 无需 IPC，直接调用 |
| preload (window.api) | Native Modules / 直接实现 | 移动端无跨进程通信 |
| HTMLAudioElement | expo-av（Expo Go）/ react-native-track-player（Dev Build） | expo-av 开箱即用；track-player 支持后台播放 |
| electron-store | AsyncStorage + Zustand persist | 异步存储替代同步存储 |
| 桌面歌词窗口 | 系统通知栏歌词 / 画中画 | 移动端原生媒体通知 |
| BrowserWindow (窗口管理) | React Navigation | 移动端无窗口概念 |
| 全局快捷键 | 系统媒体会话 / 耳机按键 | 移动端原生媒体控制 |
| 文件下载 (主进程) | react-native-fs / 系统下载器 | 移动端文件系统 API |
| 本地音乐扫描 (主进程) | react-native-fs + 原生媒体库 | 移动端文件访问 API |
| Web Worker (落雪脚本) | JSI / 独立服务端 | 移动端无 CORS 限制 |
| BiquadFilterNode (均衡器) | 原生 EQ API / react-native-track-player | 内置均衡器支持 |

---

## 三、项目结构（实际已创建）

### 3.1 目录结构

```
AlgerMusicPlayer-Mobile/
├── App.tsx                          # 应用入口
├── app/
│   ├── api/                      # API 请求层（从桌面端迁移）
│   │   ├── index.ts              # API 统一导出
│   │   ├── request.ts            # axios 实例 + 拦截器
│   │   ├── home.ts               # 首页相关 API
│   │   ├── search.ts             # 搜索 API
│   │   ├── login.ts              # 登录 API
│   │   ├── music.ts              # 音乐 API（核心）
│   │   ├── musicParser.ts        # 音源解析策略引擎
│   │   ├── playlist.ts           # 歌单 API
│   │   ├── album.ts              # 专辑 API
│   │   ├── artist.ts             # 歌手 API
│   │   ├── mv.ts                 # MV API
│   │   ├── user.ts               # 用户 API
│   │   ├── list.ts               # 排行榜 API
│   │   ├── podcast.ts            # 播客 API
│   │   ├── gdmusic.ts            # GD音乐台解析
│   │   └── parseFromCustomApi.ts # 自定义API解析
│   ├── components/               # 通用组件
│   │   ├── ui/                   # 基础 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── IconButton.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── player/               # 播放器相关组件
│   │   │   ├── MiniPlayer.tsx    # 底部迷你播放器
│   │   │   ├── FullPlayer.tsx    # 全屏播放页
│   │   │   ├── PlayerControls.tsx # 播放控制按钮
│   │   │   ├── ProgressBar.tsx   # 进度条
│   │   │   ├── VolumeSlider.tsx  # 音量控制
│   │   │   └── PlaylistDrawer.tsx # 播放列表抽屉
│   │   ├── music/                # 音乐相关组件
│   │   │   ├── SongItem.tsx      # 歌曲列表项
│   │   │   ├── SongList.tsx      # 歌曲列表
│   │   │   ├── PlaylistCard.tsx  # 歌单卡片
│   │   │   ├── ArtistCard.tsx    # 歌手卡片
│   │   │   └── AlbumCard.tsx     # 专辑卡片
│   │   ├── lyric/                # 歌词组件
│   │   │   ├── LyricView.tsx     # 歌词显示
│   │   │   └── LyricLine.tsx     # 单行歌词
│   │   ├── search/               # 搜索组件
│   │   │   ├── SearchBar.tsx     # 搜索栏
│   │   │   ├── SearchHistory.tsx # 搜索历史
│   │   │   └── HotSearch.tsx     # 热门搜索
│   │   └── common/               # 其他通用组件
│   │       ├── NetworkImage.tsx  # 网络图片（带缓存）
│   │       ├── SwipeableItem.tsx # 滑动操作项
│   │       └── SectionHeader.tsx # 分区标题
│   ├── constants/                # 常量定义
│   │   ├── theme.ts              # 主题常量
│   │   ├── storage.ts            # 存储 key 常量
│   │   └── config.ts             # 应用配置
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── usePlayer.ts          # 播放控制 Hook
│   │   ├── usePlaylist.ts        # 播放列表 Hook
│   │   ├── useFavorite.ts        # 收藏 Hook
│   │   ├── useSearch.ts          # 搜索 Hook
│   │   ├── useLyric.ts           # 歌词 Hook
│   │   ├── useDownload.ts        # 下载 Hook
│   │   ├── useTheme.ts           # 主题 Hook
│   │   ├── usePlaybackMode.ts    # 播放模式 Hook
│   │   └── useVolumeControl.ts   # 音量控制 Hook
│   ├── i18n/                     # 国际化
│   │   ├── index.ts              # i18next 配置
│   │   └── locales/              # 语言包
│   │       ├── zh-CN.json
│   │       ├── zh-TW.json
│   │       └── en.json
│   ├── navigation/               # 导航配置
│   │   ├── index.tsx             # 导航入口
│   │   ├── MainTabNavigator.tsx  # 主 Tab 导航
│   │   └── types.ts              # 导航类型定义
│   ├── screens/                  # 页面
│   │   ├── HomeScreen.tsx        # 首页
│   │   ├── SearchScreen.tsx      # 搜索页
│   │   ├── PlaylistDetailScreen.tsx # 歌单详情
│   │   ├── AlbumDetailScreen.tsx # 专辑详情
│   │   ├── ArtistDetailScreen.tsx # 歌手详情
│   │   ├── LoginScreen.tsx       # 登录页
│   │   ├── UserScreen.tsx        # 个人中心
│   │   ├── SettingsScreen.tsx    # 设置页
│   │   ├── LocalMusicScreen.tsx  # 本地音乐
│   │   ├── DownloadScreen.tsx    # 下载管理
│   │   └── PlayerScreen.tsx      # 全屏播放页
│   ├── services/                 # 服务层
│   │   ├── trackPlayerService.ts # 播放器服务（核心）
│   │   ├── musicParserService.ts # 音源解析服务
│   │   ├── storageService.ts     # 存储服务
│   │   ├── downloadService.ts    # 下载服务
│   │   ├── localMusicService.ts  # 本地音乐服务
│   │   └── notificationService.ts # 通知服务
│   ├── store/                    # Zustand 状态管理
│   │   ├── index.ts              # Store 统一导出
│   │   ├── playerStore.ts        # 播放器状态
│   │   ├── playlistStore.ts      # 播放列表状态
│   │   ├── favoriteStore.ts      # 收藏状态
│   │   ├── userStore.ts          # 用户状态
│   │   ├── settingsStore.ts      # 设置状态
│   │   ├── searchStore.ts        # 搜索状态
│   │   ├── lyricStore.ts         # 歌词状态
│   │   ├── downloadStore.ts      # 下载状态
│   │   ├── playHistoryStore.ts   # 播放历史
│   │   └── localMusicStore.ts    # 本地音乐状态
│   ├── types/                    # 类型定义（从桌面端迁移）
│   │   ├── music.ts
│   │   ├── user.ts
│   │   ├── playlist.ts
│   │   ├── artist.ts
│   │   ├── album.ts
│   │   ├── mv.ts
│   │   ├── search.ts
│   │   ├── lyric.ts
│   │   ├── podcast.ts
│   │   ├── navigation.ts
│   │   └── index.ts
│   ├── utils/                    # 工具函数
│   │   ├── format.ts             # 格式化工具
│   │   ├── color.ts              # 颜色工具
│   │   ├── lyricParser.ts        # 歌词解析器
│   │   └── validation.ts         # 校验工具
│   └── theme/                    # 主题系统
│       ├── index.ts              # 主题入口
│       ├── colors.ts             # 颜色定义
│       ├── typography.ts         # 字体排版
│       ├── spacing.ts            # 间距
│       └── darkTheme.ts          # 暗色主题
├── assets/                       # 静态资源
│   ├── images/                   # 图片
│   ├── dog-theme/                # 🐶 狗狗主题资源（Phase 8 新增）
│   │   ├── tab_home.png          # 首页 Tab 图标
│   │   ├── tab_search.png       # 搜索 Tab 图标
│   │   ├── tab_user.png         # 我的 Tab 图标
│   │   └── tab_settings.png     # 设置 Tab 图标
│   └── fonts/                   # 字体
├── app.json                      # Expo 配置
├── babel.config.js               # Babel 配置
├── index.js                      # 应用入口
├── metro.config.js               # Metro 配置
├── package.json                  # 依赖配置
├── tsconfig.json                 # TypeScript 配置
└── eas.json                      # Expo Application Services 配置
```

### 3.2 页面导航结构

```
RootStack
├── MainTabs (Bottom Tab Navigator)
│   ├── HomeTab
│   │   └── HomeScreen              # 首页（推荐、热门）
│   ├── SearchTab
│   │   └── SearchScreen            # 搜索页
│   ├── MyTab
│   │   └── UserScreen              # 个人中心
│   └── SettingsTab
│       └── SettingsScreen          # 设置
├── PlaylistDetailScreen            # 歌单详情
├── AlbumDetailScreen               # 专辑详情
├── ArtistDetailScreen              # 歌手详情
├── LoginScreen                     # 登录
├── PlayerScreen                    # 全屏播放（Modal）
├── LocalMusicScreen                # 本地音乐
├── DownloadScreen                  # 下载管理
└── MVPlayerScreen                  # MV 播放
```

---

## 四、核心模块设计

### 4.1 音频播放服务（最核心）

#### 技术选型：expo-av（当前） / react-native-track-player（Development Build）

当前项目使用 `expo-av` 作为音频播放引擎，因为它与 Expo Go 完全兼容。如需后台播放、通知栏控制等高级功能，需构建 Development Build 并切换到 `react-native-track-player`。

| 功能 | expo-av（当前） | react-native-track-player（Development Build） |
|------|----------------|-----------------------------------------------|
| Expo Go 兼容 | ✅ | ❌ 需原生链接 |
| 前台播放 | ✅ | ✅ |
| 后台播放 | ❌ | ✅ 原生后台服务 |
| 通知栏控制 | ❌ | ✅ |
| 锁屏控制 | ❌ | ✅ |
| 播放速率 | ✅ | ✅ |
| 均衡器 | ❌ | ✅ (Android) |

#### 当前核心代码设计（expo-av）

```typescript
// app/services/trackPlayerService.ts

import { Audio } from 'expo-av';

let soundRef: Audio.Sound | null = null;
let currentTrackId: string | null = null;

export const isPlayerAvailable = Platform.OS !== 'web';

export async function setupPlayer(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

export async function playSong(song: SongResult, url: string): Promise<void> {
  if (soundRef && currentTrackId === String(song.id)) {
    await soundRef.playAsync();
    return;
  }
  if (soundRef) {
    await soundRef.unloadAsync();
    soundRef = null;
  }
  const { sound } = await Audio.Sound.createAsync(
    { uri: url },
    { shouldPlay: true },
  );
  soundRef = sound;
  currentTrackId = String(song.id);
}
```

#### 切换到 react-native-track-player 的步骤

1. 构建 Development Build：`eas build --profile development`
2. 将 `trackPlayerService.ts` 中的 `expo-av` 实现替换为 `react-native-track-player`
3. 从 `metro.config.js` 的 `BLOCKED_MODULES` 中移除 `react-native-track-player`
4. 恢复 `usePlayer.ts` 中的 TrackPlayer 事件监听

#### 与桌面端 audioService 的对比

| 功能 | 桌面端 (HTMLAudioElement) | 移动端 (expo-av) |
|------|--------------------------|----------------------------------|
| 后台播放 | Electron 窗口常驻 | ❌ 仅前台（需 Development Build） |
| 系统媒体控制 | MediaSession API | ❌（需 Development Build） |
| 均衡器 | BiquadFilterNode (Web Audio) | ❌（需 Development Build） |
| 音频输出设备 | setSinkId | 系统级蓝牙/扬声器切换 |
| 播放速率 | audio.playbackRate | sound.setRateAsync() |
| 预加载 | 临时 Audio 元素 | 需自行实现 |

### 4.2 状态管理（Zustand）

#### 从 Pinia 迁移到 Zustand 的映射

```typescript
// 桌面端 Pinia 写法
export const usePlayerStore = defineStore('player', () => {
  const isPlay = ref(false);
  const playMusic = ref<SongResult | null>(null);
  const setIsPlay = (val: boolean) => { isPlay.value = val; };
  return { isPlay, playMusic, setIsPlay };
});

// 移动端 Zustand 写法
interface PlayerState {
  isPlay: boolean;
  playMusic: SongResult | null;
  setIsPlay: (val: boolean) => void;
  setPlayMusic: (music: SongResult | null) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      isPlay: false,
      playMusic: null,
      setIsPlay: (val) => set({ isPlay: val }),
      setPlayMusic: (music) => set({ playMusic: music }),
    }),
    {
      name: 'player-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        playMusic: state.playMusic
          ? {
              id: state.playMusic.id,
              name: state.playMusic.name,
              ar: state.playMusic.ar,
              al: state.playMusic.al,
              picUrl: state.playMusic.picUrl,
              duration: state.playMusic.duration,
            }
          : null,
      }),
    }
  )
);
```

#### Store 模块规划

| Store | 状态字段 | 持久化 | 对应桌面端 |
|-------|---------|--------|-----------|
| **playerStore** | isPlay, playMusic, volume, isMuted, playbackRate | playMusic, volume | playerCore.ts |
| **playlistStore** | playList, playListIndex, playMode | playList, playMode | playlist.ts |
| **favoriteStore** | favoriteList, dislikeList | favoriteList | favorite.ts |
| **userStore** | user, loginType, collectedAlbumIds | user | user.ts |
| **settingsStore** | theme (含 dog-light/dog-dark), language, apiBaseUrl, musicQuality, showLyricTranslation, autoPlay, volume, playbackRate, customApiUrl, unblockServiceUrl, lxMusicApiUrl, enableMusicParsing | 全部 | settings.ts |
| **searchStore** | searchValue, searchType | searchValue | search.ts |
| **lyricStore** | lyric, currentLineIndex, isLoading, songId, fontSize | 无 | 新增 |
| **downloadStore** | tasks, completedList | settings | download.ts |
| **playHistoryStore** | musicHistory, playlistHistory | 全部 | playHistory.ts |
| **localMusicStore** | folderPaths, musicList | folderPaths | localMusic.ts |

### 4.3 API 层迁移

#### request.ts 迁移方案

桌面端的 `request.ts` 有两个关键差异需要处理：

1. **baseURL 动态决定**：桌面端 Electron 指向本地 `127.0.0.1:PORT`，移动端指向远程 API
2. **Cookie/Token 注入**：桌面端从 localStorage 读取，移动端从 AsyncStorage 读取

```typescript
// app/api/request.ts

import axios, { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../store/settingsStore';

const API_BASE_URL = 'https://your-api-domain.com';

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

request.interceptors.request.use(async (config) => {
  const settings = useSettingsStore.getState();
  config.baseURL = settings.apiBaseUrl || API_BASE_URL;

  config.params = {
    ...config.params,
    timestamp: Date.now(),
    device: 'mobile',
  };

  const token = await AsyncStorage.getItem('token');
  if (token) {
    if (config.method !== 'post') {
      config.params.cookie = config.params.cookie || token;
    } else {
      config.data = { ...config.data, cookie: token };
    }
  }

  return config;
});

request.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 301) {
      const { handleLogout } = useUserStore.getState();
      handleLogout();
    }
    return Promise.reject(error);
  }
);

export default request;
```

#### API 文件迁移清单

| 文件 | 迁移难度 | 需要改动 | 说明 |
|------|---------|---------|------|
| home.ts | 🟢 简单 | 无 | 纯 HTTP 请求，直接搬 |
| search.ts | 🟡 中等 | 移除 `window.api.getSearchSuggestions` 分支 | 统一走 HTTP |
| login.ts | 🟢 简单 | 无 | 纯 HTTP |
| music.ts | 🟡 中等 | `getParsingMusicUrl` 调用需适配新 musicParser | 核心文件 |
| musicParser.ts | 🔴 复杂 | 移除 UnblockMusicStrategy，LxMusicStrategy 改为直接 fetch | 策略引擎重写 |
| playlist.ts | 🟢 简单 | 无 | 纯 HTTP |
| album.ts | 🟢 简单 | 无 | 纯 HTTP |
| artist.ts | 🟢 简单 | 无 | 纯 HTTP |
| mv.ts | 🟢 简单 | 无 | 纯 HTTP |
| user.ts | 🟢 简单 | 无 | 纯 HTTP |
| list.ts | 🟢 简单 | 无 | 纯 HTTP |
| podcast.ts | 🟢 简单 | 无 | 纯 HTTP |
| gdmusic.ts | 🟢 简单 | 无 | 直接 axios，无 Electron 依赖 |
| parseFromCustomApi.ts | 🟢 简单 | localStorage → AsyncStorage | 存储替换 |
| lxMusicStrategy.ts | 🔴 复杂 | 移除 IPC HTTP 代理，改为直接 fetch | 移动端无 CORS |
| donation.ts | 🟢 简单 | 无 | 直接 axios |

### 4.4 音源解析服务迁移

这是整个迁移中最复杂的部分。桌面端有 4 种音源策略，移动端需要重新设计：

#### 桌面端音源策略

```
优先级 0: LxMusicStrategy    → 主进程 IPC 代理 HTTP（绕 CORS）
优先级 1: CustomApiStrategy  → 纯 HTTP（无 CORS 问题）
优先级 3: GDMusicStrategy    → 纯 HTTP（无 CORS 问题）
优先级 4: UnblockMusicStrategy → 主进程 IPC（@unblockneteasemusic/server）
```

#### 移动端音源策略

```
优先级 0: 官方 API           → 直接 HTTP 请求 netease-cloud-music-api
优先级 1: CustomApiStrategy  → 直接 HTTP（移动端无 CORS）
优先级 2: GDMusicStrategy    → 直接 HTTP（移动端无 CORS）
优先级 3: LxMusicStrategy    → 直接 fetch（移动端无 CORS，无需代理）
优先级 4: UnblockMusicService → 远程部署的解锁服务 HTTP API
```

#### 关键变化

1. **移动端无 CORS 限制** — 这是最大的优势！所有 HTTP 请求可以直接发，不需要主进程代理
2. **UnblockNeteaseMusic 需要部署为独立服务** — 这是必须额外搭建的后端服务
3. **LxMusic 脚本执行** — 移动端可以直接在 JS 线程执行，不需要 Worker 隔离（无 CORS）

```typescript
// app/services/musicParserService.ts

interface MusicSourceStrategy {
  name: string;
  priority: number;
  parse(id: string | number, songData: SongResult, quality: string): Promise<string | null>;
}

class OfficialApiStrategy implements MusicSourceStrategy {
  name = 'official';
  priority = 0;

  async parse(id, songData, quality) {
    const res = await request.get('/song/url/v1', { params: { id, level: quality } });
    return res.data?.data?.[0]?.url || null;
  }
}

class CustomApiStrategy implements MusicSourceStrategy {
  name = 'custom';
  priority = 1;
  // ... 从桌面端 parseFromCustomApi.ts 迁移
}

class GDMusicStrategy implements MusicSourceStrategy {
  name = 'gdmusic';
  priority = 2;
  // ... 从桌面端 gdmusic.ts 迁移
}

class LxMusicStrategy implements MusicSourceStrategy {
  name = 'lxMusic';
  priority = 3;
  // 移动端直接 fetch，无需 IPC 代理
}

class UnblockMusicServiceStrategy implements MusicSourceStrategy {
  name = 'unblock';
  priority = 4;

  async parse(id, songData, quality) {
    const { unblockServiceUrl } = useSettingsStore.getState();
    if (!unblockServiceUrl) return null;
    const res = await axios.post(`${unblockServiceUrl}/unblock`, { id, quality });
    return res.data?.url || null;
  }
}

export class MusicParser {
  private strategies: MusicSourceStrategy[] = [];

  constructor() {
    this.strategies = [
      new OfficialApiStrategy(),
      new CustomApiStrategy(),
      new GDMusicStrategy(),
      new LxMusicStrategy(),
      new UnblockMusicServiceStrategy(),
    ].sort((a, b) => a.priority - b.priority);
  }

  async parseMusic(id: string | number, songData: SongResult, quality = 'exhigh') {
    for (const strategy of this.strategies) {
      try {
        const url = await strategy.parse(id, songData, quality);
        if (url) return url;
      } catch (e) {
        console.warn(`Strategy ${strategy.name} failed:`, e);
      }
    }
    return null;
  }
}
```

### 4.5 Electron 依赖替换方案汇总

| 桌面端能力 | Electron 实现方式 | 移动端替代方案 | 实现难度 |
|-----------|-----------------|--------------|---------|
| **API 服务器** | 主进程内嵌 netease-cloud-music-api | 远程部署同一 API | 🟢 部署即可 |
| **音源解锁** | 主进程 @unblockneteasemusic/server IPC | 部署为独立 HTTP 服务 | 🟡 需开发服务端 |
| **CORS 代理** | 主进程 node-fetch 代理 | 移动端无 CORS，直接请求 | 🟢 无需处理 |
| **配置存储** | electron-store (同步 IPC) | AsyncStorage + Zustand persist | 🟢 异步存储 |
| **窗口控制** | BrowserWindow API | React Navigation | 🟢 无需处理 |
| **桌面歌词** | 独立 BrowserWindow | 系统通知栏媒体样式 | 🟡 需适配 |
| **系统托盘** | Tray API | 系统媒体通知 | 🟢 TrackPlayer 内置 |
| **全局快捷键** | globalShortcut | 耳机按键 + 通知栏控制 | 🟢 TrackPlayer 内置 |
| **MPRIS** | mpris-service | 系统媒体会话 | 🟢 TrackPlayer 内置 |
| **下载管理** | 主进程队列 + fs + music-metadata | react-native-fs + 原生下载 | 🔴 需重写 |
| **本地音乐** | 主进程 fs 扫描 + music-metadata | 原生媒体库查询 | 🔴 需重写 |
| **磁盘歌词缓存** | 主进程 fs 读写 | AsyncStorage / 文件系统 | 🟡 简化实现 |
| **均衡器** | BiquadFilterNode 链 | TrackPlayer 内置 EQ (Android) | 🟡 部分支持 |
| **音频输出设备** | setSinkId | 系统级蓝牙/扬声器 | 🟢 系统处理 |
| **自动更新** | electron-updater | Expo Update / CodePush | 🟡 需配置 |
| **系统字体** | font-list (Node) | 不需要 | 🟢 移除 |
| **文件选择** | dialog.showOpenDialog | DocumentPicker | 🟢 原生组件 |
| **通知** | BrowserWindow 通知 | PushNotification | 🟢 原生 API |

---

## 五、UI 设计规范

### 5.1 设计原则

| 原则 | 说明 |
|------|------|
| **原生体验** | 遵循 Material Design 3 (Android) 和 Human Interface Guidelines (iOS) |
| **底部导航** | 移动端核心导航放底部，与桌面端左侧栏不同 |
| **迷你播放器** | 底部 Tab 上方常驻迷你播放器，点击展开全屏 |
| **手势优先** | 滑动切歌、下拉关闭、左滑删除等 |
| **安全区域** | 适配刘海屏、底部安全区 |

### 5.2 核心页面布局

#### 首页 (HomeScreen)

```
┌──────────────────────────┐
│  早上好                   │
│  发现好音乐          🔍  │
├──────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐  │
│  │心动  │ │每日  │ │私人  │  │  ← 快捷导航卡片 (3x2)
│  │模式  │ │推荐  │ │ FM   │  │     带封面背景+图标
│  └──────┘ └──────┘ └──────┘  │
│  ┌──────┐ ┌──────┐ ┌──────┐  │
│  │排行  │ │ MV   │ │歌单  │  │
│  │榜    │ │      │ │广场  │  │
│  └──────┘ └──────┘ └──────┘  │
├──────────────────────────┤
│  🎵 轮播 Banner           │
├──────────────────────────┤
│  🔥 推荐歌单 (2列网格)    │
│  [卡片] [卡片]            │
│  [卡片] [卡片]            │
│  [卡片] [卡片]            │
├──────────────────────────┤
│  👤 热门歌手 (横向滚动)    │
│  [头像] [头像] [头像] →  │
├──────────────────────────┤
│  💿 新碟上架 (横向滚动)    │
│  [封面] [封面] [封面] →  │
├──────────────────────────┤
│  🎵 推荐新歌 (列表20首)    │
│  01 歌名 - 歌手      ▶  │
│  02 歌名 - 歌手      ▶  │
│  ...                      │
├──────────────────────────┤
│                          │
│  ┌────────────────────┐  │
│  │  🎵 迷你播放器      │  │
│  │  歌名 - 歌手  ▶ ⏭  │  │
│  └────────────────────┘  │
├──────────────────────────┤
│  🏠    🔍    👤    ⚙️    │
└──────────────────────────┘
```

#### 全屏播放页 (PlayerScreen)

```
┌──────────────────────────┐
│  ↕ 下拉关闭               │
│                          │
│  ┌────────────────────┐  │
│  │                    │  │
│  │    🎵 封面大图      │  │
│  │   (旋转动画)        │  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  歌曲名称                │
│  歌手名称                │
│                          │
│  ──●──────────── 1:23   │
│                          │
│  ⏮   ⏪   ⏯   ⏩   ⏭  │
│                          │
│  🔀  📋  ❤️  ⬇️  🎤    │
│                          │
│  ── 歌词区域 ──          │
│  上一行歌词               │
│  ● 当前歌词 (高亮)       │
│  下一行歌词               │
│                          │
└──────────────────────────┘
```

### 5.3 主题系统

```typescript
// app/theme/colors.ts

export const LightTheme = {
  primary: '#ff3b3b',        // 网易云红
  background: '#ffffff',
  surface: '#f5f5f5',
  card: '#ffffff',
  text: '#333333',
  textSecondary: '#999999',
  border: '#e5e5e5',
  error: '#ff4d4f',
  success: '#52c41a',
};

export const DarkTheme = {
  primary: '#ff3b3b',
  background: '#1a1a1a',
  surface: '#2a2a2a',
  card: '#333333',
  text: '#ffffff',
  textSecondary: '#888888',
  border: '#444444',
  error: '#ff4d4f',
  success: '#52c41a',
};

// 🐶 狗狗主题（Phase 8 新增）
export const DogLightColors = {
  primary: '#d4913d',        // 金棕色
  background: '#fdf8f0',    // 暖米色
  surface: '#f5ede0',        // 暖灰
  card: '#ffffff',
  text: '#4a3520',           // 深巧克力
  textSecondary: '#8b7355',
  border: '#e8dcc8',
  error: '#c0392b',
  success: '#27ae60',
};

export const DogDarkColors = {
  primary: '#e8b36a',        // 亮金色
  background: '#1c1510',    // 暖棕黑
  surface: '#2a2018',        // 暖深棕
  card: '#352a20',
  text: '#f0e6d6',           // 暖白
  textSecondary: '#a89880',
  border: '#3d3028',
  error: '#e74c3c',
  success: '#2ecc71',
};
```

**ThemeType**（`settingsStore`）：`'light' | 'dark' | 'system' | 'dog-light' | 'dog-dark'`

**狗狗主题 Tab 图标**：`assets/dog-theme/tab_home.png`、`tab_search.png`、`tab_user.png`、`tab_settings.png`
- 建议尺寸 96x96px，文件大小 5-20KB
- 使用 `opacity` 区分选中(1.0)/未选中(0.5)，不使用 `tintColor`

---

## 六、后端服务部署方案

移动端不再内嵌 API 服务，需要远程部署以下服务：

### 6.1 必须部署

| 服务 | 仓库 | 说明 |
|------|------|------|
| **netease-cloud-music-api** | netease-cloud-music-api-alger | 核心 API，桌面端同款 |
| **音源解锁服务** | @unblockneteasemusic/server | 需要封装为 HTTP API 服务 |

### 6.2 可选部署

| 服务 | 说明 | 是否必须 |
|------|------|---------|
| **CORS 代理** | 移动端无 CORS，不需要 | ❌ 不需要 |
| **落雪音乐代理** | 移动端无 CORS，不需要 | ❌ 不需要 |
| **搜索建议代理** | 移动端无 CORS，不需要 | ❌ 不需要 |

### 6.3 音源解锁服务设计

需要将 `@unblockneteasemusic/server` 封装为 HTTP API：

```javascript
// unblock-music-server/index.js
const express = require('express');
const { match } = require('@unblockneteasemusic/server');

const app = express();
app.use(express.json());

app.post('/unblock', async (req, res) => {
  const { id, quality } = req.body;
  try {
    const result = await match(id, ['migu', 'kugou', 'kuwo', 'pyncmd'], quality);
    res.json({ code: 200, data: result });
  } catch (e) {
    res.json({ code: 500, message: e.message });
  }
});

app.listen(3001, () => console.log('Unblock service running on :3001'));
```

---

## 七、开发阶段规划

### Phase 1：项目初始化 + 核心播放链 ✅ 已完成

**目标**：能播放一首歌

| 任务 | 说明 |
|------|------|
| 初始化 Expo 项目 | `npx create-expo-app AlgerMusicPlayer-Mobile --template tabs` |
| 安装核心依赖 | react-native-track-player, zustand, axios, react-navigation |
| 搭建目录结构 | 按本文档 3.1 节创建目录 |
| 迁移类型定义 | 从桌面端 types/ 复制，移除 Electron 相关类型 |
| 实现 request.ts | 适配移动端的 axios 实例 |
| 迁移 music.ts API | getMusicUrl, getMusicDetail |
| 实现 playerStore | 播放状态管理 |
| 实现 playlistStore | 播放列表管理 |
| 实现 trackPlayerService | 播放器服务初始化 + 基础控制 |
| 实现 MiniPlayer | 底部迷你播放器组件 |
| 实现 PlayerScreen | 全屏播放页 |
| 部署后端 API | 远程部署 netease-cloud-music-api |

**验收标准**：输入歌曲 ID，能播放音乐，能暂停/继续/切歌

### Phase 2：首页 + 搜索 + 登录 ✅ 已完成

**目标**：能浏览、搜索、登录

| 任务 | 说明 |
|------|------|
| 迁移 home.ts API | 首页推荐、热门歌手、轮播图、推荐歌单、新碟上架 |
| 迁移 search.ts API | 搜索、搜索建议（统一走 HTTP，无 CORS） |
| 迁移 login.ts API | 二维码/手机/UID 登录 |
| 实现 HomeScreen | 首页推荐内容展示（轮播图+推荐歌单+推荐音乐+热门歌手+新碟上架） |
| 实现 SearchScreen | 搜索页 + 热搜 + 搜索历史 + 多 Tab 结果（单曲/歌手/专辑/歌单） |
| 实现 LoginScreen | 登录页（二维码扫码 + 手机号密码 + UID），含轮询扫码状态、过期刷新 |
| 实现 userStore | 用户状态管理 + 歌单获取 + 登录状态检查 + token 清理 + 持久化 |
| 实现 SongItem 组件 | 歌曲列表项（复用率最高） |
| 实现 MainTabNavigator | 底部 Tab 导航 + Stack 导航 + MiniPlayer |
| 实现 UserScreen | 个人中心 + 用户歌单展示 + 登录状态自动检查 |

**验收标准**：能浏览首页推荐、搜索歌曲、登录账号

### Phase 3：歌单 + 专辑 + 歌手详情 ✅ 已完成

**目标**：完整的浏览体验

| 任务 | 说明 |
|------|------|
| 迁移 playlist/album/artist/list API | 详情页所需 API（getListDetail, getAlbum, getArtistDetail, getArtistTopSongs, getArtistAlbums） |
| 实现 PlaylistDetailScreen | 歌单详情 + 封面 + 创建者 + 标签 + 歌曲列表 + 播放全部 |
| 实现 AlbumDetailScreen | 专辑详情 + 封面 + 歌手 + 发行时间 + 歌曲列表 + 播放全部 |
| 实现 ArtistDetailScreen | 歌手详情 + 大图封面 + 渐变遮罩 + 简介 + 热门歌曲 + 播放全部 |
| 实现 favoriteStore | 收藏/不喜欢列表管理 + 持久化 |
| 实现 PlaylistDrawer | 播放队列抽屉 + 当前播放高亮 + 移除歌曲 + 清空 |
| 实现 PlayModeToggle | 顺序/单曲循环/随机/心动模式切换 |
| MiniPlayer 集成 | 播放模式切换 + 播放列表入口 |

**验收标准**：能浏览歌单/专辑/歌手详情，能收藏歌曲，能切换播放模式

### Phase 4：歌词系统 ✅ 已完成

**目标**：完整的歌词体验

| 任务 | 说明 | 实现文件 |
|------|------|---------|
| 实现歌词解析器 | 标准 LRC + 逐字 YRC + 翻译歌词匹配 | `utils/lyricParser.ts` |
| 实现 lyricStore | 歌词状态管理（数据、行索引、字体大小） | `store/lyricStore.ts` |
| 实现 useLyric Hook | 自动加载歌词、实时同步行索引、翻译开关 | `hooks/useLyric.ts` |
| 实现 LyricLine 组件 | 单行歌词：高亮、逐字动画、翻译行 | `components/lyric/LyricLine.tsx` |
| 实现 LyricView 组件 | 歌词滚动视图：自动滚动、手动暂停、点击跳转 | `components/lyric/LyricView.tsx` |
| PlayerScreen 歌词集成 | 封面/歌词切换、底部歌词按钮 | `screens/PlayerScreen.tsx` |
| 实现歌词点击跳转 | 点击歌词行 seekTo 对应播放位置 | `LyricView → LyricLine → onSeekTo` |
| 实现歌词翻译 | 翻译歌词解析 + 显示开关（settingsStore.showLyricTranslation） | `lyricParser.ts + LyricLine.tsx` |
| 系统通知栏歌词 | Android 通知栏显示歌词 | 🔜 待实现（需原生模块支持） |

**验收标准**：播放时显示滚动歌词，支持逐字歌词，点击跳转

### Phase 5：音源解析 + 灰色歌曲解锁 ✅ 已完成

**目标**：能播放灰色歌曲

| 任务 | 说明 | 实现文件 |
|------|------|---------|
| 实现 musicParserService | 策略引擎（5 种策略按优先级降级） | `services/musicParserService.ts` |
| 实现 OfficialApiStrategy | 官方 API 请求（优先级 0） | 内嵌于 musicParserService |
| 迁移 CustomApiStrategy | 自定义 API 解析（优先级 1） | 内嵌于 musicParserService |
| 迁移 GDMusicStrategy | GD 音乐台搜索+匹配（优先级 2） | 内嵌于 musicParserService |
| 迁移 LxMusicStrategy | 落雪音乐直接 HTTP（优先级 3，移动端无 CORS） | 内嵌于 musicParserService |
| 实现 UnblockMusicServiceStrategy | 远程解锁服务 HTTP API（优先级 4） | 内嵌于 musicParserService |
| 实现 URL 缓存 | AsyncStorage 缓存已解析 URL（30 分钟过期） | 内嵌于 musicParserService |
| 设置页添加 API 配置 | 音源解析开关 + 自定义 API + 落雪 API + 解锁服务地址 + 清除缓存 | `screens/SettingsScreen.tsx` |
| 集成到播放流程 | 官方 API 无 URL 时自动尝试音源解析 | `hooks/usePlayer.ts` |
| 部署音源解锁服务 | @unblockneteasemusic/server HTTP 封装 | 🔜 需独立部署后端服务 |

**验收标准**：灰色歌曲能通过音源解析播放

### Phase 6：下载 + 本地音乐 ✅ 已完成

**目标**：离线能力

| 任务 | 说明 | 实现文件 |
|------|------|---------|
| 实现 downloadStore | 下载队列/进度/完成列表 + 持久化 | `store/downloadStore.ts` |
| 实现 downloadService | 基于 expo-file-system 的下载管理（含音源解析回退） | `services/downloadService.ts` |
| 实现 useDownload Hook | 下载/删除/检查/获取本地 URI | `hooks/useDownload.ts` |
| 实现 DownloadScreen | 下载管理页面（进度条/状态/删除/播放已下载歌曲） | `screens/DownloadScreen.tsx` |
| 添加下载路由 | 导航类型 + Stack 路由注册 | `types/navigation.ts + navigation/MainTabNavigator.tsx` |
| 集成下载到播放页 | 底部操作栏下载按钮（已下载显示✅） | `screens/PlayerScreen.tsx` |
| 集成下载到用户页 | "本地/下载"菜单项导航到下载页 | `screens/UserScreen.tsx` |
| 实现歌曲缓存 | 已下载歌曲优先使用本地文件播放 | `hooks/usePlayer.ts` |
| 实现 localMusicService | 原生媒体库查询 | 🔜 待实现（需 expo-media-library） |
| 实现 LocalMusicScreen | 本地音乐页面 | 🔜 待实现 |

**验收标准**：能下载歌曲、播放本地音乐

### Phase 7：打磨 + 上线 ✅ 已完成

**目标**：生产级质量

| 任务 | 说明 | 实现文件 |
|------|------|---------|
| 暗色主题 | ThemeContext + useAppTheme + 全组件适配（LightColors → colors） | `theme/ThemeContext.tsx` + 11 个组件适配 |
| 国际化 | 中/英 i18n（i18next + react-i18next） | `i18n/index.ts` + `i18n/locales/zh-CN.json` + `en-US.json` |
| 手势交互 | 下拉关闭播放页（已有） | `screens/PlayerScreen.tsx` |
| 性能优化 | FlatList getItemLayout、useMemo/useCallback、expo-image | 各组件已应用 |
| 错误处理 | ErrorBoundary + 网络异常/播放失败/下载失败 Toast | `components/common/ErrorBoundary.tsx` + `components/ui/Toast.tsx` |
| 应用配置 | app.json 更新（包名、权限、音频后台、自动主题） | `app.json` |
| EAS Build | 开发/预览/生产三套构建配置 | `eas.json` |
| 应用商店上架 | Google Play + App Store | 🔜 需开发者账号和签名配置 |

---

## 八、依赖清单

### 8.1 核心依赖

```json
{
  "dependencies": {
    "react": "19.1.0",
    "react-native": "0.76.3",
    "expo": "~54.0.0",

    "expo-av": "~15.0.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",

    "zustand": "^4.5.0",
    "axios": "^1.7.0",
    "@react-native-async-storage/async-storage": "^2.0.0",

    "react-i18next": "^15.0.0",
    "i18next": "^24.0.0",

    "nativewind": "^4.1.0",
    "tailwindcss": "^3.4.0",

    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "^4.0.0",
    "react-native-vector-icons": "^10.2.0",
    "react-native-fast-image": "^8.6.3",
    "@gorhom/bottom-sheet": "^5.0.0",
    "react-native-gesture-handler": "^2.20.0",
    "react-native-reanimated": "^3.16.0"
  }
}
```

### 8.2 可选依赖（Phase 6+）

```json
{
  "optionalDependencies": {
    "react-native-fs": "^2.20.0",
    "@react-native-community/netinfo": "^11.0.0",
    "react-native-document-picker": "^9.3.0",
    "expo-media-library": "~17.0.0",
    "expo-file-system": "~18.0.0",
    "expo-keep-awake": "~14.0.0",
    "react-native-blurhash": "^2.1.0"
  }
}
```

---

## 九、开发环境搭建

### 9.1 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 与桌面端一致 |
| Expo CLI | 最新 | `npm install -g expo-cli` |
| Android Studio | 最新 | Android 模拟器 |
| Xcode | 15+ | iOS 模拟器（仅 macOS） |
| JDK | 17 | Android 构建 |

### 9.2 快速开始

```bash
# 1. 创建项目
npx create-expo-app AlgerMusicPlayer-Mobile --template blank-typescript

# 2. 进入项目
cd AlgerMusicPlayer-Mobile

# 3. 安装核心依赖
npx expo install expo-av @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack zustand axios @react-native-async-storage/async-storage react-native-safe-area-context react-native-screens nativewind babel-preset-expo

# 4. 启动开发
npx expo start
```

### 9.3 调试工具

| 工具 | 用途 |
|------|------|
| Expo Go | 手机扫码实时预览 |
| React DevTools | 组件树检查 |
| Flipper | 网络请求、布局检查 |
| Chrome DevTools | 远程调试 JS |

### 9.4 Web 预览问题修复

> **问题**：`npx expo start --web` 启动后页面空白，控制台报错 `Cannot use 'import.meta' outside a module`

#### 问题根因

Metro bundler 在 web 平台上会将 ESM 代码打包为普通脚本（非 module），导致 `import.meta` 不可用。有两个依赖使用了 `import.meta`：

| 依赖 | 使用方式 | 影响 |
|------|---------|------|
| `@react-native/debugger-frontend` | `import.meta.url`、`import.meta.resolve` | React Native 调试器前端 |
| `zustand` (ESM 版本) | `import.meta.env` | 状态管理库 |

#### 修复方案

**1. 屏蔽 debugger-frontend**

在 `metro.config.js` 中通过 `resolveRequest` 将 `@react-native/debugger-frontend` 替换为空模块：

```js
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === '@react-native/debugger-frontend' || moduleName.startsWith('@react-native/debugger-frontend/')) {
        return { type: 'empty' };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};
```

**2. 强制 zustand 使用 CJS 版本**

创建 `scripts/patch-zustand.js`，在 `npm install` 后自动删除 zustand `package.json` 中的 `import` 条件：

```js
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'node_modules', 'zustand', 'package.json');
if (!fs.existsSync(pkgPath)) process.exit(0);

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function stripImport(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'import') continue;
    if (typeof value === 'object' && value !== null) {
      result[key] = stripImport(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

if (pkg.exports) {
  pkg.exports = stripImport(pkg.exports);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
```

**3. 配置 postinstall 脚本**

在 `package.json` 中添加：

```json
{
  "scripts": {
    "postinstall": "node scripts/patch-zustand.js"
  }
}
```

#### 启动 Web 预览

```bash
npx expo start --web -c
```

浏览器访问 `http://localhost:8081`，使用 **Ctrl+Shift+R** 强制刷新缓存。

### 9.5 移动端运行时问题修复

#### 问题 1：`private properties are not supported`

**原因**：`shaka-player` 依赖使用了 JS 私有类字段语法（`#field`），Hermes 引擎不支持。

**修复**：`npm uninstall shaka-player`（项目未使用该依赖）

#### 问题 2：`Property 'require' doesn't exist`

**原因**：Expo SDK 54 注入 `web-streams-polyfill`（`expo/virtual/streams.js`）作为全局 polyfill，Babel 将其转译为 `require("@babel/runtime/helpers/defineProperty")`，但此时 Hermes 运行时 `require` 尚未初始化。

**修复**：在 `metro.config.js` 中添加 `serializer.processModuleFilter` 排除该 polyfill：

```js
const config = {
  serializer: {
    processModuleFilter: (module) => {
      const path = module.path || '';
      if (path.includes('expo') && path.includes('virtual') && path.includes('streams.js')) {
        return false;
      }
      return true;
    },
  },
};
```

#### 问题 3：`Cannot read property 'CAPABILITY_PLAY' of null`

**原因**：`react-native-track-player` 需要原生模块链接，Expo Go 不包含该模块，`Capability` 对象为 `null`。

**修复**：使用 `expo-av` 替代 `react-native-track-player`，并在 `metro.config.js` 中屏蔽 `react-native-track-player` 防止间接导入崩溃。

#### 问题 4：缺少 `babel.config.js`

**原因**：项目缺少 Babel 配置文件，导致私有属性语法等 ES2022 特性未被正确转译。

**修复**：创建 `babel.config.js`：

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

#### 完整的 metro.config.js

```js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const BLOCKED_MODULES = [
  '@react-native/debugger-frontend',
  'web-streams-polyfill',
  'react-native-track-player',
];

const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      for (const blocked of BLOCKED_MODULES) {
        if (moduleName === blocked || moduleName.startsWith(blocked + '/')) {
          return { type: 'empty' };
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
  serializer: {
    processModuleFilter: (module) => {
      const path = module.path || '';
      if (path.includes('expo') && path.includes('virtual') && path.includes('streams.js')) {
        return false;
      }
      return true;
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

#### 清除缓存重启

每次修改 `metro.config.js` 或 `babel.config.js` 后，必须清除缓存重启：

```bash
# 杀掉占用 8081 端口的进程
netstat -ano | findstr ":8081"
taskkill /PID <进程ID> /F

# 清除缓存重启
npx expo start -c
```

---

## 十、风险与注意事项

### 10.1 技术风险

| 风险 | 影响 | 应对方案 |
|------|------|---------|
| react-native-track-player 后台播放兼容性 | 部分国产 ROM 限制后台 | 引导用户关闭电池优化 |
| iOS 后台音频限制 | 后台播放需特殊配置 | 确保配置 audio background mode |
| 音源解锁服务稳定性 | 灰色歌曲可能无法播放 | 多策略降级，提示用户 |
| AsyncStorage 性能 | 大量数据读写慢 | 只持久化必要数据，其余用内存 |
| 均衡器 iOS 不支持 | iOS 无原生 EQ API | 使用音频处理库或放弃 iOS EQ |

### 10.2 合规风险

| 风险 | 说明 | 应对方案 |
|------|------|---------|
| 音源解锁 | 可能违反网易云音乐 ToS | 仅供学习研究，不商用 |
| App Store 审核 | Apple 对音乐 App 审核严格 | 确保版权合规说明 |
| 隐私政策 | 收集用户数据需声明 | 制定隐私政策文档 |

---

## 十一、与桌面端代码的复用统计

| 模块 | 桌面端文件数 | 可直接复用 | 需适配修改 | 需重写 |
|------|------------|-----------|-----------|--------|
| Types | 20 | 18 | 2 (electron.d.ts, audio.d.ts) | 0 |
| API | 16 | 12 | 3 (search, music, musicParser) | 1 (lxMusicStrategy) |
| Store | 17 | 0 | 15 (Pinia→Zustand 语法转换) | 2 (download, localMusic) |
| Services | 10 | 3 (lyricTranslation, SongSourceConfig, CacheManager) | 4 | 3 (audioService, LxMusicSourceRunner, eqService) |
| Hooks | 14 | 5 (纯逻辑类) | 6 | 3 (useZoom, useDownload, MusicHook) |
| Components | ~50+ | 0 | 0 | 全部重写 |
| **合计** | ~127 | **38 (30%)** | **30 (24%)** | **59 (46%)** |

> 约 30% 代码可直接复用，24% 需要适配修改，46% 需要重写（主要是 UI 组件）。
> 但业务逻辑复用率远高于代码复用率 — Store 的状态设计和 Actions 逻辑 80%+ 可复用，只是从 Pinia 语法转为 Zustand 语法。

---

## 🎨 移动端 UI 改良计划

> 参照桌面端 UI 设计风格，对移动端进行全面视觉升级。
> 创建时间：2025-05-17

### 当前问题诊断

| 问题 | 严重程度 | 影响范围 |
|------|---------|---------|
| 使用 Emoji 作为图标（🏠🔍👤⚙️等） | 🔴 严重 | 全局 - 底部Tab、按钮、导航 |
| 播放器界面过于简陋，无渐变背景 | 🔴 严重 | PlayerScreen |
| MiniPlayer 无毛玻璃效果，无精致进度条 | 🟡 中等 | MiniPlayer |
| 部分页面未使用动态主题色 | 🟡 中等 | PlayerScreen、LoginScreen 等 |
| 首页缺少 Hero 区域和现代卡片设计 | 🟡 中等 | HomeScreen |
| 搜索页 Tab 样式原始 | 🟢 轻微 | SearchScreen |
| 设置页/用户页图标用 Emoji 替代 | 🟡 中等 | SettingsScreen、UserScreen |
| 详情页头部缺少渐变效果 | 🟡 中等 | PlaylistDetail、ArtistDetail、AlbumDetail |
| 下载页图标用 Emoji 替代 | 🟢 轻微 | DownloadScreen |

### 改进方案概览

#### 1. 矢量图标替换 (全局)

**问题**：当前所有 Tab 图标和功能按钮使用 Emoji（🏠🔍👤⚙️），在不同设备上显示不一致，无法精确控制颜色和大小。

**方案**：使用 `@expo/vector-icons` 中的 `MaterialCommunityIcons` 替换所有 Emoji。

**映射表**：

| 原 Emoji | 新图标名 | 用途 |
|----------|---------|------|
| 🏠 | `home-variant` | 首页 Tab |
| 🔍 | `magnify` | 搜索 Tab |
| 👤 | `account-circle` | 我的 Tab |
| ⚙️ | `cog` | 设置 Tab |
| 🔀 | `shuffle` | 随机播放 |
| 🔁 | `repeat` | 列表循环 |
| 🔂 | `repeat-once` | 单曲循环 |
| ▶️ | `play` | 播放 |
| ⏸️ | `pause` | 暂停 |
| ⏭️ | `skip-forward` | 下一首 |
| ⏮️ | `skip-previous` | 上一首 |
| ❤️ | `heart` / `heart-outline` | 喜欢 |
| 📋 | `playlist-music` | 播放列表 |
| ⬇️ | `download` / `download-outline` | 下载 |
| 🎵 | `music-note` | 音乐相关 |
| 🎤 | `microphone-variant` | 歌手 |
| 💿 | `disc` | 专辑 |
| 🗑️ | `delete` | 删除 |
| ✏️ | `pencil` | 编辑 |
| 🔙 | `arrow-left` | 返回 |
| ➕ | `plus` | 新增 |
| 🔄 | `refresh` | 刷新 |
| 🔈/🔊 | `volume-low` / `volume-high` | 音量 |
| 🔎 | `magnify` | 搜索输入 |

#### 2. 主题色增强

**问题**：播放器页面需要独立于亮/暗主题的沉浸式背景色，当前缺少相关色值。

**方案**：在 `colors.ts` 的 `LightColors` 和 `DarkColors` 中新增：

```typescript
// 新增字段
playerBg: string;        // 播放器背景（深蓝紫色调，不受亮/暗模式影响）
playerSurface: string;   // 播放器内卡片/表面色
playerText: string;      // 播放器文字色
playerTextSecondary: string; // 播放器次要文字色
```

亮色模式值：`playerBg: '#1a1a2e'`, `playerSurface: '#252540'`
暗色模式值：`playerBg: '#0d0d1a'`, `playerSurface: '#1a1a30'`

#### 3. PlayerScreen 重构

**当前状态**：白色/纯色背景，简单布局，无动画效果。

**改进要点**：
- **沉浸式渐变背景**：使用深蓝紫色调渐变（参考桌面端的深色播放器氛围），基于专辑封面颜色动态取色
- **专辑封面旋转动画**：播放时封面旋转，暂停时停止（参考桌面端旋转唱片效果）
- **精致控制栏**：大尺寸圆形播放/暂停按钮，进度条带圆角和渐变
- **图标全部替换**：播放控制、喜欢、播放列表等图标使用 MaterialCommunityIcons
- **毛玻璃播放列表面板**：播放列表弹出使用半透明毛玻璃效果

#### 4. MiniPlayer 重构

**当前状态**：简单白色横条，无进度指示。

**改进要点**：
- **毛玻璃/半透明背景**：使用 `BlurView` 实现类似桌面端的磨砂效果
- **精致进度条**：底部细线进度条，使用主题色
- **图标替换**：播放/暂停、喜欢等使用矢量图标
- **圆角专辑封面**：小尺寸圆角封面图

#### 5. HomeScreen 改良

**当前状态**：简单列表布局，缺少视觉层次。

**改进要点**：
- **Hero 区域**：顶部问候语 + 个性化推荐卡片，带渐变背景
- **卡片设计**：推荐歌单使用圆角卡片，带阴影/光晕
- **图标替换**：刷新按钮等使用矢量图标
- **分类标签**：使用更现代的胶囊/药丸形标签

#### 6. SearchScreen 改良

**当前状态**：搜索输入框和 Tab 样式原始。

**改进要点**：
- **药丸形 Tab**：搜索分类（歌曲/歌手/专辑/歌单）使用药丸形切换标签
- **图标替换**：搜索图标、热门标签图标等
- **搜索框圆角化**：更现代的搜索输入框样式

#### 7. UserScreen 改良

**当前状态**：简单列表，Emoji 图标。

**改进要点**：
- **用户信息头部**：头像 + 昵称 + 签名，带渐变背景
- **功能列表**：使用 MaterialCommunityIcons 图标 + 右侧箭头
- **主题修复**：确保使用动态主题色

#### 8. SettingsScreen 改良

**当前状态**：Emoji 图标 + 简单列表。

**改进要点**：
- **图标替换**：所有设置项使用 MaterialCommunityIcons
- **分组卡片**：设置项按功能分组，带标题和分隔线
- **Switch 样式**：使用主题色的开关控件

#### 9. 详情页改良 (PlaylistDetail / ArtistDetail / AlbumDetail)

**当前状态**：简单头部信息，无视觉层次。

**改进要点**：
- **渐变头部**：基于封面颜色生成渐变背景
- **图标替换**：播放、喜欢、下载等操作按钮
- **浮动操作按钮**：底部播放全部按钮，带主题色

#### 10. 其他页面改良

- **LoginScreen**：主题色修复，图标替换，更现代的登录界面
- **DownloadScreen**：图标替换，列表项优化
- **PlaylistDrawer**：图标替换，毛玻璃效果增强
- **SongItem**：更精致的列表项，播放中动画指示

### 执行顺序

按影响程度从高到低排列：

1. ✅ 主题色增强（`colors.ts` 新增 `playerBg` 等字段）
2. ✅ MainTabNavigator 图标替换（底部导航最显眼）
3. ✅ MiniPlayer 重构（全局常驻组件，影响最大）
4. ✅ PlayerScreen 重构（核心页面，视觉冲击最强）
5. ✅ HomeScreen 改良（首页体验）
   - ✅ 快捷导航卡片 (3x2)：心动模式/每日推荐/私人FM/排行榜/MV/歌单广场
   - ✅ 固定头部：问候语 + 搜索按钮
   - ✅ 推荐新歌：20首列表 + 歌手名称修复（多级 fallback）
   - ✅ 新碟上架：横向滚动卡片
   - ✅ 私人FM：仅保留卡片入口，点击时动态调用4次API凑约12首歌
6. ⬜ SearchScreen 改良
7. ✅ UserScreen 改良
   - ✅ 渐变头部：背景图(backgroundUrl) + 渐变遮罩 + 头像 + 昵称 + 签名 + 粉丝/关注/等级统计
   - ✅ Tab 切换：创建歌单 / 收藏歌单（segmented control 样式）
   - ✅ 听歌排行：调用 `/user/record` API，显示 Top 10 + 播放次数
   - ✅ 快捷菜单：4 宫格卡片（我喜欢的音乐/最近播放/本地下载/我的电台）
   - ✅ 未登录状态也使用渐变头部 + 登录按钮
   - ✅ 最近播放支持点击播放
   - ✅ 我喜欢的音乐 → 跳转第一个歌单；最近播放 → 滚动到听歌排行
   - ✅ 我的电台 API 已封装（getDjSublist 等），UI 待实现
8. ✅ SettingsScreen 改良
   - ✅ 主题选择器 flexWrap 换行
   - ✅ 狗狗主题选项（🐶暖阳 / 🐶夜汪）
9. ✅ 详情页改良（PlaylistDetail / ArtistDetail / AlbumDetail）
   - ✅ PlaylistDetailScreen：渐变头部（封面背景 + 渐变遮罩 + 信息叠加 + 自定义返回按钮）
   - ✅ AlbumDetailScreen：渐变头部（封面背景 + 渐变遮罩 + 歌手/日期/歌曲数信息叠加 + 自定义返回按钮）
   - ✅ ArtistDetailScreen：自定义返回按钮 + 隐藏默认 header
   - ✅ 三个详情页统一隐藏 Stack Navigator 默认 header，使用自定义渐变头部
10. ⬜ 其他页面（LoginScreen / DownloadScreen / PlaylistDrawer / SongItem）
11. ✅ 狗狗主题系统（DogLightColors / DogDarkColors / 自定义 Tab 图标 / ThemeType 扩展）
12. ✅ 音源解析修复（GDMusic br/source/ID / FallbackApi / LxMusic 连通性检查）
13. ✅ 切歌优化（立即停播 + loading 状态 + MiniPlayer ActivityIndicator）
14. ✅ 首页 logo（top-logo.png）

### 设计参考

- **桌面端设计风格**：深色主题为主，毛玻璃效果，圆角卡片，渐变色运用
- **桌面端播放器**：深色背景 + 旋转唱片封面 + 侧边播放列表
- **桌面端侧边栏**：半透明毛玻璃 + 精致图标 + 分组列表
- **色彩方案**：保持 `#ff3b3b` 主色调，播放器场景使用深蓝紫沉浸式背景

---

## 🔧 移动端 Bug 修复日志

> 记录移动端运行时发现的问题及修复方案
> 更新时间：2026-05-18

### Bug 1：`@expo/vector-icons` 模块找不到

**现象**：TypeScript 编译报错 `找不到模块"@expo/vector-icons"或其相应的类型声明`

**原因**：`@expo/vector-icons` 是 Expo 内置包，但未在 `package.json` 中显式声明为依赖，TypeScript 无法解析类型

**修复**：`npx expo install @expo/vector-icons`，安装了与 SDK 54 兼容的 `~15.0.0` 版本

**涉及文件**：`package.json`

---

### Bug 2：底部 Tab 被虚拟按键手机遮挡

**现象**：全面屏手势手机底部 Tab 距离 home indicator 太近，虚拟按键手机底部 Tab 被系统导航栏遮挡

**原因**：`tabBarStyle` 写死 `paddingBottom: 4` 和 `height: 56`，未考虑设备安全区域

**修复**：
- 引入 `useSafeAreaInsets` 获取底部安全区域高度
- `bottomPadding = Math.max(insets.bottom, 4)` — 全面屏手机取系统安全区域高度（20-34px），虚拟按键手机取最小值 4px
- `tabBarHeight = 52 + bottomPadding` 动态计算
- MiniPlayer 的 `bottom` 也跟随 `tabBarHeight` 动态调整

**涉及文件**：`app/navigation/MainTabNavigator.tsx`

---

### Bug 3：播放器按钮全部失效 + 多点闪退

**现象**：MiniPlayer 和 PlayerScreen 的播放/暂停/上一首/下一首按钮点击无反应，多点两次后 App 闪退

**原因**：
1. `trackPlayerService.skipToNext()` / `skipToPrevious()` 是空函数 (no-op)
2. `togglePlayback()` 在 `soundRef` 为 null 时（App 重启后）直接返回
3. MiniPlayer/PlayerControls 直接调用这些空函数，自然无效果

**修复**：
- `MiniPlayer.tsx` / `PlayerControls.tsx` — 改用 `usePlayer()` hook 的 `togglePlayback`、`next`、`prev`
- `usePlayer.ts` — `togglePlayback` 新增重启场景处理：当 `soundRef` 为 null 但 `playMusic` 存在时，自动重新加载播放
- `usePlayer.ts` — `next`/`prev` 改为 `playlistStore.nextPlay()` → `getCurrentSong()` → `playSong()` 完整流程
- `playlistStore.ts` — `nextPlay`/`prevPlay` 只更新 `playListIndex`，不再设置 `playMusic/isPlay`（由 `usePlayer.playSong()` 统一管理）

**涉及文件**：`app/components/player/MiniPlayer.tsx`、`app/components/player/PlayerControls.tsx`、`app/hooks/usePlayer.ts`、`app/store/playlistStore.ts`

---

### Bug 4：全屏播放器向下折叠闪退

**现象**：全屏播放页面，点击左上角向下折叠按钮或下滑手势时 App 崩溃

**原因**：`GestureDetector` 的 `Gesture.Pan().onEnd()` 回调在 UI 线程执行，直接调用 JS 侧的 `navigation.goBack()` 导致崩溃；`react-native-reanimated` 在 Expo Go 中初始化失败（`installTurboModule` 错误），导致 `runOnJS` 未定义

**修复**：
- 移除 `react-native-reanimated` 的 `Gesture`、`GestureDetector`、`runOnJS` 依赖
- 使用手动 `Animated.timing` 实现下滑关闭动画：点击关闭时先播放 300ms 向下滑出动画，动画结束后再调用 `goBack()`
- 同时解决了 `Cannot read property 'runOnJS' of undefined` 崩溃问题

**涉及文件**：`app/screens/PlayerScreen.tsx`

---

### Bug 5：PlaylistDrawer 歌曲点击不播放

**现象**：播放列表面板中点击歌曲，列表高亮切换了但没有声音

**原因**：`handleSongPress` 只调用了 `setPlayListIndex` + `setPlayMusic` + `setIsPlay` — 只更新了 store，没有调用音频播放

**修复**：改用 `usePlayer().playSong()` 完整播放流程

**涉及文件**：`app/components/player/PlaylistDrawer.tsx`

---

### Bug 6：PlaylistDrawer 未被渲染

**现象**：点击播放列表按钮毫无反应

**原因**：`PlaylistDrawer` 组件写了但没在 `PlayerScreen` 中挂载

**修复**：在 `PlayerScreen` 中添加 `<PlaylistDrawer />` 渲染

**涉及文件**：`app/screens/PlayerScreen.tsx`

---

### Bug 7：播放结束不会自动下一首

**现象**：歌曲播放完毕后停止，不会自动切到下一首

**原因**：`trackPlayerService` 没有监听音频播放结束事件

**修复**：
- `trackPlayerService.ts` — 新增 `onPlaybackEnd` 回调 + 在 `playSong` 中注册 `onPlaybackStatusUpdate` 监听 `didJustFinish`
- `usePlayer.ts` — 注册 `onPlaybackEnd` 回调，歌曲结束自动切下一首；单曲循环模式下重放当前歌曲

**涉及文件**：`app/services/trackPlayerService.ts`、`app/hooks/usePlayer.ts`

---

### Bug 8：进度条不实时更新

**现象**：播放器进度条卡住不动，不会随播放进度实时更新

**原因**：`usePlayer` 用 `setInterval` 每秒轮询 `getCurrentPosition()`，1 秒间隔太慢且不可靠

**修复**：
- `trackPlayerService.ts` — 新增 `onProgressUpdate` 回调，在 `handlePlaybackStatusUpdate` 中每次 `expo-av` 上报播放状态时实时回调 `position` / `duration`
- `usePlayer.ts` — 移除 `setInterval` 轮询，改为注册 `setOnProgressUpdate` 回调，通过 `usePlayerStore.getState()` 直接更新 store

**涉及文件**：`app/services/trackPlayerService.ts`、`app/hooks/usePlayer.ts`、`app/services/index.ts`

---

### Bug 9：全屏播放器折叠过渡动画生硬

**现象**：打开全屏播放器时从底部缓缓升起（流畅），但点击关闭时瞬间消失（生硬）

**原因**：`presentation: 'modal'` + `animation: 'slide_from_bottom'` 只控制打开动画，Android 上 modal 关闭动画缺失

**修复**：手动实现关闭动画——点击关闭时，整个页面通过 `Animated.timing` 从当前位置缓缓向下滑出（300ms），动画结束后再调用 `navigation.goBack()`

**涉及文件**：`app/screens/PlayerScreen.tsx`

---

### Bug 10：Theme 循环依赖警告

**现象**：终端输出 `Require cycle: app/theme/ThemeContext.tsx -> app/theme/index.ts -> app/theme/ThemeContext.tsx`

**原因**：`ThemeContext.tsx` 从 `./index` 导入 `AppTheme` 接口和 `lightTheme/darkTheme`，而 `./index` 又从 `./ThemeContext` 导出

**修复**：
- 新建 `theme/types.ts` 存放 `AppTheme` 接口
- `ThemeContext.tsx` 改为从 `./types` 导入接口，直接创建 theme 对象
- `index.ts` 也从 `./types` 导入后 re-export
- 依赖链变为单向：`ThemeContext → types`，`index → types + ThemeContext`

**涉及文件**：`app/theme/types.ts`（新建）、`app/theme/ThemeContext.tsx`、`app/theme/index.ts`

---

### Bug 11：`initialScrollIndex` 越界闪退

**现象**：播放列表为空或索引越界时，`FlatList` 的 `initialScrollIndex` 导致崩溃

**修复**：添加 `Math.min(playListIndex, Math.max(playList.length - 1, 0))` 边界保护

**涉及文件**：`app/components/player/PlaylistDrawer.tsx`

---

### Bug 12：推荐新歌不显示歌手名称

**现象**：首页推荐新歌列表只显示歌名，歌手显示为"未知歌手"

**原因**：`/personalized/newsong` API 返回的歌曲数据中，歌手信息在 `song.artists` 字段，而非顶层 `ar` 字段

**修复**：添加多级 fallback 链：`song.ar || song.song?.artists || song.artists`

**涉及文件**：`app/screens/HomeScreen.tsx`

---

### Bug 13：播放列表播完不自动下一首 + 播放模式异常

**现象**：歌曲播完不自动下一首；顺序模式末尾重复播放最后一首；心动模式无特殊逻辑

**修复**：`onPlaybackEnd` 重写为 async + 最多5次失败跳过；顺序模式末尾停止播放；心动模式接近末尾时调用 `getIntelligenceList` API 追加推荐

**涉及文件**：`app/hooks/usePlayer.ts`、`app/store/playlistStore.ts`

---

### Bug 14：快速切歌导致两首歌同时播放

**现象**：歌曲刚开始播放时快速点击"下一首"，两首歌同时发声

**修复**：双层 generation counter（`trackPlayerService.ts` 模块级 + `usePlayer.ts` useRef），每次 `playSong` 递增，每个 `await` 后检查是否过期

**涉及文件**：`app/services/trackPlayerService.ts`、`app/hooks/usePlayer.ts`

---

### Bug 15：首页模块布局调整

**修复**：
1. "我的收藏" → "每日推荐"（`/recommend/songs` API）
2. 推荐新歌 20 首
3. 保留"新碟上架"模块（`/album/newest` API，横向滚动卡片）
4. 私人FM 仅保留卡片入口（点击时并发4次 `/personal_fm` 凑约12首歌）
5. 快捷导航重排序：行1=心动模式/每日推荐/私人FM，行2=排行榜/MV/歌单广场

**涉及文件**：`app/screens/HomeScreen.tsx`

---

### Bug 16：UserScreen 用户页面过于简陋

**现象**：移动端用户页面只有简单的头像+昵称+VIP徽章+退出按钮，没有背景图、用户统计、Tab切换、听歌排行等功能

**修复**：
1. 渐变头部：背景图(backgroundUrl) + 渐变遮罩 + 头像 + 昵称 + 签名 + 粉丝/关注/等级统计行
2. Tab 切换：创建歌单 / 收藏歌单（segmented control），按 `subscribed` 字段过滤
3. 听歌排行：调用 `/user/record` API，Top 10 + 播放次数
4. 快捷菜单：4 宫格卡片替代原来的列表菜单
5. 最近播放支持点击播放
6. 调用 `/user/detail` API 获取用户等级
7. 未登录状态也使用渐变头部 + 登录按钮

**涉及文件**：`app/screens/UserScreen.tsx`

---

### Bug 17：音源解析 422 错误（GDMusic / FallbackApi）

**现象**：GDMusic 策略（joox/tidal/netease）和 FallbackApi 全部返回 422 错误，灰色歌曲无法播放

**原因**（对比桌面端发现多处参数不一致）：
1. GDMusicStrategy `br` 参数传了 `'320k'`，桌面端用 `'999'`（数字格式）
2. GDMusicStrategy URL 步骤的 `source` 传了原始 source（如 netease），但应传搜索结果的 `firstResult.source`（如 joox）
3. GDMusicStrategy 用了 `matched.url`，但应使用 `matched.id`（gdstudio 的 ID 不是网易云 ID）
4. FallbackApiStrategy 直接把网易云 song ID 传给 gdstudio 的 URL 端点（gdstudio ID 是自己的搜索结果 ID）
5. LxMusic 公共 API 已宕机，但策略仍等待 10s 超时

**修复**：
- GDMusicStrategy: `br='999'`、使用 `firstResult.source` 而非原始 source、只用 `firstResult.id`、手动拼接 URL（`encodeURIComponent` 代替 axios `params` 对象）
- FallbackApiStrategy: 改为完整 search→get URL 流程
- LxMusicStrategy: 添加 3s 连通性检查，失败直接跳过

**涉及文件**：`app/services/musicParserService.ts`

---

### Bug 18：切歌时旧歌不停，需等新歌解析完毕才切换

**现象**：播放 A 歌时点击 B 歌，A 歌继续播放直到 B 歌 URL 解析完成后才切过去，体验差

**修复**：
- `trackPlayerService.ts` — 新增 `fadeOutAndPause()` 立即停止当前音频
- `usePlayer.ts` — 切歌时立即调用 `fadeOutAndPause()`，设置 `isLoading(true)`，清空 `playMusicUrl`
- `playerStore.ts` — 新增 `isLoading` 状态 + `setIsLoading` action
- `MiniPlayer.tsx` — 加载中显示 `ActivityIndicator` 替代播放/暂停图标

**涉及文件**：`app/services/trackPlayerService.ts`、`app/hooks/usePlayer.ts`、`app/store/playerStore.ts`、`app/components/player/MiniPlayer.tsx`

---

### Bug 19：首页顶部 logo 未添加

**修复**：在 HomeScreen 头部问候语左侧添加 `top-logo.png` 图片

**涉及文件**：`app/screens/HomeScreen.tsx`

---

### Bug 20：UserScreen 快捷菜单卡片点击无响应

**现象**："我喜欢的音乐"和"我的电台"卡片点击无反应

**修复**：
- "我喜欢的音乐" — 跳转到用户第一个歌单（网易云默认第一个就是"我喜欢的音乐"歌单）
- "最近播放" — 自动滚动到页面下方的"听歌排行"区域
- "我的电台" — API 层已就绪（新增 `getDjSublist`、`getDjProgram`、`getDjDetail`、`getRecentDj`），UI 暂保留"开发中"提示

**涉及文件**：`app/screens/UserScreen.tsx`、`app/api/user.ts`

---

### Bug 21：设置页主题选择器一行显示不全

**现象**：5 个主题选项在一行内显示不全，被截断

**修复**：`selectorContainer` 添加 `flexWrap: 'wrap'`，允许换行显示

**涉及文件**：`app/screens/SettingsScreen.tsx`

---

### Bug 22：狗狗主题底部 Tab 图标显示不出来

**现象**：狗狗主题下底部 Tab 图标不可见

**原因**：
1. 图片文件过大（2-3MB，tab 图标应 96x96px / 5-20KB），可能导致加载失败
2. `tintColor` 对自定义图片着色为单色，彩色图标被染成纯色后与背景融为一体

**修复**：移除 `tintColor`，改为使用 `opacity` 区分选中/未选中状态（选中 1.0，未选中 0.5），保留图标原始颜色

**涉及文件**：`app/navigation/MainTabNavigator.tsx`

---

## 🐶 狗狗主题系统

> 更新时间：2026-05-18

### 新增内容

#### 1. 主题色系（`app/theme/colors.ts`）

| 主题 | 主色 | 背景 | 文字 | 说明 |
|------|------|------|------|------|
| 🐶暖阳 (dog-light) | `#d4913d` 金棕 | `#fdf8f0` 暖米 | `#4a3520` 深巧克力 | 温暖阳光风格 |
| 🐶夜汪 (dog-dark) | `#e8b36a` 亮金 | `#1c1510` 暖棕黑 | `#f0e6d6` 暖白 | 夜间暖光风格 |

#### 2. 主题切换（`app/store/settingsStore.ts`）

`ThemeType` 扩展为：`'light' | 'dark' | 'system' | 'dog-light' | 'dog-dark'`

#### 3. 底部 Tab 自定义图标（`app/navigation/MainTabNavigator.tsx`）

- 狗狗主题时使用 `Image` 组件渲染自定义图标（`assets/dog-theme/tab_*.png`）
- 非狗狗主题使用 `MaterialCommunityIcons`
- 图标文件路径：`assets/dog-theme/tab_home.png`、`tab_search.png`、`tab_user.png`、`tab_settings.png`

#### 4. 注意事项

- 自定义 Tab 图标建议尺寸 **96x96px** 或 **128x128px**，文件大小 **5-20KB**
- 当前图标文件较大（2-3MB），建议用 tinypng.com 压缩
- 添加新图片后需重启 Metro：`npx expo start --clear`

---

## Phase 8：音源解析修复 + 切歌优化 + 狗狗主题 + UI 完善 ✅ 已完成

> 完成时间：2026-05-18

### 8.1 音源解析 422 错误修复

| 任务 | 说明 | 实现文件 |
|------|------|---------|
| 修复 GDMusicStrategy | br 参数、source 传递、ID 使用、URL 拼接方式 | `services/musicParserService.ts` |
| 修复 FallbackApiStrategy | 从直接 ID→URL 改为 search→URL 完整流程 | `services/musicParserService.ts` |
| 优化 LxMusicStrategy | 添加 3s 连通性检查，API 宕机时快速跳过 | `services/musicParserService.ts` |

### 8.2 切歌体验优化

| 任务 | 说明 | 实现文件 |
|------|------|---------|
| 立即停止当前音频 | `fadeOutAndPause()` 函数 | `services/trackPlayerService.ts` |
| 加载状态管理 | `isLoading` state + `setIsLoading` action | `store/playerStore.ts` |
| 切歌立即响应 | 调用 `fadeOutAndPause()` + 设置 loading + 清空 URL | `hooks/usePlayer.ts` |
| MiniPlayer 加载指示 | 加载中显示 ActivityIndicator | `components/player/MiniPlayer.tsx` |

### 8.3 狗狗主题

| 任务 | 说明 | 实现文件 |
|------|------|---------|
| 狗狗色系定义 | DogLightColors、DogDarkColors | `theme/colors.ts` |
| 主题上下文支持 | isDog 标志 + 狗狗主题对象 | `theme/ThemeContext.tsx` |
| ThemeType 扩展 | 新增 'dog-light' / 'dog-dark' | `store/settingsStore.ts` |
| 设置页主题选项 | 🐶暖阳、🐶夜汪选项 | `screens/SettingsScreen.tsx` |
| 自定义 Tab 图标 | Image 组件渲染自定义图标 | `navigation/MainTabNavigator.tsx` |

### 8.4 UI 完善

| 任务 | 说明 | 实现文件 |
|------|------|---------|
| 首页顶部 logo | top-logo.png 放在问候语左侧 | `screens/HomeScreen.tsx` |
| 我喜欢的音乐 | 跳转到用户第一个歌单 | `screens/UserScreen.tsx` |
| 最近播放 | 点击滚动到听歌排行区域 | `screens/UserScreen.tsx` |
| 电台 API | getDjSublist / getDjProgram / getDjDetail / getRecentDj | `api/user.ts` |
| 设置主题换行 | selectorContainer 添加 flexWrap | `screens/SettingsScreen.tsx` |
| 狗狗图标修复 | 移除 tintColor，使用 opacity 区分选中 | `navigation/MainTabNavigator.tsx` |

**验收标准**：灰色歌曲能解析播放，切歌立即响应，狗狗主题正常显示
