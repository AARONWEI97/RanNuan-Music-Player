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
- 暗色主题 + 狗狗主题（5种主题模式）
- 完整的错误处理与性能优化

### 1.2 核心原则

| 原则 | 说明 |
|------|------|
| **后端 API 零改动** | netease-cloud-music-api 完全复用，仅需远程部署 |
| **业务逻辑最大化复用** | API 层、类型定义、Store 逻辑从 Vue/Pinia 迁移到 React/Zustand |
| **Electron 依赖全部替换** | IPC 通道、electron-store、桌面歌词等用移动端原生方案替代 |
| **渐进式开发** | 先跑通核心播放链，再逐步添加增强功能 |

### 1.3 项目状态

**10 个开发阶段已完成** ✅

| Phase | 状态 | 核心功能 |
|-------|------|---------|
| Phase 1 | ✅ | 项目初始化 + 核心播放链 |
| Phase 2 | ✅ | 首页 + 搜索 + 登录 |
| Phase 3 | ✅ | 歌单/专辑/歌手详情 + 收藏 + 播放模式 |
| Phase 4 | ✅ | 歌词系统（LRC/YRC/翻译/滚动/点击跳转） |
| Phase 5 | ✅ | 音源解析 + 灰色歌曲解锁（5 策略引擎） |
| Phase 6 | ✅ | 下载管理 + 离线播放 |
| Phase 7 | ✅ | 暗色主题 + 错误处理 + EAS Build |
| Phase 8 | ✅ | 音源解析修复 + 切歌优化 + 狗狗主题 + UI 完善 |
| Phase 9 | ✅ | **播放器架构重构（原生队列模式）— 彻底解决后台播放切歌失败、锁屏切歌、通知栏控制延迟等问题** |
| Phase 10 | ✅ | **功能补齐（MV播放/历史/收藏/评论增强/歌单编辑/本地音乐/热力图/三点菜单）** |
| Phase 11 | 🚧 | **API 功能补齐（18个模块）— 11.1 ✅ 11.2 ✅ 11.3 ⬜** |
| Phase 12 | ✅ | **播放模块终极修复（12项 — 音源解析、锁屏切歌、错误重试、双重触发等）** |
| Phase 13 | ✅ | **歌手详情页 UI 修复 + MV 播放音频冲突（4项 — 布局/滚动/3列/音频重叠）** |

### 1.4 测试说明

#### API 服务配置

移动端使用远程公网 API 服务器，无需本地部署：

| 服务 | 地址 | 用途 |
|------|------|------|
| NeteaseCloudMusicApiEnhanced | `http://139.9.223.233:3000` | 歌曲信息、歌单、解灰等主 API |
| GD 音乐台 | `https://music-api.gdstudio.xyz` | 备用音源（fallback） |
| 服务器状态页 | `https://status.beta-next.icu/status/ncm` | 查看服务是否在线 |
| 解灰测试页 | `http://139.9.223.233:3000/unblock_test.html` | 手动测试歌曲解灰 |

**可用脚本**：

| 命令 | 作用 |
|------|------|
| `npm start` | 启动 Expo（Development Build） |
| `npm run web` | 启动 Expo Web |
| `npx expo run:android` | 构建 Android Development Build APK |

> ⚠️ **不再需要本地运行 API**。`DEFAULT_API_URL` 已配置为公网服务器，打包后可直接安装使用，无需任何后端部署。

#### 测试方式

| 平台 | 命令 | 说明 |
|------|------|------|
| Web | `npm run dev:web` | 同时启动 API + Web |
| Android 真机 | 终端1: `npm run api` + 终端2: `npm start` | Development Build（需 USB 连接 + 同 WiFi） |

> ⚠️ **Expo Go 已不再使用**。项目已迁移至 Development Build，支持 `react-native-track-player` 等原生模块。
> 手机需安装 Development Build APK（`npx expo run:android`），然后通过 `npm start`（即 `expo start --dev-client --clear`）启动 Metro。

#### Web 平台兼容性

- `setNativeProps` 在 Web 不可用，已添加 `Platform.OS !== 'web'` 检测
- 音频播放使用 `react-native-track-player`（需 Development Build），Web 端播放受限

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

#### 技术选型：react-native-track-player ✅ 已迁移

项目已从 `expo-av` 迁移到 `react-native-track-player`（RNTP），支持后台播放、通知栏控制、iOS 灵动岛等高级功能。需 Development Build。

| 功能 | react-native-track-player（当前） |
|------|----------------------------------|
| 前台播放 | ✅ |
| 后台播放 | ✅ 原生前台服务保活 |
| 通知栏控制 | ✅ |
| 锁屏控制 | ✅ |
| 播放速率 | ✅ |
| 均衡器 | ✅ (Android) |
| iOS 灵动岛 | ✅ Now Playing Info Center |

#### 核心架构（三文件协作）

```
┌─────────────────────────────────────────────────────────────┐
│                    usePlayer.ts (Hook)                       │
│  • 播放控制入口：playSong / next / prev / seekTo            │
│  • 预加载机制：preloadNextSongIfNeeded()                     │
│  • 确定性随机索引：_g.__nextShuffleIndex                     │
│  • AppState 监听：active 时 sync + 处理 pending action       │
│  • Generation counter：防止过期异步操作                      │
├─────────────────────────────────────────────────────────────┤
│              trackPlayerService.ts (服务层)                   │
│  • TrackPlayer 原生方法封装                                  │
│  • 事件监听：PlaybackState / ProgressUpdated / Error         │
│  • 播放结束检测：triggerPlaybackEnd() + 60s 兜底 timer      │
│  • resetPlaybackEndState()：新歌播放时主动重置               │
│  • Remote 事件回调分发（通知栏按钮）                         │
├─────────────────────────────────────────────────────────────┤
│            playbackService.ts (Headless JS)                   │
│  • Android 后台播放服务（独立 JS 上下文）                    │
│  • RemotePlay/Pause：直接调用 TrackPlayer.play()/pause()    │
│  • RemoteNext：预加载缓存 → load() 直接切歌                 │
│  • 跨上下文通信：AsyncStorage pending_remote_action           │
└─────────────────────────────────────────────────────────────┘
```

#### 关键设计模式

| 模式 | 说明 | 涉及文件 |
|------|------|---------|
| **Generation Counter** | 每次 playSong 递增 `_g.__playGeneration`，每个 await 后检查是否过期，防止竞态 | `usePlayer.ts` / `trackPlayerService.ts` |
| **全局标志防 HMR 重置** | `_g.__*` 系列变量存于 global 对象，热更新不丢失 | 所有播放模块 |
| **isHandlingEnd 统一** | `_g.__TP_IS_HANDLING_END` 被 usePlayer 和 trackPlayerService 共享，防止两者不同步导致级联切歌 | `usePlayer.ts` / `trackPlayerService.ts` |
| **确定性随机索引** | `_g.__nextShuffleIndex` 在预加载时生成，next()/RemoteNext/_doNextPlay 统一消费，确保预加载命中率 100% | `usePlayer.ts` / `playlistStore.ts` |
| **预加载 + AsyncStorage 同步** | 预加载 URL 同时写入 `_g.__preloadedNextSong`（内存）和 AsyncStorage（跨上下文），PlaybackService headless 上下文可读取 | `usePlayer.ts` / `playbackService.ts` |
| **sync_next 避免重复切歌** | PlaybackService 命中缓存后写 `action: 'sync_next'`，主 app 只同步 zustand 不触发 doPlaySong | `playbackService.ts` / `usePlayer.ts` |
| **force 预加载** | background 事件调用 `preloadNextSongIfNeeded(force=true)` 绕过 60s 剩余时间限制 | `usePlayer.ts` |

#### 与桌面端 audioService 的对比

| 功能 | 桌面端 (HTMLAudioElement) | 移动端 (RNTP) |
|------|--------------------------|---------------|
| 后台播放 | Electron 窗口常驻 | ✅ 原生前台服务 |
| 系统媒体控制 | MediaSession API | ✅ TrackPlayer 内置 |
| 均衡器 | BiquadFilterNode (Web Audio) | ✅ TrackPlayer EQ (Android) |
| 音频输出设备 | setSinkId | 系统级蓝牙/扬声器切换 |
| 播放速率 | audio.playbackRate | TrackPlayer.setRate() |
| 预加载 | 临时 Audio 元素 | ✅ JS 层预加载 + AsyncStorage 同步 |
| 切歌机制 | audio.src 替换 | TrackPlayer.load() 替换 |

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

### Phase 9：播放器架构重构（原生队列模式）✅ 已完成

**目标**：彻底解决后台播放切歌失败问题，从根本上重构播放器架构

#### 9.0 架构重构背景

原架构（单曲 `load()` 模式）的根本缺陷：

- 使用 `TrackPlayer.load()` 把 RNTP 当作"单曲播放器"，每次切歌都在 JS 层监听 `Ended` 事件再手动 `load()` 新歌
- Android 锁屏时系统会冻结后台 JS 线程，导致 `Ended` 事件无法处理，切歌失败
- 为解决此问题引入 PlaybackService headless 上下文兜底，但两个上下文竞争同一 `TrackPlayer.load()` 导致双重加载卡住
- 每次修一个 bug 引入新 bug，根本原因是架构与 Android 系统后台限制冲突

**新架构（原生队列模式）**：

| 对比 | 旧架构 | 新架构 |
|------|--------|--------|
| 切歌方式 | JS 层监听 Ended → 手动 load() | 原生队列自动切歌 |
| 后台切歌 | 依赖 JS 线程不被冻结 | 原生层处理，零依赖 JS |
| 互斥锁 | 需要复杂的双向互斥 | 不需要 |
| 代码复杂度 | ~500 行切歌逻辑 | ~50 行 |
| 可靠性 | 每修一个 bug 引入新 bug | 原生层保证 |

#### 9.0 新架构核心设计

**原理**：始终保持 RNTP 原生队列里有 `[当前歌曲, 下一首歌曲]` 两首，让原生层自动切歌。

```
播放歌曲：reset() → add(currentTrack) → play()
预加载完成：addNextToQueue(nextTrack)  → 原生队列变为 [current, next]
原生自动切歌：PlaybackActiveTrackChanged 触发 → JS 层只同步 zustand 状态 + 预加载下下首
后台切歌：完全由原生层处理，不依赖 JS 线程
```

**删除的旧机制**：
- `triggerPlaybackEnd` / `onPlaybackEnd` / `doNextPlayOnEnd` / `_doNextPlay` 整个自动切歌链
- `_g.__TP_IS_HANDLING_END` / `_g.__PB_HANDLING_END` 所有互斥锁
- `endPollTimer` 轮询检测
- PlaybackService 里的 `Ended` 处理和 AsyncStorage 跨上下文通信
- `PENDING_REMOTE_ACTION_KEY` / `sync_next` / `auto_next` 机制

**新增的核心机制**：

| 机制 | 说明 | 涉及文件 |
|------|------|---------|
| `addNextToQueue()` | 预加载完成后直接加入原生队列，原生层自动播放 | `trackPlayerService.ts` |
| `clearNextInQueue()` | 播放模式切换时清除队列中的 next track，触发重新预加载 | `trackPlayerService.ts` / `playlistStore.ts` |
| `ActiveTrackChanged` 回调 | 原生切歌后同步 zustand 状态 + 预加载下下首 | `trackPlayerService.ts` / `usePlayer.ts` |
| `onPlaybackEnd` fallback | 仅在预加载未完成（队列无下一首）时触发，作为兜底 | `usePlayer.ts` |
| `__isActiveTrackSyncing` | 原生切歌同步期间阻止 useEffect 误判为手动切歌 | `usePlayer.ts` |
| `Promise.all` 并发请求 | `addNextToQueue` 和 `clearNextInQueue` 用 Promise.all 减少竞态窗口 | `trackPlayerService.ts` |
| 播放模式切换清队列 | `togglePlayMode`/`setPlayMode` 调用 `clearNextInQueue` + 重置 shuffle 索引 | `playlistStore.ts` |

**RemotePrevious 处理**：
- 队列中没有上一首，`skipToPrevious()` 会失败
- PlaybackService 失败时写入 `pending_remote_action='prev'` 到 AsyncStorage
- 主 app 恢复前台时读取并执行

#### 9.0 任务清单

| 任务 | 说明 | 实现文件 | 状态 |
|------|------|---------|:---:|
| playSong 改为 reset+add+play | 替代 load()，建立原生队列基础 | `trackPlayerService.ts` | ✅ |
| addNextToQueue 实现 | 预加载完成后加入原生队列，含 alreadyInQueue 去重检查 | `trackPlayerService.ts` | ✅ |
| clearNextInQueue 实现 | 播放模式切换时清除 next track | `trackPlayerService.ts` | ✅ |
| ActiveTrackChanged 事件处理 | 原生切歌后同步 zustand + 预加载下下首 | `trackPlayerService.ts` / `usePlayer.ts` | ✅ |
| onPlaybackEnd fallback | 队列无下一首时的 JS 兜底，含连续失败保护 | `usePlayer.ts` | ✅ |
| 预加载直接入队 | preloadNextSongIfNeeded 完成后调用 addNextToQueue | `usePlayer.ts` | ✅ |
| 播放模式切换清队列 | togglePlayMode/setPlayMode 调用 clearNextInQueue + 重置索引 | `playlistStore.ts` | ✅ |
| next() 优先 skipToNext | 队列有下一首时直接 skip，无则 fallback 手动切歌 | `usePlayer.ts` | ✅ |
| RemotePrevious pending action | PlaybackService skipToPrevious 失败时写 AsyncStorage | `playbackService.ts` | ✅ |
| PlaybackService 简化 | 删除所有 Ended 处理和跨上下文通信，只保留 Remote 事件 | `playbackService.ts` | ✅ |
| AppKilledPlaybackBehavior | 配置 App 被杀死后继续播放 | `trackPlayerService.ts` | ✅ |
| __isActiveTrackSyncing 同步清除 | 在 preloadAndEnqueueNext 前同步清除标志，避免 timer 在 JS 冻结时失效 | `usePlayer.ts` | ✅ |
| next()/onPlaybackEnd 先更新 ID | setPlayListIndex 前先更新 __currentPlayingSongId，避免 useEffect 误判 | `usePlayer.ts` | ✅ |

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
| Node.js | 22+ | 推荐 v22+ |
| Android Studio | 最新 | Android SDK + 模拟器（安装到任意盘均可） |
| JDK | 17 | Android 构建（Gradle foojay 插件自动下载） |
| Android SDK | API 34+ | 通过 Android Studio SDK Manager 安装 |

> ⚠️ **Expo Go 不再使用**。项目已迁移至 Development Build 模式。

### 9.2 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/AARONWEI97/RanNuan-Music-Player.git
cd RanNuan-Music-Player

# 2. 安装依赖
npm install

# 3. 构建 Development Build APK（首次或原生代码变更后需要）
npx expo run:android

# 4. 日常开发（两个终端）
# 终端1：启动 API 服务
npm run api

# 终端2：启动 Metro（自动 dev-client + clear）
npm start
```

#### 开发环境搭建（从零开始）

1. **安装 Android Studio** → 下载 Android Studio Panda 4+
   - 安装目录可自定义（如 D 盘），不影响使用
   - 安装类型选 "Standard" 即可
   - SDK Manager 中确保安装了 Android 14 (API 34)

2. **配置环境变量**：
   ```cmd
   setx JAVA_HOME "D:\Android Studio\jbr"
   setx ANDROID_HOME "C:\Users\<你的用户名>\AppData\Local\Android\Sdk"
   ```
   > 重新打开终端后生效

3. **手机设置**：
   - USB 连接电脑，开启文件传输模式
   - 开启开发者模式 + USB 调试（三星：设置 → 关于手机 → 软件信息 → 连续点击"编译编号"7次）
   - 确认 `adb devices` 能检测到设备

4. **构建 Dev Build**：
   ```cmd
   npx expo run:android
   ```
   首次构建约 5-10 分钟，成功后 APK 自动安装到手机

5. **日常开发**：
   - 终端1：`npm run api`
   - 终端2：`npm start`
   - 手机打开 App 即可热更新

### 9.3 调试工具

| 工具 | 用途 |
|------|------|
| Development Build | 手机真机开发调试（替代 Expo Go） |
| React DevTools | 组件树检查 |
| Chrome DevTools | 远程调试 JS |
| `adb logcat *:S ReactNative:V ReactNativeJS:V` | 手机端错误日志实时输出到电脑终端 |

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

> ⚠️ SDK 54 中 `@expo/metro-config` 已被 `@expo/metro` 替代，需使用 `@expo/metro/metro-config` 导入。
> 纯 React Native 项目使用 `@react-native/metro-config`，Expo 项目必须使用 `@expo/metro/metro-config`。

```js
const { getDefaultConfig, mergeConfig } = require('@expo/metro/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const BLOCKED_MODULES = [
  '@react-native/debugger-frontend',
  'web-streams-polyfill',
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
> 更新时间：2026-05-19

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

### Bug 7：播放结束不会自动下一首（⚠️ 已被 Bug 23 完整修复取代）

**现象**：歌曲播放完毕后停止，不会自动切到下一首

**原因**：`trackPlayerService` 没有监听音频播放结束事件

**初始修复**（不完整）：新增 `onPlaybackEnd` 回调 + `didJustFinish` 监听，但在部分设备上 `didJustFinish` 不触发，且 `useEffect` 清理函数会清除回调，导致问题依旧。完整修复见 Bug 23。

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

### Bug 13：播放列表播完不自动下一首 + 播放模式异常（⚠️ 已被 Bug 23 完整修复取代）

**现象**：歌曲播完不自动下一首；顺序模式末尾重复播放最后一首；心动模式无特殊逻辑

**初始修复**：`onPlaybackEnd` 重写为 async + 最多5次失败跳过；顺序模式末尾停止播放；心动模式接近末尾时调用 `getIntelligenceList` API 追加推荐。但核心问题（回调被清除、`didJustFinish` 不可靠）未解决，完整修复见 Bug 23。

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

### Bug 23：歌曲播放结束不自动下一首（根本修复）🔥重大

**现象**：歌曲播放完毕后完全停止，不自动切到下一首。终端日志中无 `[TrackPlayer]` 或 `[Player]` 相关输出。

**根因分析**（3 层问题叠加）：

1. **expo-av `didJustFinish` 事件不可靠**：在部分 Android 设备上 `didJustFinish` 事件根本不触发，之前添加的 `onPlaybackStatusUpdate` 回调中的 fallback 检测也依赖该回调，同样不触发
2. **`useEffect` 清理函数清空回调**：`usePlayer.ts` 中 `useEffect` 的清理函数 `setOnPlaybackEnd(null)` 在组件重渲染或卸载时把回调清掉了。多个组件调用 `usePlayer()` 时互相覆盖，最后一个卸载时置空，导致歌曲结束时 `onPlaybackEndCallback === null`
3. **`playSong` 不返回成功/失败**：自动下一首逻辑无法判断播放是否真正开始，用 `isPlay` 状态检查不可靠（异步状态可能还没更新）

**修复方案**（参照桌面端 `AlgerMusicPlayer` 的 `MusicHook.ts` + `playlist.ts` + `playbackController.ts`）：

#### 修复 1：4 层歌曲结束检测（`trackPlayerService.ts`）

| 层级 | 检测机制 | 可靠性 | 说明 |
|------|---------|--------|------|
| 1 | `didJustFinish` 事件 | 部分设备不可靠 | expo-av 官方 API |
| 2 | `position ≈ duration && !isPlaying` | 依赖回调 | 状态回调 fallback |
| 3 | `position >= duration` | 依赖回调 | 兜底检测 |
| 4 | **定时轮询**（新增） | **最可靠** | 每 3s 主动 `getStatusAsync()`，不依赖回调 |

轮询智能频率：歌曲前 80% 每 3 秒检查，进度超 80% 后切换到每 1 秒（通过 `handlePlaybackStatusUpdate` 中的进度回调自动提速）。

#### 修复 2：回调永不被清除（`usePlayer.ts`）

```typescript
// 之前（有 bug）：useEffect 清理会清除回调
useEffect(() => {
  setOnPlaybackEnd(() => { /* ... */ });
  return () => { setOnPlaybackEnd(null); }; // ← 清空了回调！
}, [replayMusic, nextPlayOnEnd]);

// 修复后（ref 模式）：只注册一次，永不清理
const onPlaybackEndHandlerRef = useRef<(() => void) | null>(null);
onPlaybackEndHandlerRef.current = () => { /* 最新逻辑 */ };

useEffect(() => {
  setOnPlaybackEnd(() => {
    onPlaybackEndHandlerRef.current?.(); // 通过 ref 间接调用
  });
  // 故意不返回清理函数——回调必须一直存在
}, []);
```

#### 修复 3：`playSong` 返回 `boolean`（`usePlayer.ts`）

```typescript
// 之前：不返回值，无法判断成功/失败
const playSong = useCallback(async (song: SongResult) => { /* ... */ }, []);

// 修复后：返回是否成功播放
const playSong = useCallback(async (song: SongResult): Promise<boolean> => {
  // ... 正常路径 ...
  return true;  // 成功
  // ... 失败路径 ...
  return false; // 失败（无 URL、被新操作取代、异常）
}, [/* ... */]);
```

#### 修复 4：自动下一首逻辑重写（`usePlayer.ts`）

参照桌面端的 `nextPlayOnEnd` + `_nextPlay` + `replayMusic` 模式：

| 功能 | 实现方式 | 参照桌面端 |
|------|---------|-----------|
| 单曲循环重试 | `replayMusic()` — 最多 3 次重试，失败后跳到下一首 | `MusicHook.replayMusic()` |
| 自动下一首 | `_nextPlay(retry, autoEnd)` — 失败重试 1 次，再失败跳下一首 | `playlist._nextPlay()` |
| 连续失败保护 | `consecutiveFailCountRef` — 最多连续 5 首失败后停止 | `playlist.consecutiveFailCount` |
| 顺序模式末尾 | `autoEnd=true` 时停止播放，`autoEnd=false` 时循环回第一首 | 桌面端 `nextPlayOnEnd` |
| 被新操作取代 | 检查 `playMusic.id !== nextSong.id`，静默退出 | 桌面端 `playTrack` 竞态处理 |

**涉及文件**：`app/services/trackPlayerService.ts`、`app/hooks/usePlayer.ts`

---

### Bug 24：语言选择选项移除

**说明**：国际化功能不完善（英文翻译不全），移除设置页的语言选择器，统一使用中文。

**修改**：
- 移除 `SettingsScreen.tsx` 中的 `LANGUAGE_OPTIONS` 常量、`language`/`setLanguage` 状态、`handleLanguageChange` 回调、语言选择 UI
- 移除 `changeLanguage` 导入
- `useTranslation` 保留（Tab 标题等仍使用 i18n key）

**涉及文件**：`app/screens/SettingsScreen.tsx`

---

### Bug 25：UserScreen `??` 和 `||` 混用语法错误

**现象**：`SyntaxError: Nullish coalescing operator(??) requires parens when mixing with logical operators`

**原因**：`followedCount || profile?.profile?.followeds ?? profile?.followeds ?? 0` 中 `||` 和 `??` 混用未加括号

**修复**：统一使用 `||` 运算符

**涉及文件**：`app/screens/UserScreen.tsx`

---

### Bug 26：UserScreen "听歌排行"标题重复

**现象**：本地播放历史和网易云听歌排行区域标题都叫"听歌排行"

**修复**：本地播放历史区域标题改为"最近播放"

**涉及文件**：`app/screens/UserScreen.tsx`

---

### Bug 27：metro.config.js 导致 `.virtual-metro-entry` 找不到

**现象**：Development Build APK 安装成功，但启动后红屏报错 `Unable to resolve module ./.expo/.virtual-metro-entry`

**原因**：`metro.config.js` 使用了 `@react-native/metro-config`（纯 RN 项目的 Metro 配置），不认识 Expo 的虚拟入口文件。Expo 项目必须使用 `@expo/metro/metro-config`。

**修复**：
- 将 `require('@react-native/metro-config')` 改为 `require('@expo/metro/metro-config')`
- SDK 54 中 `@expo/metro-config` 已被 `@expo/metro` 替代，正确导入路径为 `@expo/metro/metro-config`
- 同时从 `BLOCKED_MODULES` 中移除 `react-native-track-player`（Dev Build 已支持原生模块）

**涉及文件**：`metro.config.js`

---

### Bug 28：Kotlin 2.1.20 编译错误（react-native-track-player）

**现象**：`npx expo run:android` 构建失败，`MusicModule.kt` 第 548 行和 588 行报 `Type mismatch: inferred type is Bundle? but Bundle was expected`

**原因**：`react-native-track-player` v4.1.2 的 Kotlin 代码未适配 Kotlin 2.1.20 的严格空安全检查，`arguments?.bundle` 返回 `Bundle?` 但被当作 `Bundle` 使用。

**修复**：在 `node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt` 中添加 `!!` 非空断言：
- 第 548 行：`arguments?.bundle` → `arguments?.bundle!!`
- 第 588 行：`arguments?.bundle` → `arguments?.bundle!!`

> ⚠️ **此补丁在 node_modules 中，`npm install` 后会被覆盖**。需要添加 postinstall 脚本或使用 patch-package 持久化。

**涉及文件**：`node_modules/react-native-track-player/.../MusicModule.kt`（需持久化方案）

---

### Bug 29：Gradle 找不到 JDK 17

**现象**：构建时报错 `Unable to find a JDK 17 installation`

**原因**：Android Studio 安装在 D 盘（`D:\Android Studio\jbr`），自带 JDK 21，但 Gradle 要求 JDK 17。系统 `JAVA_HOME` 设置后需重新开终端才生效。

**修复**：
1. `android/gradle.properties` 添加：`org.gradle.java.installations.paths=D\\:\\\\Android Studio\\\\jbr`
2. `android/settings.gradle` 添加 foojay 工具链解析插件：`id("org.gradle.toolchains.foojay-resolver-convention") version "0.9.0"`
3. Gradle 会自动下载 JDK 17

**涉及文件**：`android/gradle.properties`、`android/settings.gradle`

---

### Bug 30：ANDROID_HOME 未生效

**现象**：构建报错 `SDK location not found`

**原因**：`setx ANDROID_HOME` 设置环境变量后，当前终端不会刷新，只有新终端才生效。

**修复**：创建 `android/local.properties` 文件指定 SDK 路径：
```
sdk.dir=C:\\Users\\AaronWei\\AppData\\Local\\Android\\Sdk
```

**涉及文件**：`android/local.properties`

---

### Bug 31：灵动岛/通知栏控制严重延迟（5-6秒）🔥重大

**现象**：灵动岛和通知栏的"播放/暂停/上一首/下一首"按钮可以点击，但延迟 5-6 秒才生效。返回 app 内操作则无延迟。

**根因分析**（3 层问题叠加）：

1. **PlaybackService 的 800ms 安全验证**：RemotePlay 事件中先 `await TrackPlayer.play()`，再 `await 800ms` 后 `getPlaybackState()` 验证，未成功则重试 — 每次操作额外增加 800ms+ 延迟
2. **`getPlaybackState()` pre-checks**：RemotePlay/RemotePause 处理中先调用 `getPlaybackState()` 检查当前状态再决定是否操作，每次 bridge 调用 200-500ms
3. **双服务重复处理**：PlaybackService 和 trackPlayerService 都处理 RemotePlay/RemotePause 事件，trackPlayerService 中也做了 `getPlaybackState()` 检查和 `syncPlaybackState()` bridge 调用

**修复方案**：

| 文件 | 修复内容 |
|------|---------|
| `playbackService.ts` | 移除 `getPlaybackState()` pre-checks 和 800ms 安全验证，RemotePlay/Pause 直接调用 `TrackPlayer.play()`/`pause()` |
| `trackPlayerService.ts` | 移除 `getPlaybackState()` pre-checks，RemotePlay/Pause 只做回调通知，不做 bridge 调用 |
| `trackPlayerService.ts` | PlaybackState 日志去重（`lastTpState` 变量，仅状态变化时输出） |
| `usePlayer.ts` | RemotePlay/Pause 回调中移除 `syncPlaybackState()` bridge 调用，使用 zustand 内存状态判断 |

**核心原则**：`TrackPlayer.play()`/`pause()` 是幂等操作，无需 pre-check 当前状态，直接调用即可。

**涉及文件**：`app/services/playbackService.ts`、`app/services/trackPlayerService.ts`、`app/hooks/usePlayer.ts`

---

### Bug 32：HMR 导致事件监听器重复注册

**现象**：终端日志中 PlaybackState 事件输出 4-5 次，说明同一事件被注册了 4-5 个监听器

**原因**：模块级变量 `listenersRegistered`/`isSetup` 在 Hot Module Replacement (HMR) 时被重置为 `false`，导致每次热更新都重新注册所有事件监听器

**修复**：将模块级 flag 改为 `global` 对象属性（HMR 不重置 global）：

```typescript
// 之前（HMR 会重置）：
let listenersRegistered = false;

// 修复后（HMR 不重置 global）：
const _g = global as any;
if (!_g.__TP_LISTENERS_REGISTERED) _g.__TP_LISTENERS_REGISTERED = false;
```

| Flag | 模块级变量 → global 属性 |
|------|-------------------------|
| trackPlayerService `listenersRegistered` | `_g.__TP_LISTENERS_REGISTERED` |
| trackPlayerService `isSetup` | `_g.__TP_IS_SETUP` |
| playbackService `pbListenersRegistered` | `_g.__PB_LISTENERS_REGISTERED` |
| usePlayer `globalInitialized` | `_g.__PLAYER_INITIALIZED` |

**涉及文件**：`app/services/playbackService.ts`、`app/services/trackPlayerService.ts`、`app/hooks/usePlayer.ts`

---

### Bug 33：播放结束检测双重触发

**现象**：歌曲播放结束后，自动下一首逻辑被触发 2 次，导致跳过一首歌

**原因**：`isHandlingEnd` 超时时间 2 秒太短，自动下一首流程（URL 解析 + 音乐解析）可能需要 3-5 秒，2 秒后 flag 被重置，第二个结束事件再次触发

**修复**：
- `isHandlingEnd` 超时从 2 秒延长到 10 秒
- 成功播放新歌时立即重置 `isHandlingEnd = false`
- `endPollTimer` 优化：3s→5s 间隔，fast-path 检查（进度未接近结尾时跳过 `getPlaybackState()` bridge 调用）

**涉及文件**：`app/hooks/usePlayer.ts`、`app/services/trackPlayerService.ts`

---

### Bug 34：加载大量数据时页面卡死/播放功能失效 🔥重大

**现象**：打开 360 首歌的歌单列表，滑动到第 40 首左右下方出现大量空白（2-5 秒加载），播放按钮完全失效卡死

**根因分析**（5 层问题叠加）：

| 问题 | 严重程度 | 原因 |
|------|---------|------|
| SongItem 无 React.memo | 🔴 | 切歌时 360 个 SongItem 全部重渲染（`currentSongId` 变化 → renderItem 重建 → 所有 item 重新执行） |
| SongList renderItem 内联箭头函数 | 🔴 | `onPress={() => onSongPress?.(item, index)}` 每次渲染创建新引用，即使 SongItem 加 memo 也无效 |
| FlatList windowSize=10 过大 | 🟡 | 保持约 10 屏 item 在内存中（~640 个视图），内存压力大 |
| PlaylistDetailScreen listHeader 无 useMemo | 🟡 | 复杂 header（4 个 NetworkImage + LinearGradient）每次渲染都重建 |
| NetworkImage 无 React.memo | 🟡 | 父组件渲染时图片组件不必要重渲染 |

**修复方案**：

| 文件 | 修复内容 | 效果 |
|------|---------|------|
| `SongItem.tsx` | 添加 `React.memo` + 自定义比较器（只比较 `song.id`、`isActive`、`index`） | 切歌时只重渲染 2 个 item（旧→新），其余 358 个跳过 |
| `SongList.tsx` | `onSongPress`/`onSongMorePress` 通过 `useRef` 持有，renderItem 依赖从 `[currentSongId, onSongPress, onSongMorePress]` → `[currentSongId]` | 回调引用变化不再触发全量重渲染 |
| `SongList.tsx` | `windowSize` 10→5，`maxToRenderPerBatch` 20→10，新增 `updateCellsBatchingPeriod=100` | 减少内存占用，降低渲染帧压力 |
| `NetworkImage.tsx` | 添加 `React.memo` + `recyclingKey={uri}` | 图片组件避免不必要重渲染，FlatList 回收时正确复用 |
| `PlaylistDetailScreen.tsx` | `listHeader` 用 `useMemo` 包裹（必须在早返回之前，避免 hooks 数量不一致） | 复杂 header 不会每次渲染都重建 |
| `HomeScreen.tsx` | `fetchData()` 用 `InteractionManager.runAfterInteractions()` 延迟执行 | 首页加载不阻塞 UI 线程 |
| `UserScreen.tsx` | API 调用用 `InteractionManager.runAfterInteractions()` 延迟执行 | 用户页加载不阻塞 UI 线程 |
| `SearchScreen.tsx` | FlatList 添加 `initialNumToRender`/`windowSize`/`maxToRenderPerBatch`/`removeClippedSubviews` | 搜索结果虚拟化 |

**涉及文件**：`app/components/music/SongItem.tsx`、`app/components/music/SongList.tsx`、`app/components/common/NetworkImage.tsx`、`app/screens/PlaylistDetailScreen.tsx`、`app/screens/HomeScreen.tsx`、`app/screens/UserScreen.tsx`、`app/screens/SearchScreen.tsx`

---

### Bug 35：后台播放切歌失败（架构级根本修复）🔥重大

> 更新时间：2026-05-21

**现象**：锁屏/息屏后歌曲播完不自动切歌；拖动进度条后锁屏不切歌；亮屏后切歌但随即跳回上一首

**根因分析**：旧架构使用 `TrackPlayer.load()` 单曲模式，每次切歌依赖 JS 层监听 `PlaybackState.Ended` 事件再手动 `load()` 新歌。Android 锁屏时系统冻结后台 JS 线程，导致事件无法处理。为此引入 PlaybackService headless 上下文兜底，但两个上下文竞争同一 `load()` 导致双重加载卡住。每次修一个 bug 引入新 bug，根本原因是架构与 Android 系统后台限制冲突。

**根本修复**：重构为原生队列模式，利用 RNTP 内置队列自动切歌，完全绕开 JS 线程被冻结的问题。

| 旧架构 | 新架构 |
|--------|--------|
| `load()` 单曲模式，JS 层监听 Ended 手动切歌 | `reset()+add()+play()` 建立队列，原生层自动切歌 |
| 依赖 JS 线程不被冻结 | 原生层处理，零依赖 JS |
| PlaybackService + 互斥锁 + AsyncStorage 跨上下文通信 | 不需要，原生队列保证 |
| ~500 行切歌逻辑 | ~50 行 |

**核心改动**：

| 文件 | 改动 |
|------|------|
| `trackPlayerService.ts` | `playSong` 改为 `reset()+add()+play()`；新增 `addNextToQueue()`（含 alreadyInQueue 去重）、`clearNextInQueue()`；`ActiveTrackChanged` 事件通知 JS 层同步状态；删除 endPollTimer 轮询 |
| `usePlayer.ts` | 删除 `_doNextPlay`/`doNextPlayOnEnd`/`replayMusic` 整个切歌链；新增 `handleActiveTrackChanged`（原生切歌后同步 zustand）；`onPlaybackEnd` 降级为 fallback；`preloadNextSongIfNeeded` 完成后直接 `addNextToQueue`；`next()` 优先 `skipToNext`；`__isActiveTrackSyncing` 同步清除 |
| `playbackService.ts` | 删除所有 `Ended` 处理和 AsyncStorage 跨上下文通信；`RemoteNext` 直接 `skipToNext()`；`RemotePrevious` 失败时写 `pending_remote_action='prev'` |
| `playlistStore.ts` | `togglePlayMode`/`setPlayMode` 调用 `clearNextInQueue` + 重置 `__nextShuffleIndex` 和 `__preloadedNextSong` |

**删除的旧机制**：`_g.__TP_IS_HANDLING_END`、`_g.__PB_HANDLING_END`、`triggerPlaybackEnd`、`endPollTimer`、`sync_next`/`auto_next` AsyncStorage 通信、PlaybackService Ended 处理

**涉及文件**：`app/hooks/usePlayer.ts`、`app/services/trackPlayerService.ts`、`app/services/playbackService.ts`、`app/store/playlistStore.ts`

---

### Bug 36：音源解析引擎完全失效 — 灰色歌曲只能播放试听片段 🔥重大

> 更新时间：2026-05-21

**现象**：所有灰色歌曲返回试听 URL（30秒片段），无法完整播放；日志显示 `UnblockApiMatch: no URL`。

**根因分析**：（1）`/song/url/match` 响应格式是 `{"data": {"url": "..."}}`（对象），但代码写成 `data[0].url`（当数组取），永远拿不到 URL；（2）source 列表只含 `migu/kugou/kuwo`，遗漏了服务端实际支持的 `bodian/qq/pyncmd`；（3）播放失败重试时复用缓存的坏 URL；（4）GDMusic `joox` 源 URL 不稳定常出现 Source Error。

**修复方案**：
| 修复项 | 改动 |
|--------|------|
| 响应解析修正 | `res?.data?.data?.[0]?.url` → `res?.data?.data?.url` |
| source 列表补全 | 新增 `bodian/qq/pyncmd`，与服务端 `unblock_test.html` 支持对齐 |
| 坏缓存自动清除 | `reloadAndPlay` 时调用 `musicParser.invalidateCache(id)` |
| GDMusic 源优化 | netease 优先 → joox → tidal，搜索数 1→3 |
| 失败缓存机制 | 内存级 failedCacheMap，1分钟内不重复走已知失败策略 |
| OfficialApiStrategy 禁用 | `unblock=true` 从未生效，省掉每次一首歌的 HTTP 请求 |
| CustomApiStrategy 禁用 | 未配置自定义 API 时直接跳过 |

**关键发现**：服务端 `unblock_test.html` 页面验证解灰功能正常（`bodian` 源成功返回完整 flac URL），问题完全在客户端解析代码。

**涉及文件**：`app/services/musicParserService.ts`、`app/hooks/usePlayer.ts`

---

### Bug 37：锁屏/通知栏「下一首」按钮无效 — 上一首后无法切下一首 🔥重大

> 更新时间：2026-05-21

**现象**：在锁屏/通知栏/灵动岛按「上一首」后，再按「下一首」完全无反应。APP 页面内按钮正常。

**根因分析**：（1）`playbackService.ts` 和 `trackPlayerService.ts` 双重注册了 `RemoteNext` 事件监听器；（2）`playbackService.ts` 的处理器只调 `skipToNext()` 无 JS 层 fallback；（3）上一首重置原生队列后，预加载下一首有 100ms 延迟 + API 请求时差，此时队列只有当前歌曲，`skipToNext()` 静默失败。

**修复方案**：
| 修复项 | 改动 |
|--------|------|
| 移除重复监听 | `playbackService.ts` 删除 RemoteNext handler，统一由 `trackPlayerService.ts` 处理 |
| JS fallback 机制 | RemoteNext handler 手动查队列 → 有下一首 `skipToNext()` → 无下一首触发 `onManualNextCallback` |
| ManualNext 回调 | `usePlayer.ts` 中注册完整的 `setOnManualNext`，含顺序/随机/循环播放模式处理 |

**涉及文件**：`app/services/trackPlayerService.ts`、`app/services/playbackService.ts`、`app/hooks/usePlayer.ts`

---

### Bug 38：三个防御性边界防护缺失

> 更新时间：2026-05-21

#### 38.1 PlaybackError 无限重试循环

**现象**：某歌曲 URL 持续不可用时，`PlaybackError → reloadAndPlay → PlaybackError` 每 5 秒重复，无上限。

**修复**：`reloadAndPlay` 复用 `_g.__consecutiveFailCount` 计数器（MAX_CONSECUTIVE_FAILS=5），超限后停止重试。

#### 38.2 RemotePrevious 双重触发

**现象**：App 前景态按锁屏「上一首」时，`trackPlayerService` 和 `playbackService` 同时处理，后续 AppState 切回可能再次触发。

**修复**：`setOnRemotePrev` 回调执行后立即 `AsyncStorage.removeItem('pending_remote_action')` 清除待处理标记。

#### 38.3 LOOP 模式队列重复追加

**现象**：单曲/列表循环模式下，`preloadAndEnqueueNext` 反复向原生队列追加同 ID 的重复 track，导致队列增长。

**修复**：`addNextToQueue` 增加判断：若 `nextTrackId === currentTrack.id`（LOOP 模式下预加载的就是当前歌曲），跳过添加。

**涉及文件**：`app/hooks/usePlayer.ts`、`app/services/trackPlayerService.ts`

---

### Bug 39：歌手详情页 Tab 内容区域完全空白 🔥重大

> 更新时间：2026-05-21

**现象**：进入歌手详情页后，封面、简介、相似歌手、Tab 栏均正常显示，但所有 Tab（热门/全部/专辑/MV/视频）的内容区域完全为空白。

**根因**：布局结构为 `外层 flex:1 View → 头部 ScrollView + Tab Content View(flex:1)`，两个子 View 竞争父容器空间。ScrollView 默认 `flexGrow: 1` 会占据全部可用空间，导致下层 Tab Content View 计算高度为 0。

**修复**：
- 整体结构改为统一 ScrollView：所有内容从封面到 Tab 内容全部在一个 ScrollView 内
- 热门 Tab 用 `SongItem` 直接渲染替代 `SongList`（FlatList），避免嵌套冲突
- 添加 `minHeight: 95vh` 保证内容少的 Tab 不显空荡

**涉及文件**：`app/screens/ArtistDetailScreen.tsx`

---

### Bug 40：简介展开后收起，页面不自动回顶部

> 更新时间：2026-05-21

**现象**：用户展开长简介并滚动到底部后点击"收起"，页面停留在底部，Tab 内容被遮挡在上方不可见。

**修复**：添加 `scrollViewRef`，在 `showFullDesc` 变为 `false` 或 `activeTab` 切换时调用 `scrollTo({ y: 0, animated: true })`。

**涉及文件**：`app/screens/ArtistDetailScreen.tsx`

---

### Bug 41：专辑网格仅有 2 列 + 底部内容被 MiniPlayer 遮挡

> 更新时间：2026-05-21

#### 41.1 专辑 2 列问题

**根因**：`ALBUM_CARD_SIZE` 用 `Spacing.lg` 计算边距，但 `albumGrid` 容器实际使用 `Spacing.md` padding，3 张卡片总宽超出容器 → 自动折行。

**修复**：公式改为 `(SCREEN_WIDTH - Spacing.md*2 - Spacing.md*2) / 3`，`albumRow` 改用 `gap` 替代 `marginRight`。

#### 41.2 底部遮挡问题

**修复**：ScrollView `contentContainerStyle` 添加 `paddingBottom: 80`，预留 MiniPlayer 高度空间。

**涉及文件**：`app/screens/ArtistDetailScreen.tsx`

---

### Bug 42：MV 播放页面歌曲自动播放

> 更新时间：2026-05-21

**现象**：从歌手详情页进入 MV 播放页面时，TrackPlayer 背景音乐与 MV 视频音频同时播放，两路音频重叠。

**根因**：`MvPlayerScreen` 的 `expo-av` Video 组件独立播放音频，未暂停 TrackPlayer。

**修复**：
- 进入 `useEffect(() => { TrackPlayer.pause(); return () => { TrackPlayer.play(); }; }, [])`
- 进入时暂停，离开时恢复

**涉及文件**：`app/screens/MvPlayerScreen.tsx`

---

> 更新时间：2026-05-19

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

---

## Phase 9：播放器迁移（expo-av → react-native-track-player）+ 灵动岛 + 后台播放 ✅ 已完成

> 开始时间：2026-05-18
> 目标：从 expo-av 迁移到 react-native-track-player，实现后台播放、通知栏控制、iOS 灵动岛

### 9.1 迁移背景

当前项目使用 `expo-av` 作为音频引擎，仅支持前台播放，无法实现：
- **iOS 灵动岛**（Live Activity / Now Playing Info）
- **锁屏/通知栏媒体控制**
- **后台持续播放**
- **系统媒体会话集成**（耳机按键、车载蓝牙控制）

`react-native-track-player` 是 React Native 生态最成熟的音频播放库，原生支持以上所有功能。迁移后将获得完整的系统级媒体体验。

### 9.2 迁移影响评估

| 变更项 | 说明 | 影响 |
|--------|------|------|
| **不再支持 Expo Go** | track-player 需要原生模块链接 | ⚠️ 必须使用 Development Build |
| **trackPlayerService.ts 重写** | 从 expo-av API 切换到 TrackPlayer API | 🔴 核心 |
| **usePlayer.ts 适配** | 播放控制逻辑适配新回调机制 | 🔴 核心 |
| **playerStore.ts 适配** | 进度/状态更新方式改变 | 🟡 中等 |
| **metro.config.js 修改** | 移除 BLOCKED_MODULES 中的 track-player | 🟢 简单 |
| **app.json 配置** | 添加音频后台模式权限 | 🟢 简单 |
| **EAS Build 配置** | Development Build profile | 🟢 简单 |
| **MiniPlayer / PlayerScreen** | 进度条组件适配（Slider 行为可能不同） | 🟡 中等 |
| **PlaylistDrawer** | 基本不变 | 🟢 简单 |
| **下载播放** | 本地文件 URI 方式可能不同 | 🟡 中等 |

### 9.3 任务清单

#### Step 1：环境准备 ✅ 已完成

| 任务 | 说明 | 状态 |
|------|------|------|
| 安装 react-native-track-player | `npx expo install react-native-track-player` | ✅ v4.1.2 |
| 从 metro.config.js BLOCKED_MODULES 移除 track-player | 允许打包 | ✅ |
| metro.config.js 改用 @expo/metro/metro-config | Expo 虚拟入口兼容 | ✅ |
| 配置 app.json 音频后台模式 | `ios.infoPlist.UIBackgroundModes: ['audio']` | ✅ |
| 安装 Android Studio + SDK | D盘安装，SDK API 34 | ✅ |
| 配置 Gradle JDK 17 | foojay 插件自动下载 | ✅ |
| 创建 android/local.properties | 指定 SDK 路径 | ✅ |
| 修复 track-player Kotlin 编译错误 | Bundle? → Bundle!! 非空断言 | ✅（需持久化） |
| 构建 Development Build APK | `npx expo run:android` 成功 | ✅ |
| 验证 Dev Build 可运行 | 真机安装 + Metro 连接成功 | ✅ |
| npm start 脚本更新 | `expo start --dev-client --clear` | ✅ |

#### Step 2：trackPlayerService.ts 重写 ✅ 已完成

| 任务 | 说明 | 状态 |
|------|------|------|
| TrackPlayer.setupPlayer() | 初始化播放器服务 | ✅ |
| TrackPlayer.updateOptions() | 配置能力（play/pause/next/prev/seek）+ 通知栏样式 | ✅ |
| TrackPlayer.add() / reset() / play() / pause() | 替换 expo-av 的 Sound 对象操作 | ✅ |
| TrackPlayer.seekTo() | 替换 soundRef.setStatusAsync | ✅ |
| 事件监听 | PlaybackState / PlaybackProgressUpdated / PlaybackActiveTrackChanged | ✅ |
| Now Playing Metadata | Track metadata artwork/title/artist | ✅ |
| 4 层结束检测简化 | TrackPlayer 内置事件可靠，改为 3s 轮询兜底 | ✅ |
| RemotePlay/RemotePause/RemoteNext/RemotePrev | 远程控制事件处理 | ✅ |
| onReloadAndPlay 回调 | 无 track 时主 app 重载歌曲 | ✅ |
| 播放结束轮询检测 | 3s 间隔兜底检测（防止 Completed 事件不触发） | ✅ |
| Generation counter | 防止快速切歌导致旧播放覆盖新播放 | ✅ |

#### Step 3：usePlayer.ts 适配 ✅ 已完成

| 任务 | 说明 | 状态 |
|------|------|------|
| 播放控制切换 | togglePlayback → TrackPlayer.play()/pause() | ✅ |
| 切歌逻辑 | add track → TrackPlayer.reset() + add() + play() | ✅ |
| 进度更新 | 监听 PlaybackProgressUpdated 事件替代回调 | ✅ |
| 自动下一首 | 监听播放结束 + 轮询兜底 | ✅ |
| playSong 返回 boolean | 保持不变 | ✅ |
| 音源解析集成 | 试听 URL → 音源解析 → 替换完整 URL | ✅ |
| setOnRemotePause 回调 | RemotePause 同步 zustand 状态 | ✅ |
| syncPlaybackState | 统一状态同步函数 | ✅ |
| HMR 重复注册修复 | 模块级 flag → global 对象属性 | ✅ |
| isHandlingEnd 超时 | 2s → 10s + 成功播放时重置（trackPlayerService 侧最终 60s 兜底） | ✅ |

#### Step 3.5：远程控制延迟修复 ✅ 已完成

| 任务 | 说明 | 状态 |
|------|------|------|
| PlaybackService 移除 pre-check | 移除 getPlaybackState() 检查和 800ms 安全验证 | ✅ |
| trackPlayerService 移除 pre-check | RemotePlay/Pause 只做回调通知 | ✅ |
| usePlayer 移除 bridge 调用 | RemotePlay/Pause 回调用 zustand 内存状态 | ✅ |
| PlaybackState 日志去重 | lastTpState/lastPbState 变量 | ✅ |

#### Step 3.6：列表性能优化 ✅ 已完成

| 任务 | 说明 | 状态 |
|------|------|------|
| SongItem React.memo | 自定义比较器（只比较 id/isActive/index） | ✅ |
| SongList ref 持有回调 | onPress/onMorePress 通过 useRef，renderItem 只依赖 currentSongId | ✅ |
| FlatList 参数调优 | windowSize 5、maxToRenderPerBatch 10、updateCellsBatchingPeriod 100 | ✅ |
| NetworkImage React.memo | + recyclingKey | ✅ |
| PlaylistDetailScreen useMemo header | listHeader 缓存（在早返回之前） | ✅ |
| InteractionManager 延迟加载 | HomeScreen/UserScreen 非关键 API 延迟执行 | ✅ |

#### Step 4：iOS 灵动岛配置

| 任务 | 说明 |
|------|------|
| Now Playing Info 自动集成 | track-player 设置 Now Playing Metadata 后，iOS 自动在锁屏/灵动岛显示 |
| 封面图显示 | Track metadata artwork URL → 系统自动加载 |
| 锁屏控制按钮 | 通过 TrackPlayer.updateOptions() 的 capabilities 配置 |
| 灵动岛 Live Activity | iOS 16.1+ 自动支持（需 Xcode 14+ 构建） |

> **说明**：`react-native-track-player` 通过设置 `Now Playing Info Center`（MPNowPlayingInfoCenter）自动实现灵动岛和锁屏控件。无需额外集成 Live Activity 框架，系统会根据媒体会话自动渲染。

#### Step 5：Android 通知栏配置

| 任务 | 说明 |
|------|------|
| 通知栏媒体样式 | TrackPlayer.updateOptions() 配置 |
| 前台服务通知 | Android 后台播放必须显示通知 |
| 自定义通知布局 | 可选：compact / expanded 两种布局 |

#### Step 6：回归测试

| 测试项 | 说明 |
|--------|------|
| 基础播放 | 播放/暂停/切歌/进度条 |
| 自动下一首 | 列表循环/单曲循环/随机播放 |
| 音源解析 | 灰色歌曲解析 |
| 下载播放 | 本地文件播放 |
| 后台播放 | 切到后台后持续播放 |
| 锁屏控制 | 锁屏界面播放/暂停/切歌 |
| iOS 灵动岛 | 锁屏/灵动岛显示歌曲信息+封面 |
| Android 通知栏 | 通知栏显示歌曲+控制按钮 |
| 耳机/蓝牙控制 | 耳机按键切歌 |

#### Step 7：后台播放 + 远程控制 Bug 修复 ✅ 已完成（2026-05-19）

> 共修复 4 个关键 Bug，详见下方 Step 7 详情表格

#### Step 8：播放器 UI 全面翻新 ✅ 已完成（2026-05-20）

> Picture Disc 满幅封面黑胶 + 动态取色 + 自定义进度条 + 双层呼吸光晕，详见下方 Step 8 详情表格

### 9.4 关键代码设计（新架构）

#### 原生队列模式核心流程

```
用户点击歌曲
  → doPlaySong(song)
  → tpPlaySong: reset() + add(currentTrack) + play()
  → preloadAndEnqueueNext()
    → preloadNextSongIfNeeded()
      → getMusicUrl / parseMusicUrl
      → tpAddNextToQueue(nextSong, url)  ← 加入原生队列
        → 原生队列: [current, next]

歌曲播完（原生层自动切歌）
  → PlaybackActiveTrackChanged 事件
  → handleActiveTrackChanged(track)
    → 同步 zustand: setPlayMusic / setPlayListIndex
    → preloadAndEnqueueNext()  ← 预加载下下首

锁屏/后台（JS 线程被冻结）
  → 原生队列有 next → 原生层自动切歌，零依赖 JS ✅
  → 原生队列无 next（预加载未完成）→ PlaybackState.Ended → onPlaybackEnd fallback
```

#### PlaybackService（简化后）

```typescript
// 新架构：切歌完全由原生队列自动处理
// PlaybackService 只负责 Remote 事件的原生响应

TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
// RemotePrevious：队列无上一首，失败时写 pending_remote_action
TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
  try { await TrackPlayer.skipToPrevious(); }
  catch { await AsyncStorage.setItem('pending_remote_action', JSON.stringify({ action: 'prev', timestamp: Date.now() })); }
});
```

#### 原生补丁（patch-rntp.js）

由于 RNTP v4.1.2 存在兼容性问题，项目使用 `scripts/patch-rntp.js` 在 `postinstall` 时自动修补原生代码：

| 补丁 | 修改文件 | GitHub Issue | 说明 |
|------|---------|-------------|------|
| Patch 1 | `MusicService.kt` | [#2593](https://github.com/doublesymmetry/react-native-track-player/issues/2593) | Bridgeless 模式下 `reactNativeHost.reactInstanceManager.currentReactContext` 返回 null，导致所有原生→JS 事件被静默丢弃。改用 `HeadlessJsTaskService` 继承的 `reactContext` |
| Patch 2 | `MusicModule.kt` | [#2560](https://github.com/doublesymmetry/react-native-track-player/issues/2560) | RN 0.81+ 中 `originalItem` 可能为 null，`Arguments.fromBundle()` 期望非 null，添加 `?: Bundle()` 空安全 |

#### TrackPlayer 初始化

```typescript
// app/services/trackPlayerService.ts

import TrackPlayer, {
  Event,
  Capability,
  RepeatMode,
  State,
} from 'react-native-track-player';

export async function setupPlayer(): Promise<void> {
  await TrackPlayer.setupPlayer({
    android: {
      appKilledPlaybackBehavior: 'stopPlaybackAndRemoveNotification',
    },
  });

  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    progressUpdateEventInterval: 1, // 每秒更新进度
  });
}
```

#### 播放歌曲

```typescript
export async function playSong(
  song: SongResult,
  url: string
): Promise<void> {
  await TrackPlayer.reset();

  await TrackPlayer.add({
    id: String(song.id),
    url,
    title: song.name,
    artist: song.ar?.map((a) => a.name).join(' / ') || '未知歌手',
    artwork: song.picUrl || song.al?.picUrl,
    duration: song.duration,
  });

  await TrackPlayer.play();
}
```

#### 事件监听（双服务协调）

```typescript
// PlaybackService (headless) — 唯一的 play/pause 执行者
TrackPlayer.addEventListener(Event.RemotePlay, async () => {
  // ★ 只在这里调用 TrackPlayer.play()
  // ★ trackPlayerService 不调用 play()，避免竞态
  await TrackPlayer.play();
  
  // 安全验证：800ms 后确认状态
  await new Promise(r => setTimeout(r, 800));
  const newState = await TrackPlayer.getPlaybackState();
  if (newState.state !== State.Playing) {
    await TrackPlayer.play(); // 重试
  }
});

// trackPlayerService (主 app) — 只做状态同步
TrackPlayer.addEventListener(Event.RemotePlay, async () => {
  // ★ 不调用 TrackPlayer.play()！
  onRemotePlayCallback?.(); // 同步 zustand 状态
});

TrackPlayer.addEventListener(Event.RemotePause, async () => {
  // ★ 不调用 TrackPlayer.pause()！
  onRemotePauseCallback?.(); // 同步 zustand 状态
});
```

### 9.5 expo-av vs react-native-track-player 完整对比

| 功能 | expo-av（当前） | react-native-track-player（迁移后） |
|------|----------------|-------------------------------------|
| Expo Go 兼容 | ✅ | ❌ 需 Development Build |
| 前台播放 | ✅ | ✅ |
| 后台播放 | ❌ | ✅ 原生后台服务 |
| 通知栏控制 | ❌ | ✅ |
| 锁屏控制 | ❌ | ✅ |
| iOS 灵动岛 | ❌ | ✅ Now Playing Info 自动集成 |
| 耳机/蓝牙按键 | ❌ | ✅ 系统媒体会话 |
| 播放队列 | ❌ 需手动管理 | ✅ 内置队列 |
| 播放速率 | ✅ | ✅ |
| 均衡器 | ❌ | ✅ (Android) |
| 进度回调 | 手动轮询 | ✅ 内置事件 |
| 歌曲结束检测 | 4 层 hack | ✅ 内置 State.Stopped |
| 无缝切歌 | 需手动 stop + create | ✅ reset + add |

### 9.6 风险与注意事项

| 风险 | 说明 | 应对方案 |
|------|------|---------|
| Expo Go 不可用 | 开发调试必须用 Development Build | 提前构建好 Dev Build APK |
| 部分国产 ROM 后台限制 | 可能杀后台导致播放中断 | 引导用户关闭电池优化、加白名单 |
| iOS 审核 | 后台音频模式需说明用途 | Info.plist 添加用途描述 |
| track-player 版本兼容 | v4 与 Expo SDK 54 兼容性 | 使用最新稳定版，关注社区 issue |
| URL 过期 | 音源 URL 30分钟过期，后台播放可能遇到 | 监听播放错误事件，自动重新解析 |

**验收标准**：后台播放正常、锁屏/通知栏可控制、iOS 灵动岛显示歌曲信息

#### Step 7：后台播放 + 远程控制 Bug 修复 ✅ 已完成（2026-05-19）

> 修复了后台锁屏播放时的切歌级联失败、灵动岛消失、通知栏不同步等 4 个关键 Bug。

| # | Bug | 根因 | 修复 | 涉及文件 |
|---|-----|------|------|---------|
| 1 | **后台自动切歌级联失败** | `trackPlayerService.ts` 中 `isHandlingEnd` 超时 8s 太短，后台 GDMusic/joox 网络请求超过 8s 时守卫提前重置，轮询检测到 `State.Ended` 二次触发 → 两条切歌链冲突 | `isHandlingEnd` 超时 8s → 60s 作为异常兜底，正常流程由 `resetPlaybackEndState()`（新 track 加载时）驱动清零 | `app/services/trackPlayerService.ts` |
| 2 | **Headless skipToNext 导致 Paused 打断解析** | `playbackService.ts`（headless JS）的 RemoteNext/RemotePrevious 处理器调用 `skipToNext()`/`skipToPrevious()`，但队列只有单曲 → 必然失败 → `PlaybackState` 变为 Paused → 打断主 app 的 URL 解析 | 移除 headless 中的 `skipToNext()`/`skipToPrevious()` 调用，改为纯日志。主 app 的 `trackPlayerService.ts` 回调完整处理切歌逻辑 | `app/services/playbackService.ts` |
| 3 | **切歌时灵动岛/通知栏消失** | 暂停旧音频后若 URL 解析耗时过长，无音频 active 的 media session 被 OS 判定不活跃而隐藏通知 | 暂停后立即调用 `TrackPlayer.updateNowPlayingMetadata()` 更新通知元数据为新歌信息，保持 notification 活跃 | `app/hooks/usePlayer.ts` |
| 4 | **通知栏与应用内 UI 不同步** | `doPlaySong` 设置了 zustand store 的 `setPlayMusic(song)`（应用内 UI 更新），但未更新原生通知栏元数据 | 新增 `TrackPlayer.updateNowPlayingMetadata()` 在 `setPlayMusic` 之后立即同步通知栏信息 | `app/hooks/usePlayer.ts` |

##### 完整切歌流程（修复后）

```
1. TrackPlayer.pause()           → 旧音频立即停止
2. updateNowPlayingMetadata()    → 灵动岛/通知栏立即显示新歌封面+标题
3. setPlayMusic(song)            → 应用内 UI 显示新歌
4. setIsLoading(true)            → 播放按钮显示转圈
5. URL 解析中（2-5s）             → 短暂静音，两端同步显示新歌+加载态
6. TrackPlayer.load(新歌)        → 新音频开始，通知栏无缝变为播放状态
```

##### 改动清单

| 文件 | 改动 | 类型 |
|------|------|------|
| `app/services/trackPlayerService.ts` | `triggerPlaybackEnd` 中 `isHandlingEnd` 安全超时 8s → 60s | 超时调整 |
| `app/services/playbackService.ts` | 移除 headless RemoteNext/RemotePrevious 中的 `skipToNext()`/`skipToPrevious()` 调用 | 冲突消除 |
| `app/hooks/usePlayer.ts` `doPlaySong` | 新增 `TrackPlayer.pause()` → `updateNowPlayingMetadata()` → `setPlayMusic()` 的严格顺序 | 切歌流程 |
| `app/hooks/usePlayer.ts` `doPlaySong` | 移除前置 `setIsPlay(true)`，由 PlaybackState 事件驱动 | 状态修正 |
| `app/hooks/usePlayer.ts` `_doNextPlay` | 单曲失败路径补充 `clearAutoNextFlag()` | 遗漏修复 |

#### Step 8：播放器 UI 全面翻新（网易云风格 + 动态取色）✅ 已完成（2026-05-20）

> 全新 Picture Disc 设计：封面填满整张黑胶唱片，旋转时整张封面一起转。动态取色驱动背景渐变，每首歌独一无二的视觉氛围。

##### 设计方向

| 特性 | 说明 |
|------|------|
| **Picture Disc 满幅唱片** | 封面填满整个 DISC_SIZE 圆形区域，非传统黑胶小封面。旋转时整张封面跟着转，辨识度极高 |
| **动态取色** | `react-native-image-colors` 从封面提取 accent/vibrant/dark/muted 色，驱动背景渐变 |
| **自定义进度条** | PanResponder 手势拖动 + 自定义 thumb 圆形拖拽点，替换原生 Slider |
| **双层呼吸光晕** | 播放按钮：内层脉冲（1.5s）+ 外层扩散（2.2s），取消播放时光晕消失 |
| **封面转场动画** | 切歌时封面 scale 0.85 → spring 回弹 + fade 过渡 |
| **毛玻璃控制区** | 半透明深色底栏 + 顶部细线分隔，按钮间距重新调优 |
| **MiniPlayer 翻新** | 暂停时播放按钮为描边空心圆（accent 色边框），播放时实心填充 |

##### 新增文件

| 文件 | 说明 |
|------|------|
| `app/hooks/useAlbumColors.ts` | 动态取色 Hook，封装 `react-native-image-colors`，带内存缓存 |
| `package.json` | 新增依赖 `react-native-image-colors` |

##### 改动文件

| 文件 | 改动概述 |
|------|---------|
| `app/screens/PlayerScreen.tsx` | 全面重写：Picture Disc 满幅封面唱片 + 动态取色背景渐变 + 自定义 ProgressBar + 双层呼吸光晕播放按钮 + 封面转场动画 + 按钮间距重调 |
| `app/components/player/MiniPlayer.tsx` | 翻新：暂停时描边空心播放按钮、播放时实心填充、更大封面、间距优化 |

#### Step 9：歌曲操作菜单 + 智能删除 ✅ 已完成（2026-05-20）

> 歌单/搜索等列表页每首歌右侧 `⋮` 三点按钮，弹出操作菜单。

##### 新增文件

| 文件 | 说明 |
|------|------|
| `app/components/music/SongActionSheet.tsx` | 底部弹出操作菜单：封面+歌名+歌手头部、操作项列表（图标+文字+loading态）、取消按钮；`useSafeAreaInsets` 适配虚拟导航栏 |

##### 改动文件

| 文件 | 改动概述 |
|------|---------|
| `app/screens/PlaylistDetailScreen.tsx` | 接入 `onSongMorePress`：下一首播放、收藏（Toast 反馈）、下载、歌手详情；**自己的歌单**自动显示「从歌单中删除」红色按钮，调用 `updatePlaylistTracks` API 服务器同步 + 本地即时移除 |

##### 操作菜单功能

| 操作 | 实现 | Toast 反馈 |
|------|------|-----------|
| 下一首播放 | `addToNext(song)` 插入队列 | ✅ |
| 收藏 | `likeSong(id, true)` API | ✅ 已收藏/收藏失败 |
| 下载 | `download(song)` 加入队列 | ✅ 已加入下载队列 |
| 从歌单删除 | `updatePlaylistTracks({ op:'del' })` + 本地移除 | ✅ 已删除/删除失败 |
| 歌手详情 | `navigation.navigate('ArtistDetail')` | — |

#### Step 9b：全局三点菜单覆盖 ✅ 已完成（2026-05-20）

> 所有使用 `SongList` 的页面统一接入三点操作菜单，复用 `useSongActionSheet` Hook。

##### 新增文件

| 文件 | 说明 |
|------|------|
| `app/hooks/useSongActionSheet.ts` | 统一的三点菜单 Hook：下一首/收藏/下载/评论/歌手，可选删除（自己的歌单） |

##### 改动文件

| 文件 | 改动 |
|------|------|
| `app/screens/SearchScreen.tsx` | 搜索结果接入三点菜单 + 评论弹窗 |
| `app/screens/ArtistDetailScreen.tsx` | 歌手详情接入三点菜单 + 评论弹窗 |
| `app/screens/AlbumDetailScreen.tsx` | 专辑详情接入三点菜单 + 评论弹窗 |
| `app/screens/HistoryScreen.tsx` | 播放历史接入三点菜单 + 评论弹窗 |
| `app/screens/LikedSongsScreen.tsx` | 我喜欢的音乐接入三点菜单 + 评论弹窗 |
| `app/screens/PlayerScreen.tsx` | 播放器底部操作栏新增「评论」按钮 |
| `app/components/player/PlaylistDrawer.tsx` | 播放列表歌手名增加 `artists` 字段兜底 |

#### Step 9c：评论系统全面增强 ✅ 已完成（2026-05-20）

> 8 项评论功能全覆盖：热门/最新 tab、楼层回复、点赞、发表评论、`before` 分页等。

##### 新增/重写文件

| 文件 | 改动 |
|------|------|
| `app/api/comment.ts` | 重写：新增 `getHotComment`/`getFloorComment`/`getHotwallComment`/`getUserCommentHistory`/`getEventComment` |
| `app/components/comment/CommentList.tsx` | 重写：热门/最新 tab 切换 + 点赞 + `before` 分页 + 楼层回复展开 + 底部输入框发表评论 + 真实头像 |

##### 评论功能清单

| # | 功能 | API | UI |
|---|------|-----|----|
| 1 | 热门评论 | `/comment/hot` | Tab 切换 |
| 2 | 最新评论 | `/comment/music` | Tab 切换 + `before` 深度分页 |
| 3 | 楼层回复 | `/comment/floor` | 点击「查看回复」展开 |
| 4 | 发表评论 | `POST /comment` | 底部输入框 + 发送按钮 |
| 5 | 回复评论 | `POST /comment` (t=2) | 点击回复图标 → `@用户名` |
| 6 | 点赞评论 | `/comment/like` | 红心图标，即时更新计数 |
| 7 | 云村热评 | `/comment/hotwall/list` | API 已封装 |
| 8 | 用户评论历史 | `/user/comment/history` | API 已封装 |

---

## Phase 10：功能补齐 — MV 播放 + 播放历史 + 收藏 + 评论 + 歌单编辑 + 本地音乐 + 热力图 ✅ 已完成

> 基于桌面端 AlgerMusicPlayer 功能对比 + NeteaseCloudMusicApi 能力分析，补齐移动端缺失的 7 项功能。

### 10.1 功能清单

| # | 功能 | API | 桌面端 | 说明 |
|---|------|-----|:---:|------|
| 1 | **MV 播放页** | `getMvUrl` / `getMvDetail` ✅ 已封装 | ✅ | MvScreen (列表) 已存在，缺 MvPlayer 播放页 |
| 2 | **播放历史独立页** | `getUserRecord` / `getRecentSongs` ✅ 已封装 | ✅ | 查看最近播放的歌曲列表 |
| 3 | **我喜欢的音乐页** | `getLikedList` ✅ 已封装 | ✅ | 查看/管理已红心歌曲 |
| 4 | **歌曲评论** | `/comment/music` ❌ 待封装 | ❌ | 查看/发表歌曲评论，社交互动 |
| 5 | **歌单编辑** | `/playlist/update` / `/playlist/name/update` / `/playlist/desc/update` / `/playlist/cover/update` / `/playlist/tags/update` ❌ 待封装 | ❌ | 修改歌单名称、描述、封面、标签 |
| 6 | **本地音乐扫描** | 无需 API | ✅ | 扫描设备本地音乐文件，加入播放 |
| 7 | **听歌热力图** | `/user/record` ✅ 部分已有 | ✅ | 日历热力图展示听歌频率 |

### 10.2 技术任务

| # | 任务 | 涉及文件 |
|---|------|---------|
| 1 | 封装评论 API + 创建 MvPlayerScreen | `app/api/comment.ts` (新) + `app/screens/MvPlayerScreen.tsx` (新) |
| 2 | 创建 HistoryScreen | `app/screens/HistoryScreen.tsx` (新) |
| 3 | 创建 LikedSongsScreen | `app/screens/LikedSongsScreen.tsx` (新) |
| 4 | 创建评论组件 + 评论列表 | `app/components/comment/CommentList.tsx` (新) + `app/components/comment/CommentItem.tsx` (新) |
| 5 | 封装歌单编辑 API + 编辑弹窗 | `app/api/playlist.ts` (扩展) + `app/components/playlist/PlaylistEditSheet.tsx` (新) |
| 6 | 创建本地音乐扫描服务 + 页面 | `app/services/localMusicService.ts` (新) + `app/screens/LocalMusicScreen.tsx` (新) |
| 7 | 创建热力图组件 | `app/components/chart/HeatmapChart.tsx` (新) + `app/screens/HeatmapScreen.tsx` (新) |
| — | 注册路由 | `app/types/navigation.ts` + `app/navigation/MainTabNavigator.tsx` |

---

## Phase 11：后续功能规划 — 官方 API 未实现模块对照

> 基于 `NeteaseCloudMusicApiEnhanced` (v2026.2.15) 完整 API 文档与项目现有实现对照分析
> 分析日期：2026-05-20
> 共 180+ API 接口，已实现约 50 个，剩余约 **130+** 个待实现

### 11.1 用户体系增强 🔴 高优先级 — 🚧 部分完成 (2026-05-20)

> **11.1 阶段一已完成**：API 层 + Store 层 + UI 层全面补齐。已完成 14/24 项，剩余 10 项待后续开发。

#### 11.1.1 已实现 (14/24)

| API | 接口地址 | 实现文件 | 说明 |
|-----|---------|---------|------|
| 邮箱登录 | `POST /login` | `api/login.ts` → `loginByEmail()` | 163邮箱 + 密码登录 |
| 游客登录 | `POST /register/anonimous` | `api/login.ts` → `registerAnonymous()` | 获取游客cookie，底部「游客模式浏览」入口 |
| 刷新登录 | `POST /login/refresh` | `api/login.ts` → `refreshLogin()` | 刷新登录状态 |
| 发送验证码 | `POST /captcha/sent` | `api/login.ts` → `sendCaptcha()` | 手机号获取验证码，60s倒计时 |
| 验证验证码 | `POST /captcha/verify` | `api/login.ts` → `verifyCaptcha()` | 校验验证码 |
| 验证码登录 | `POST /login/cellphone` | `api/login.ts` → `loginByCaptcha()` | phone + captcha 登录 |
| 获取统计数量 | `GET /user/subcount` | `api/user.ts` → `getUserSubcount()` | 歌单/歌手/MV/电台/节目数，UserScreen Hero区展示 |
| 用户等级 | `GET /user/level` | `api/user.ts` → `getUserLevel()` | 等级进度条（金色进度条） |
| 用户绑定信息 | `GET /user/binding` | `api/user.ts` → `getUserBinding()` | API已封装 |
| 用户徽章 | `GET /user/medal` | `api/user.ts` → `getUserMedal()` | API已封装 |
| 用户动态 | `GET /user/event` | `api/user.ts` → `getUserEvent()` | API已封装 |
| 用户电台 | `GET /user/dj` | `api/user.ts` → `getUserDj()` | API已封装 |
| 关注/取消关注 | `POST /follow` | `api/user.ts` → `followUser()` + `userStore.toggleFollow()` | Store已封装 |
| 是否互相关注 | `GET /user/mutualfollow/get` | `api/user.ts` → `checkMutualFollow()` | API已封装 |

#### 11.1.2 Store 层新增

| 字段/Action | 说明 |
|-------------|------|
| `loginType: 'guest'` | 新增游客登录类型 |
| `subcount` / `subcountLoading` | 统计数量状态（歌单/歌手/MV/电台/节目数） |
| `levelData` / `levelLoading` | 等级详情（含 progress 进度百分比） |
| `followingMap: Record<number, boolean>` | 关注状态 Map |
| `fetchSubcount()` | 拉取统计数量 |
| `fetchLevel()` | 拉取等级详情 |
| `toggleFollow(uid, currentFollowed)` | 关注/取消关注操作 |
| `checkLoginStatus()` 增强 | 非UID登录成功后自动拉取 subcount/level |

#### 11.1.3 UI 层新增

| 页面 | 新增内容 |
|------|---------|
| **LoginScreen** | ① 新增「邮箱」Tab（5 Tab → 邮箱登录）② 手机号Tab新增「密码/验证码」切换③ 验证码模式+发送验证码+60s倒计时④ 底部「或」分隔线+游客模式浏览按钮 |
| **UserScreen** | ① Hero统计行下方新增 Subcount 行（歌单数/关注歌手数/MV数/电台数/节目数）② 等级旁新增金色进度条（levelData.progress）③ 游客登录显示「游客」Tag④ 页面聚焦自动拉取 subcount/level |

#### 11.1.4 改动文件清单

| 文件 | 改动类型 | 改动量 |
|------|---------|--------|
| `app/api/login.ts` | API新增 | +6 函数 |
| `app/api/user.ts` | API新增 | +20+ 函数 |
| `app/api/index.ts` | 导出更新 | 新增导出 |
| `app/store/userStore.ts` | Store增强 | +subcount/level/follow |
| `app/screens/LoginScreen.tsx` | UI重写 | +邮箱Tab+验证码切换+游客入口 |
| `app/screens/UserScreen.tsx` | UI增强 | +Subcount行+等级进度条+guest标签 |

#### 11.1.5 待实现 (10/24)

| API | 接口地址 | 说明 |
|-----|---------|------|
| 退出登录 | `POST /logout` | **已有API**，待添加二次确认弹窗 |
| 获取账号信息 | `GET /user/account` | **已有API**，UserScreen可展示更多账号字段 |
| 更新用户信息 | `POST /user/update` | 需开发编辑资料页面 |
| 更新头像 | `POST /avatar/upload` | 需开发头像上传UI |
| 用户关注列表 | `GET /user/follows` | **已有API**，待创建独立关注/粉丝列表页 |
| 用户粉丝列表 | `GET /user/followeds` | **已有API**，同关注列表页 |
| 用户历史评论 | `GET /user/comment/history` | **已有API**，待UI展示 |
| 用户状态系列 | `/user/social/status` × 4 | **API已封装**，待UI展示 |
| 当前关注(新版) | `GET /user/follow/mixed` | **API已封装**，待UI |
| 创建/收藏歌单分离 | `/user/playlist/create` `/collect` | **API已封装**，待替换现有playlist接口 |



| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 邮箱登录 | `POST /login` | 163邮箱+密码登录 | ✅|
| 游客登录 | `POST /register/anonimous` | 获取游客cookie，避免未登录400错误 | ✅ |
| 刷新登录 | `POST /login/refresh` | 刷新登录状态（二维码登录cookie不支持） | ✅ |
| 发送验证码 | `POST /captcha/sent` | 手机号获取验证码 | ✅ |
| 验证验证码 | `POST /captcha/verify` | 校验验证码是否正确 | ✅ |
| 退出登录 | `POST /logout` | 退出当前登录 | ✅ |
| 获取账号信息 | `GET /user/account` | 用户账号信息 | ✅ |
| 获取统计数量 | `GET /user/subcount` | 歌单/收藏/MV/DJ数量统计 | ✅ |
| 用户等级 | `GET /user/level` | 登录天数/听歌次数/等级进度 | ✅ |
| 用户绑定信息 | `GET /user/binding` | 用户绑定信息(uid) | ✅ |
| 更新用户信息 | `POST /user/update` | 修改性别/生日/昵称/省份/城市/签名 | ✅ |
| 更新头像 | `POST /avatar/upload` | 上传自定义头像 | ✅ |
| 用户徽章 | `GET /user/medal` | 获取用户徽章(uid) | ❌ |
| 用户关注列表 | `GET /user/follows` | 获取关注列表(uid) | ✅ |
| 用户粉丝列表 | `GET /user/followeds` | 获取粉丝列表(uid) | ✅ |
| 用户动态 | `GET /user/event` | 获取用户动态(uid) | ✅ |
| 用户电台 | `GET /user/dj` | 获取用户电台(uid) | ✅ |
| 用户历史评论 | `GET /user/comment/history` | 用户历史评论(uid) | ✅ |
| 关注/取消关注 | `POST /follow` | id+t(1关注) | ✅ |
| 是否互相关注 | `GET /user/mutualfollow/get` | 判断互关状态(uid) | ✅ |
| 用户状态相关 | `/user/social/status` 系列 | 获取/设置/推荐用户状态 | ✅ |
| 用户状态支持设置 | `GET /user/social/status/support` | 获取支持的状态类型 | ✅ |
| 相同状态的用户 | `GET /user/social/status/rcmd` | 同状态用户推荐 | ✅ |
| 编辑用户状态 | `POST /user/social/status/edit` | 编辑当前用户状态 | ✅ |

### 11.2 歌手模块增强 🔴 高优先级 — ✅ 已完成 (2026-05-20)

> **全部 10/10 项已完成**。API 层 10 个函数全部封装，ArtistDetailScreen 全面重构支持 5 Tab，新增 ArtistListScreen 歌手分类浏览页。

#### 11.2.1 API 层（`app/api/artist.ts`）

| 函数 | 接口地址 | 说明 |
|------|---------|------|
| `getArtistDetailDynamic` | `GET /artist/detail/dynamic` | 是否关注/视频数 |
| `getArtistDesc` | `GET /artist/desc` | 歌手简介/详细描述 |
| `getArtistTopSong` | `GET /artist/top/song` | 歌手热门 50 首 |
| `getArtistSongs` | `GET /artist/songs` | 全部歌曲，支持 hot/time 排序 + 分页 |
| `getArtistMv` | `GET /artist/mv` | 歌手 MV 列表(id+limit+offset) |
| `getArtistVideo` | `GET /artist/video` | 歌手视频(size+cursor+order) |
| `subscribeArtist` | `POST /artist/sub` | 收藏/取消收藏(id+t) |
| `getArtistSublist` | `GET /artist/sublist` | 收藏的歌手列表(limit+offset) |
| `getArtistFans` | `GET /artist/fans` | 歌手粉丝列表(id+limit+offset) |
| `getArtistFollowCount` | `GET /artist/follow/count` | 歌手粉丝数量(id) |
| `getArtistList` | `GET /artist/list` | 歌手分类列表(type/area/initial) |
| `getArtistNewMv` | `GET /artist/new/mv` | 关注歌手新MV(limit) |

#### 11.2.2 ArtistDetailScreen 重构

| 新增功能 | 说明 |
|---------|------|
| **5 Tab 切换** | 热门歌曲 / 全部歌曲 / 专辑 / MV / 视频，药丸形 Tab 栏 |
| **关注按钮** | 右上角「+ 关注」/「已关注」按钮，乐观更新粉丝数，未登录跳转登录页 |
| **粉丝数** | 调用 `/artist/follow/count`，与歌曲数/专辑数并列显示 |
| **完整简介** | 调用 `/artist/desc` 获取详细描述，支持展开/收起 |
| **全部歌曲** | 分页加载 + 最热/最新排序切换 + 播放全部 |
| **专辑 Tab** | 3列网格，点击跳转 AlbumDetail |
| **MV Tab** | 2列网格 + 播放图标覆盖层，点击跳转 MvPlayer |
| **视频 Tab** | 2列网格 + cursor 分页 |

#### 11.2.3 ArtistListScreen 新建

| 功能 | 说明 |
|------|------|
| **类型筛选** | 全部 / 男歌手 / 女歌手 / 乐队 |
| **地区筛选** | 全部 / 华语 / 欧美 / 日本 / 韩国 / 其他 |
| **首字母索引** | A-Z 横向滚动条 + 热门 |
| **歌手网格** | 3列，圆形头像 + 姓名 + 歌曲数 |
| **分页加载** | FlatList onEndReached |
| **入口路径** | 首页「热门歌手」→「更多」按钮 |

#### 11.2.4 改动文件清单

| 文件 | 改动类型 | 改动量 |
|------|---------|--------|
| `app/api/artist.ts` | API 全面扩展 | +12 函数 |
| `app/screens/ArtistDetailScreen.tsx` | 全面重写 | ~450 行 |
| `app/screens/ArtistListScreen.tsx` | **新建** | ~240 行 |
| `app/types/navigation.ts` | 新增路由类型 | +1 行 |
| `app/navigation/MainTabNavigator.tsx` | 注册路由 + import | +2 行 |
| `app/screens/HomeScreen.tsx` | 「更多」按钮指向 | 1 行 |
| `app/api/index.ts` | 导出更新 | +12 导出 |



| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 歌手分类列表 | `GET /artist/list` | type/area/initial筛选 | ❌ |
| 歌手热门50首 | `GET /artist/top/song` | 歌手最热50首歌(id) | ❌ |
| 歌手全部歌曲 | `GET /artist/songs` | 按热门/时间排序 分页(id) | ❌ |
| 歌手描述 | `GET /artist/desc` | 歌手简介/描述(id) | ❌ |
| 歌手详情动态 | `GET /artist/detail/dynamic` | 是否关注/视频数(id) | ❌ |
| 收藏/取消歌手 | `POST /artist/sub` | id+t(1收藏) | ✅ |
| 收藏的歌手列表 | `GET /artist/sublist` | 分页 | ✅ |
| 歌手粉丝 | `GET /artist/fans` | 粉丝列表 分页(id) | ❌ |
| 歌手粉丝数量 | `GET /artist/follow/count` | 粉丝数(id) | ❌ |
| 歌手视频 | `GET /artist/video` | 歌手相关视频 分页(id) | ❌ |

### 11.3 歌单模块增强 🟡 中优先级

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 歌单分类 | `GET /playlist/catlist` | 所有歌单分类 | ❌ |
| 热门歌单分类 | `GET /playlist/hot` | 热门分类标签 | ❌ |
| 网友精选碟 | `GET /top/playlist` | order/cat/limit/offset | ❌ |
| 精品歌单标签 | `GET /playlist/highquality/tags` | 精品歌单标签列表 | ❌ |
| 精品歌单 | `GET /top/playlist/highquality` | cat/before/limit | ❌ |
| 更新歌单信息 | `POST /playlist/update` | 改名字/描述/tag | ✅ |
| 更新歌单描述 | `POST /playlist/desc/update` | 单独改描述 | ✅ |
| 更新歌单名 | `POST /playlist/name/update` | 单独改名 | ✅ |
| 更新歌单标签 | `POST /playlist/tags/update` | 单独改标签 | ✅ |
| 歌单封面上传 | `POST /playlist/cover/update` | 上传封面图 | ✅ |
| 调整歌单顺序 | `POST /playlist/order/update` | ids数组排序 | ✅ |
| 歌单收藏者 | `GET /playlist/subscribers` | 收藏者列表 分页 | ❌ |
| 歌单详情动态 | `GET /playlist/detail/dynamic` | 评论数/收藏数/播放数 | ❌ |
| 更新歌单播放量 | `POST /playlist/update/playcount` | 更新播放计数(id) | ❌ |
| 相关歌单推荐 | `GET /playlist/detail/rcmd/get` | 歌单相关推荐(id) | ❌ |
| 歌单导入-任务状态 | `GET /playlist/import/task/status` | 查询导入任务进度 | ✅ |

### 11.4 社区/社交功能 🟡 中优先级

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 动态列表 | `GET /event` | 朋友动态 分页 | ✅ |
| 转发用户动态 | `POST /event/forward` | 转发 + 评论 | ✅ |
| 删除用户动态 | `POST /event/del` | 删除动态(evId) | ✅ |
| 分享资源到动态 | `POST /share/resource` | 分享歌曲/歌单/MV/电台/专辑 | ✅ |
| 获取动态评论 | `GET /comment/event` | 动态评论区(threadId) | ✅ |
| 私信和通知数量 | `GET /pl/count` | 消息数量统计 | ✅ |
| 私信列表 | `GET /msg/private` | 分页私信 | ✅ |
| 发送文本私信 | `POST /send/text` | user_ids+msg | ✅ |
| 发送歌曲私信 | `POST /send/song` | user_ids+id+msg | ✅ |
| 发送专辑私信 | `POST /send/album` | user_ids+id+msg | ✅ |
| 发送歌单私信 | `POST /send/playlist` | user_ids+playlist+msg | ✅ |
| 私信内容 | `GET /msg/private/history` | 与某用户的历史私信(uid) | ✅ |
| 评论通知 | `GET /msg/comments` | 评论/回复通知(uid) | ✅ |
| @我通知 | `GET /msg/forwards` | @提及通知 | ✅ |
| 系统通知 | `GET /msg/notices` | 系统通知 | ✅ |
| 最近联系人 | `GET /msg/recentcontact` | 最近私信联系人 | ✅ |
| 热门话题 | `GET /hot/topic` | 热门话题 分页 | ❌ |
| 话题详情 | `GET /topic/detail` | 话题详情(actid) | ❌ |
| 话题热门动态 | `GET /topic/detail/event/hot` | 话题下热门动态(actid) | ❌ |

### 11.5 相似推荐 🟡 中优先级

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 相似歌曲 | `GET /simi/song` | 基于歌曲id推荐相似歌曲 | ❌ |
| 相似歌单 | `GET /simi/playlist` | 基于歌曲id推荐相似歌单 | ❌ |
| 相似MV | `GET /simi/mv` | 基于mvid推荐相似MV | ❌ |
| 相似歌手 | `GET /simi/artist` | 基于歌手id推荐相似歌手 | ❌ |
| 最近听了这首歌的用户 | `GET /simi/user` | 最近5个听了这首歌的用户(id) | ❌ |

### 11.6 每日/个性推荐增强 🟡 中优先级

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 每日推荐歌单 | `GET /recommend/resource` | 每日个性化推荐歌单 | ✅ |
| 每日推荐歌曲 | `GET /recommend/songs` | 每日30首推荐歌曲 | ✅ |
| 日推不感兴趣 | `POST /recommend/songs/dislike` | 标记不感兴趣并返回新歌(id) | ✅ |
| 历史日推日期 | `GET /history/recommend/songs` | 可用历史日推日期列表 | ✅ |
| 历史日推详情 | `GET /history/recommend/songs/detail` | 指定日期的日推(date) | ✅ |
| 私人FM | `GET /personal_fm` | 私人FM模式（已有入口，待完善） | ✅ |
| FM模式选择 | `GET /personal/fm/mode` | aidj/DEFAULT/FAMILIAR/EXPLORE/SCENE_RCMD | ✅ |
| FM垃圾桶 | `POST /fm_trash` | 从FM移入垃圾桶(id) | ✅ |

### 11.7 评论增强 🟢 低优先级

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 楼层评论 | `GET /comment/floor` | 子评论(parentCommentId+type+id) | ❌ |
| 新版评论接口 | `GET /comment/new` | 分页+排序(推荐/热度/时间) | ❌ |
| 视频评论 | `GET /comment/video` | 视频评论区(id) | ❌ |
| 电台节目评论 | `GET /comment/dj` | DJ节目评论区(id) | ❌ |
| 批量评论统计 | `GET /comment/info/list` | 多资源评论数(type+ids) | ❌ |
| 举报评论 | `POST /comment/report` | 举报(id+cid+reason) | ✅ |
| 抱一抱评论 | `POST /hug/comment` | 抱评论(uid+cid+sid) | ✅ |
| 抱一抱列表 | `GET /comment/hug/list` | 评论抱抱列表 | ❌ |

### 11.8 新碟上架/专辑增强 🟢 低优先级

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 新碟上架 | `GET /top/album` | area/type/year/month | ❌ |
| 全部新碟 | `GET /album/new` | area+分页 | ✅ |
| 最新专辑 | `GET /album/newest` | 首页新碟数据（已有入口） | ❌ |
| 专辑歌曲音质 | `GET /album/privilege` | 专辑各歌曲音质信息(id) | ❌ |

### 11.9 MV 增强 🟢 低优先级

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 收藏/取消MV | `POST /mv/sub` | mvid+t(1收藏) | ✅ |
| 收藏的MV列表 | `GET /mv/sublist` | 分页 | ✅ |
| MV排行 | `GET /top/mv` | area/limit/offset | ❌ |
| MV点赞评论数据 | `GET /mv/detail/info` | 点赞/转发/评论数(mvid) | ❌ |
| 最新MV | `GET /mv/first` | area/limit | ❌ |
| 网易出品MV | `GET /mv/exclusive/rcmd` | limit/offset | ❌ |

### 11.10 电台/DJ 模块 🟢 低优先级 — 完全未实现

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 电台Banner | `GET /dj/banner` | 电台轮播图 | ❌ |
| 电台个性推荐 | `GET /dj/personalize/recommend` | 个性推荐电台(limit) | ❌ |
| 电台订阅者 | `GET /dj/subscriber` | 订阅者列表(id+time+limit) | ❌ |
| 用户电台 | `GET /user/audio` | 用户创建的电台(uid) | ❌ |
| 热门电台 | `GET /dj/hot` | limit/offset | ❌ |
| 电台分类 | `GET /dj/catelist` | 电台类型列表 | ✅ |
| 电台分类推荐 | `GET /dj/recommend/type` | 按类型推荐电台(type) | ✅ |
| 推荐电台 | `GET /dj/recommend` | 推荐电台 | ✅ |
| 电台详情 | `GET /dj/detail` | 电台详情介绍(rid) | ✅ |
| 电台节目 | `GET /dj/program` | 节目列表(rid+limit+offset+asc) | ✅ |
| 电台节目详情 | `GET /dj/program/detail` | 节目详情(id) | ❌ |
| 订阅/取消电台 | `POST /dj/sub` | rid+t(1订阅) | ✅ |
| 订阅的电台列表 | `GET /dj/sublist` | 我订阅的电台 | ✅ |
| 电台节目榜 | `GET /dj/program/toplist` | limit/offset | ✅ |
| 付费精品电台 | `GET /dj/toplist/pay` | limit | ❌ |
| 24小时节目榜 | `GET /dj/program/toplist/hours` | limit | ❌ |
| 24小时主播榜 | `GET /dj/toplist/hours` | limit | ❌ |
| 主播新人榜 | `GET /dj/toplist/newcomer` | limit | ❌ |
| 最热主播榜 | `GET /dj/toplist/popular` | limit | ❌ |
| 热门/新晋电台榜 | `GET /dj/toplist` | type(新/hot)+分页 | ✅ |
| 类别热门电台 | `GET /dj/radio/hot` | cateId+分页 | ❌ |
| 付费精选电台 | `GET /dj/paygift` | limit/offset | ❌ |
| 电台非热门类型 | `GET /dj/category/excludehot` | 非热门分类 | ✅ |
| 电台推荐类型 | `GET /dj/category/recommend` | 推荐分类 | ✅ |
| 电台今日优选 | `GET /dj/today/perfered` | 今日优选内容 | ✅ |
| DIFM电台系列 | `/dj/difm/*` | DIFM分类/收藏/播放 | ✅ |

### 11.11 视频模块 🟢 低优先级 — 完全未实现

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 视频标签列表 | `GET /video/group/list` | 视频分类标签 | ❌ |
| 视频分类列表 | `GET /video/category/list` | 视频分类 | ❌ |
| 标签/分类下视频 | `GET /video/group` | id+offset | ❌ |
| 全部视频列表 | `GET /video/timeline/all` | offset | ❌ |
| 推荐视频 | `GET /video/timeline/recommend` | offset | ❌ |
| 视频详情 | `GET /video/detail` | 视频详情(id) | ❌ |
| 视频播放地址 | `GET /video/url` | 获取播放地址(id) | ❌ |
| 视频点赞数据 | `GET /video/detail/info` | 点赞/转发/评论数(vid) | ❌ |
| 相关视频 | `GET /related/allvideo` | 视频相关推荐(id) | ❌ |
| 收藏视频 | `POST /video/sub` | id+t(1收藏) | ✅ |
| 最近播放视频 | `GET /playlist/video/recent` | 最近播放的视频 | ✅ |

### 11.12 云盘功能 🟢 低优先级 — 完全未实现

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 云盘文件列表 | `GET /user/cloud` | limit/offset | ✅ |
| 云盘数据详情 | `GET /user/cloud/detail` | 歌曲详情(id) | ✅ |
| 删除云盘歌曲 | `POST /user/cloud/del` | 删除(id) | ✅ |
| 上传到云盘 | `POST /cloud` | multipart上传mp3 | ✅ |
| 云盘导入歌曲 | `POST /cloud/import` | 免上传匹配导入 | ✅ |
| 云盘歌曲匹配纠正 | `POST /cloud/match` | uid+sid+asid | ✅ |
| 云盘歌词 | `GET /cloud/lyric/get` | 获取云盘歌曲内置歌词(uid+sid) | ✅ |

### 11.13 VIP/签到/云贝 🟢 低优先级

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 签到 | `POST /daily_signin` | type(0安卓/1web) | ✅ |
| 签到进度 | `GET /signin/progress` | moduleId | ❌ |
| 乐签信息 | `GET /sign/happy/info` | 乐签信息 | ❌ |
| VIP信息 | `GET /vip/info` | 当前VIP信息(uid可选) | ✅ |
| VIP信息(app) | `GET /vip/info/v2` | app版VIP信息 | ✅ |
| VIP成长值 | `GET /vip/growthpoint` | 会员成长值 | ✅ |
| VIP成长值记录 | `GET /vip/growthpoint/details` | 获取记录 limit/offset | ✅ |
| VIP任务 | `GET /vip/tasks` | 会员任务 | ✅ |
| 领取VIP成长值 | `POST /vip/growthpoint/get` | ids | ✅ |
| 黑胶乐签打卡 | `POST /vip/sign` | 黑胶乐签 | ✅ |
| 黑胶乐签信息 | `GET /vip/sign/info` | 打卡信息 | ✅ |
| 云贝 | `GET /yunbei` | 签到信息 | ✅ |
| 云贝今日签到 | `GET /yunbei/today` | 今日签到获取数 | ✅ |
| 云贝签到 | `POST /yunbei/sign` | 执行签到 | ✅ |
| 云贝账户 | `GET /yunbei/info` | 账户云贝数 | ✅ |
| 云贝所有任务 | `GET /yunbei/tasks` | 所有任务 | ✅ |
| 云贝todo任务 | `GET /yunbei/tasks/todo` | todo任务 | ✅ |
| 云贝完成任务 | `POST /yunbei/task/finish` | userTaskId+depositCode | ✅ |
| 云贝收入 | `GET /yunbei/tasks/receipt` | limit/offset | ✅ |
| 云贝支出 | `GET /yunbei/tasks/expense` | limit/offset | ✅ |
| 云贝推歌 | `POST /yunbei/rcmd/song` | id+reason+yunbeiNum | ✅ |
| 云贝推歌历史 | `GET /yunbei/rcmd/song/history` | size+cursor | ✅ |

### 11.14 高级功能 🟢 低优先级

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 音乐百科 | `GET /song/wiki/summary` | 歌曲音乐百科简要信息(id) | ❌ |
| 曲风列表 | `GET /style/list` | 所有曲风及tagId | ❌ |
| 曲风偏好 | `GET /style/preference` | 我的曲风偏好 | ✅ |
| 曲风详情 | `GET /style/detail` | 曲风描述(tagId) | ❌ |
| 曲风-歌曲 | `GET /style/song` | 曲风下歌曲(tagId) | ❌ |
| 曲风-专辑 | `GET /style/album` | 曲风下专辑(tagId) | ❌ |
| 曲风-歌单 | `GET /style/playlist` | 曲风下歌单(tagId) | ❌ |
| 曲风-歌手 | `GET /style/artist` | 曲风下歌手(tagId) | ❌ |
| 回忆坐标 | `GET /music/first/listen/info` | 回忆坐标信息(id) | ❌ |
| 年度听歌报告 | `GET /summary/annual` | 年度报告(year) | ✅ |
| 音乐日历 | `GET /calendar` | startTime+endTime | ✅ |
| 私人DJ | `GET /aidj/content/rcmd` | 私人DJ推荐(longitude/latitude) | ❌ |
| 跑步漫游 | `GET /radio/sport/get` | 按步频推荐歌曲(bpm) | ❌ |
| 听歌识曲 | `POST /audio/match` | 音频指纹识别(duration+audioFP) | ❌ |
| 歌曲创作者 | `GET /song/creators` | 歌曲创作者信息(id) | ❌ |
| 歌曲动态封面 | `GET /song/dynamic/cover` | 动态封面(id) | ✅ |
| 副歌时间 | `GET /song/chorus` | 副歌起始时间(id) | ❌ |
| 歌曲音质详情 | `GET /song/music/detail` | 各音质文件信息(id) | ❌ |
| 灰色歌曲版本推荐 | `GET /song/copyright/rcmd` | 可播放版本推荐(songid) | ❌ |
| 歌曲红心数量 | `GET /song/red/count` | 红心用户数(id) | ❌ |
| 歌曲是否喜爱 | `GET /song/like/check` | 批量判断(ids数组) | ✅ |
| 客户端下载新版 | `GET /song/download/url/v1` | 非VIP获取高音质下载(id+level) | ❌ |
| 灰歌解灰 | `GET /song/url/match` | 直接获取灰色歌曲链接(id) | ❌ |
| 歌曲是否可用 | `GET /check/music` | 检测版权(id+br) | ❌ |
| 乐谱列表 | `GET /sheet/list` | 歌曲乐谱列表(id) | ❌ |
| 乐谱内容 | `GET /sheet/preview` | 乐谱详情(id) | ✅ |
| 热门歌手 | `GET /top/artists` | 热门歌手 limit/offset | ❌ |
| 歌手榜 | `GET /toplist/artist` | type(华语/欧美/韩国/日本) | ❌ |
| 播客搜索 | `GET /voicelist/search` | keyword+limit+offset | ❌ |
| 播客列表 | `GET /voicelist/list` | voiceListId+分页 | ❌ |
| 播客声音搜索 | `GET /voicelist/list/search` | 多种筛选参数 | ❌ |
| 播客声音详情 | `GET /voice/detail` | id(voiceId) | ❌ |
| 播客声音排序 | `POST /voicelist/trans` | 调整声音顺序 | ✅ |
| 播客列表详情 | `GET /voicelist/detail` | id(voiceListId) | ❌ |
| 播客删除 | `POST /voice/delete` | ids | ✅ |
| 播客上传声音 | `POST /voice/upload` | 上传音频+元数据 | ✅ |
| 我创建的播客 | `GET /voicelist/my/created` | 我创建的播客声音 | ✅ |
| 声音歌词 | `GET /voice/lyric` | 获取声音歌词(id) | ❌ |

### 11.15 UGC/百科/音乐人 ⚪ 专业功能

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 专辑百科 | `GET /ugc/album/get` | 专辑简要百科(id) | ✅ |
| 歌曲百科 | `GET /ugc/song/get` | 歌曲简要百科(id) | ✅ |
| 歌手百科 | `GET /ugc/artist/get` | 歌手简要百科(id) | ✅ |
| MV百科 | `GET /ugc/mv/get` | MV简要百科(id) | ✅ |
| 搜索歌手(UGC) | `GET /ugc/artist/search` | keyword+limit | ✅ |
| 用户贡献内容 | `GET /ugc/detail` | type+auditStatus+分页 | ✅ |
| 用户贡献统计 | `GET /ugc/user/devote` | 贡献条目/积分/云贝 | ✅ |
| 音乐人数据概况 | `GET /musician/data/overview` | 统计数据 | ✅ |
| 音乐人播放趋势 | `GET /musician/play/trend` | startTime+endTime | ✅ |
| 音乐人任务 | `GET /musician/tasks` | 任务列表 | ✅ |
| 音乐人任务(新) | `GET /musician/tasks/new` | 新版任务 | ✅ |
| 音乐人VIP任务 | `GET /musician/vip/tasks` | 黑胶会员任务 | ✅ |
| 账号云豆数 | `GET /musician/cloudbean` | 音乐人云豆 | ✅ |
| 领取云豆 | `POST /musician/cloudbean/obtain` | id+period | ✅ |
| 音乐人签到 | `POST /musician/sign` | 签到 | ✅ |

### 11.16 数字专辑 🔵 增值功能

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 数字专辑-新碟 | `GET /album/list` | limit/offset | ❌ |
| 数字专辑榜单 | `GET /album/songsaleboard` | type+year+albumType | ❌ |
| 语种风格馆 | `GET /album/list/style` | area+分页 | ❌ |
| 数字专辑详情 | `GET /album/detail` | 专辑详情(id) | ❌ |
| 我的数字专辑 | `GET /digitalAlbum/purchased` | 已购数字专辑 | ✅ |
| 购买数字专辑 | `POST /digitalAlbum/ordering` | id+payment+quantity | ✅ |
| 数字专辑详情 | `GET /digitalAlbum/detail` | 专辑信息(id) | ❌ |
| 数字专辑销量 | `GET /digitalAlbum/sales` | ids(多个用逗号分隔) | ❌ |

### 11.17 听歌足迹 🔵 数据功能

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 年度听歌足迹 | `GET /listen/data/year/report` | 年度数据 | ✅ |
| 今日收听 | `GET /listen/data/today/song` | 今日收听 | ✅ |
| 总收听时长 | `GET /listen/data/total` | 总时长 | ✅ |
| 周/月收听时长 | `GET /listen/data/realtime/report` | type(week/month) | ✅ |
| 周/月/年收听报告 | `GET /listen/data/report` | type+endTime | ✅ |

### 11.18 其他功能

| API | 接口地址 | 功能说明 | 需要登录 |
|-----|---------|---------|:---:|
| 首页-圆形图标 | `GET /homepage/dragon/ball` | 首页圆形入口列表 | ❌ |
| 热门评论列表 | `GET /comment/hotwall/list` | 云村热评(已下架) | ✅ |
| 国家编码列表 | `GET /countries/code/list` | 国家编码 | ❌ |
| 用户创建歌单 | `GET /user/playlist/create` | 仅创建的歌单(uid) | ❌ |
| 用户收藏歌单 | `GET /user/playlist/collect` | 仅收藏的歌单(uid) | ❌ |
| PC搜索建议 | `GET /search/suggest/pc` | PC端搜索建议 | ❌ |
| 默认搜索关键词 | `GET /search/default` | 默认搜索词 | ❌ |
| 喜欢歌曲-新版 | `POST /song/like` | id+uid+like(bool) | ✅ |
| 最近播放-各类 | `/record/recent/*` | 歌曲/视频/声音/歌单/专辑/播客 | ✅ |
| 已购单曲 | `GET /song/purchased` | 已购买单曲 | ✅ |
| 关注歌手新歌 | `GET /artist/new/song` | limit+before | ✅ |
| 关注歌手新MV | `GET /artist/new/mv` | limit+before | ✅ |
| 注册/改密码 | `POST /register/cellphone` | 手机注册 | ❌ |
| 手机号检测 | `GET /cellphone/existence/check` | 是否已注册 | ❌ |
| 初始化昵称 | `POST /activate/init/profile` | 新账号初始化昵称 | ✅ |
| 重复昵称检测 | `GET /nickname/check` | 检测+提供备选 | ❌ |
| 换绑手机 | `POST /rebind` | 更换绑定手机 | ✅ |
| 用户绑定手机 | `POST /user/replacephone` | 更换绑定 | ✅ |
| 获取设置 | `GET /setting` | 用户设置 | ✅ |
| 内部版本 | `GET /inner/version` | API版本 | ❌ |
| Batch批量请求 | `GET/POST /batch` | 批量请求接口 | ✅ |
| 搜索多重匹配 | `GET /search/multimatch` | 一次搜索多类型 | ❌ |
| 本地歌曲匹配 | `GET /search/match` | 本地文件匹配网易信息 | ❌ |
| 验证接口 | `/verify/*` | 二维码验证(关注等操作触发) | ❌ |
| 一起听 | 多个接口 | 主机/从机模式 | ✅ |
| 歌单导入 | `GET /playlist/import/name/task/create` | 元数据/文字/链接 | ✅ |
| 歌词摘录 | `/song/lyrics/mark/*` | 添加/修改/删除/列表 | ✅ |
| 黑胶时光机 | `GET /vip/timemachine` | startTime+endTime+limit | ✅ |
| 会员下载记录 | `GET /song/downlist` | limit/offset | ✅ |
| 本月下载记录 | `GET /song/monthdownlist` | limit/offset | ✅ |
| 已购买单曲 | `GET /song/singledownlist` | limit/offset | ✅ |
| 当前关注用户 | `GET /user/follow/mixed` | scene+size+cursor | ✅ |
| 电台排行榜 | `GET /djRadio/top` | djRadioId+sortIndex | ❌ |
| 助眠解压 | `/sati/*` | 特定时间场景/标签/收藏 | ❌ |
| 广播电台 | `/broadcast/*` | 分类/收藏/信息/全部电台 | ✅ |
| DIFM电台 | `/dj/difm/*` | 分类/收藏/播放 | ✅ |

---

### 11.19 实现优先级总结

| 优先级 | 模块 | 接口数量 | 预估工时 | 状态 |
|--------|------|---------|---------|:---:|
| 🔴 **P0-高** | 用户体系增强 | ~24 | 3-5天 | 🚧 阶段一完成 (14/24) |
| 🔴 **P0-高** | 歌手模块增强 | ~10 | 2-3天 | ✅ 已完成 (10/10) |
| 🟡 **P1-中** | 歌单模块增强 | ~16 | 3-4天 | ⬜ 待开发 |
| 🟡 **P1-中** | 社区/社交功能 | ~19 | 5-7天 | ⬜ 待开发 |
| 🟡 **P1-中** | 相似推荐 | ~5 | 1-2天 | ⬜ 待开发 |
| 🟡 **P1-中** | 每日推荐增强 | ~8 | 2-3天 | ⬜ 待开发 |
| 🟢 **P2-低** | 评论增强 | ~8 | 2-3天 | ⬜ 待开发 |
| 🟢 **P2-低** | 新碟上架/专辑增强 | ~4 | 1天 | ⬜ 待开发 |
| 🟢 **P2-低** | MV增强 | ~6 | 2天 | ⬜ 待开发 |
| 🟢 **P2-低** | 电台/DJ模块 | ~26 | 5-7天 | ⬜ 待开发 |
| 🟢 **P2-低** | 视频模块 | ~11 | 4-5天 | ⬜ 待开发 |
| 🟢 **P2-低** | 云盘功能 | ~7 | 2-3天 | ⬜ 待开发 |
| 🟢 **P2-低** | VIP/签到/云贝 | ~22 | 3-5天 | ⬜ 待开发 |
| 🟢 **P2-低** | 高级功能 | ~36 | 5-8天 | ⬜ 待开发 |
| ⚪ **P3-专业** | UGC/百科/音乐人 | ~14 | 3-5天 | ⬜ 待开发 |
| 🔵 **P3-增值** | 数字专辑 | ~8 | 2-3天 | ⬜ 待开发 |
| 🔵 **P3-数据** | 听歌足迹 | ~5 | 1-2天 | ⬜ 待开发 |
| 🔵 **P3-其他** | 杂项功能 | ~28 | 5-8天 | ⬜ 待开发 |

> **进度**：2/18 模块已完成，11.1 + 11.2 共完成 24/34 项。P0 高优先级模块全部完成。
> 建议按优先级分批实现，P0 优先补齐核心体验，P1 增强社区互动，P2/P3 按需逐步迁移。

---

## Phase 12：播放模块终极修复 ✅ 已完成

> 完成时间：2026-05-21
> 修复 Bug 36-38，共 12 项，播放模块正式宣布完工

### 12.1 音源解析引擎修复（Bug 36）

| 修复项 | 文件 | 说明 |
|--------|------|------|
| 响应解析修正 | `musicParserService.ts` | `data[0].url` → `data.url`（API 返回对象非数组） |
| source 列表补全 | `musicParserService.ts` | 对齐服务端：`bodian/qq/migu/kugou/kuwo/pyncmd` |
| 坏缓存自动清除 | `usePlayer.ts` | `reloadAndPlay` 时 `invalidateCache(id)` |
| GDMusic 源优化 | `musicParserService.ts` | netease → joox → tidal，搜索数 1→3 |
| 失败缓存 | `musicParserService.ts` | `failedCacheMap`，1分钟内跳过已知失败策略 |
| OfficialApiStrategy | `musicParserService.ts` | 禁用（`unblock=true` 从未生效，省请求） |
| CustomApiStrategy | `musicParserService.ts` | 禁用（未配置时跳过） |

**效果**：灰色歌曲通过 `POST /song/url/match?source=bodian` 解灰，播放链路一步到位。

### 12.2 锁屏/通知栏切歌修复（Bug 37）

| 修复项 | 文件 | 说明 |
|--------|------|------|
| 移除重复 RemoteNext 监听 | `playbackService.ts` | 统一由 `trackPlayerService.ts` 处理 |
| JS fallback 机制 | `trackPlayerService.ts` | 队列无下一首时触发 `onManualNextCallback` |
| ManualNext 回调 | `usePlayer.ts` | 完整手动切歌逻辑（顺序/随机/循环） |

**效果**：锁屏/通知栏/灵动岛「上一首→下一首」完美工作。

### 12.3 防御性修复（Bug 38）

| 修复项 | 文件 | 说明 |
|--------|------|------|
| 重试上限 | `usePlayer.ts` | `reloadAndPlay` 复用 `MAX_CONSECUTIVE_FAILS=5` |
| RemotePrev 双重触发 | `usePlayer.ts` | 回调执行后立即清 AsyncStorage pending |
| LOOP 模式去重 | `trackPlayerService.ts` | `addNextToQueue` 同 ID 跳过 |

### 12.4 当前策略链

```
播放请求 → UnblockApiMatch (bodian→qq→migu→kugou→kuwo→pyncmd→auto)
          → GDMusic (netease→joox→tidal)
          → LxMusic
          → UnblockMusicService
          → FallbackApi
```

不再调用注定失败的 `/song/url/v1?unblock=true`，每首歌节省一次 HTTP 请求。

### 12.5 当前架构状态

```
APP 内按钮    → usePlayer.next()/prev()  → 手动 + 原生队列 skipToNext
锁屏/通知栏   → RemoteNext/RemotePrev    → TrackPlayerService 统一处理
预加载        → preloadAndEnqueueNext    → addNextToQueue
原生切换      → ActiveTrackChanged       → handleActiveTrackChanged
播放失败      → PlaybackError            → reloadAndPlay (上限5次)
播放结束      → PlaybackEnd              → JS fallback (上限5次)
```

### 12.6 已知遗留（低优先级）

| 项目 | 说明 |
|------|------|
| `next()`/`ManualNext` 顺序模式末尾行为 | 绕回第一首 vs `playlistStore.nextPlay()` 停止，行为与桌面端一致 |
| RemotePlay/RemotePause 双重监听 | `playbackService.ts` 和 `trackPlayerService.ts` 各注册一份，无功能影响（简单 play/pause） |
| `doPlaySong` UI 状态更新早于播放成功 | `setIsPlay(true)` 在 `tpPlaySong()` 之前，极端网络延迟下可能短暂显示错误状态 |

---

## Phase 13：歌手详情页 UI 修复 + MV 播放音频冲突 ✅ 已完成

> 完成时间：2026-05-21
> 修复 Bug 39-42，共 4 项

### 13.1 歌手详情页布局重构（Bug 39-41）

#### Bug 39：Tab 内容区域完全空白

**现象**：歌手详情页中"热门/全部/专辑/MV/视频"五个 Tab 栏显示正常，但切换后所有 Tab 内容区域完全空白，歌曲列表、专辑网格、MV 卡片均不可见。

**根因**：布局采用 `外层 View → 头部 ScrollView + Tab Content View(flex:1)` 结构，头部 ScrollView 默认 `flexGrow: 1`，占据全部可用空间，导致下层 Tab Content View 高度为 0。

**修复**：
- 将整个页面改为**统一 ScrollView**：封面、简介、相似歌手、Tab 栏、Tab 内容全部在同一个 `ScrollView` 内
- 使用 `contentContainerStyle: { minHeight: 95vh }` 保证内容少的 Tab 也能占满屏幕
- 热门 Tab 的 `SongList`（FlatList）替换为直接 `SongItem` 渲染，避免 FlatList 嵌套 ScrollView 冲突

**涉及文件**：`app/screens/ArtistDetailScreen.tsx`

---

#### Bug 40：简介展开后收起，页面不自动回顶部

**现象**：简介文本较长时点击"展开"，滚动到底部阅读完，再点击"收起"后页面仍停留在底部，用户需要手动滚回顶部才能看到 Tab 内容。

**修复**：
- 添加 `scrollViewRef = useRef<ScrollView>(null)`
- 监听 `showFullDesc` 和 `activeTab` 变化：`scrollViewRef.current?.scrollTo({ y: 0, animated: true })`
- 切换 Tab 时也会自动滚到顶部

**涉及文件**：`app/screens/ArtistDetailScreen.tsx`

---

#### Bug 41：专辑 Tab 仅显示 2 列 + 底部内容被遮挡

**现象 1**：专辑网格只有 2 列，而非设计要求的 3 列。

**根因**：`ALBUM_CARD_SIZE` 计算公式使用 `Spacing.lg` 计算边距，但 `albumGrid` 容器实际使用 `Spacing.md` padding，导致 `3 * 卡片宽 + 3 * marginRight` 超出容器可用宽度，自动折行为 2 列。

**修复**：
- `ALBUM_CARD_SIZE = (SCREEN_WIDTH - Spacing.md * 2 - Spacing.md * 2) / 3`（容器实际 padding + 间距）
- `albumRow` 改用 `gap: Spacing.md`，移除每张卡片的 `marginRight`

**现象 2**：页面底部的歌单列表被 MiniPlayer 和虚拟按键区域遮挡。

**修复**：ScrollView 添加 `contentContainerStyle: { paddingBottom: 80 }`，保证最底部内容在 MiniPlayer 上方可见。

**涉及文件**：`app/screens/ArtistDetailScreen.tsx`

---

### 13.2 MV 播放页面音频冲突修复（Bug 42）

#### Bug 42：进入 MV 播放页面后歌曲自动播放

**现象**：从歌手详情页 MV Tab 点击进入 MV 播放页面后，TrackPlayer 的音乐与 MV 视频的音频同时播放，导致两路音频重叠。

**根因**：`MvPlayerScreen` 使用 `expo-av` Video 组件独立播放视频音频，未暂停 TrackPlayer，两者同时输出。

**修复**：
- 进入 MV 页面时：`TrackPlayer.pause()` — 暂停音乐播放，避免音频重叠
- 离开 MV 页面时：`TrackPlayer.play()` — 恢复音乐播放，用户可继续听歌
- 增加 `import TrackPlayer from 'react-native-track-player'`

**涉及文件**：`app/screens/MvPlayerScreen.tsx`

---

### 13.3 当前架构状态

```
歌手详情页
├── 统一 ScrollView（不再分头部+内容两个区域）
│   ├── 封面区（歌手头像 + 名称 + 关注按钮）
│   ├── 简介区（可展开/收起 → 自动滚回顶部）
│   ├── 相似歌手（横向滚动卡片）
│   ├── Tab 栏（热门/全部/专辑/MV/视频）
│   └── Tab 内容（全部内联渲染，无 FlatList 嵌套）
│       ├── 热门：SongItem 直接渲染
│       ├── 全部：手动 map + 排序切换 + 分页加载
│       ├── 专辑：3 列网格布局
│       ├── MV：2 列卡片网格
│       └── 视频：2 列卡片网格 + 分页
└── contentContainerStyle: paddingBottom: 80（防 MiniPlayer 遮挡）

MV 播放页面
├── expo-av Video（视频 + 音频播放）
├── 进入时 pause TrackPlayer（防音频重叠）
└── 离开时 resume TrackPlayer（恢复音乐播放）
```
