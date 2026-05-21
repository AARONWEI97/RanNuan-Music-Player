# 🎵 RanNuan Music Player

<div align="center">

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

**一款基于 React Native + Expo 的跨平台网易云音乐播放器**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [技术架构](#-技术架构) • [开发文档](#-开发文档)

</div>

---

## 📱 功能特性

### 🎧 核心播放
- **在线播放** - 网易云音乐全曲库在线播放
- **多音源解析** - 灰色歌曲自动解锁（5 种策略引擎）
- **后台播放** - 支持锁屏播放和通知栏/灵动岛控制
- **播放模式** - 顺序播放、单曲循环、随机播放
- **Picture Disc 黑胶** - 封面填满唱片旋转，独特辨识度
- **动态取色** - 每首歌提取主题色，背景渐变跟随封面
- **自定义进度条** - 手势拖动 + 圆形拖拽点

### 📝 歌词系统
- **逐字歌词** - 支持 YRC 逐字歌词动画
- **翻译歌词** - 中英双语歌词显示
- **点击跳转** - 点击歌词行跳转播放位置
- **自动滚动** - 歌词自动滚动跟随播放进度

### 💬 社交互动
- **歌曲评论** - 热门/最新 tab、楼层回复、点赞、发表评论
- **操作菜单** - 全场景三点按钮（下一首播放/收藏/下载/评论/删除）
- **歌单编辑** - 修改歌单名称、描述

### 📥 下载管理
- **离线下载** - 支持歌曲下载到本地
- **离线播放** - 已下载歌曲优先使用本地文件

### 📊 数据统计
- **播放历史** - 本周/所有播放记录
- **听歌热力图** - GitHub 风格日历热力，每日听歌频率
- **MV 播放** - 全屏 MV 播放页
- **本地音乐** - 扫描设备本地音乐文件

### 🎨 用户体验
- **暗色主题** - 完整的 Dark Mode 支持
- **狗狗主题** - 5 种主题模式
- **国际化** - 支持中文/英文切换
- **手势交互** - 下拉关闭播放页
- **错误处理** - 全局错误边界 + 友好提示

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn
- Expo CLI
- Android Studio / Xcode（用于原生构建）

### 安装依赖

```bash
# 克隆仓库
git clone https://github.com/AARONWEI97/RanNuan-Music-Player.git
cd RanNuan-Music-Player

# 安装依赖
npm install
```

### 开发运行

```bash
# 启动开发服务器
npm start

# Android
npm run android

# iOS
npm run ios
```

### 构建 APK

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 APK
eas build -p android --profile preview
```

---

## 🏗️ 技术架构

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | React Native 0.81 + Expo 54 | 跨平台移动应用框架 |
| 语言 | TypeScript 5.9 | 类型安全 |
| 状态管理 | Zustand 4.5 | 轻量级状态管理 |
| 路由 | React Navigation 7 | 标准导航方案 |
| 音频 | react-native-track-player | 后台播放支持 |
| HTTP | Axios | 网络请求 |
| 国际化 | i18next + react-i18next | 多语言支持 |

### 项目结构

```
├── app/
│   ├── api/              # API 接口层
│   ├── components/       # UI 组件
│   │   ├── common/       # 通用组件
│   │   ├── lyric/        # 歌词组件
│   │   ├── music/        # 音乐相关组件
│   │   ├── player/       # 播放器组件
│   │   └── ui/           # 基础 UI 组件
│   ├── constants/        # 常量配置
│   ├── hooks/            # 自定义 Hooks
│   ├── i18n/             # 国际化
│   ├── navigation/       # 路由配置
│   ├── screens/          # 页面组件
│   ├── services/         # 服务层
│   ├── store/            # Zustand Stores
│   ├── theme/            # 主题系统
│   ├── types/            # TypeScript 类型
│   └── utils/            # 工具函数
├── assets/               # 静态资源
├── App.tsx               # 应用入口
├── app.json              # Expo 配置
├── eas.json              # EAS Build 配置
└── package.json          # 依赖配置
```

---

## 📖 开发文档

详细的开发文档请查看 [MOBILE_DEV.md](./MOBILE_DEV.md)

### 开发进度

| Phase | 状态 | 核心功能 |
|-------|------|---------|
| Phase 1 | ✅ | 项目初始化 + 核心播放链 |
| Phase 2 | ✅ | 首页 + 搜索 + 登录 |
| Phase 3 | ✅ | 歌单/专辑/歌手详情 + 收藏 + 播放模式 |
| Phase 4 | ✅ | 歌词系统 |
| Phase 5 | ✅ | 音源解析 + 灰色歌曲解锁 |
| Phase 6 | ✅ | 下载管理 + 离线播放 |
| Phase 7 | ✅ | 暗色主题 + 国际化 + 错误处理 |

---

## 🔧 配置说明

### API 配置

移动端需要本地运行 `netease-cloud-music-api` 服务：

```bash
# 启动本地 API 服务（端口 3000）
npx NeteaseCloudMusicApi@latest
```

默认 API 地址配置为 `http://192.168.1.203:3000`（局域网 IP）。

> **注意**：手机和电脑必须在同一 WiFi 网络下，且 API 服务需要保持运行。

### 修改 API 地址

如需修改 API 地址，编辑以下文件：

- `app/constants/config.ts` — `DEFAULT_API_URL`
- `app/api/request.ts` — `DEFAULT_API_BASE_URL`

或在应用设置页面修改：`设置 → 网络 → API 地址`

### 音源解析配置

支持以下音源解析策略（按优先级降级）：

1. **官方 API** - 网易云音乐官方接口
2. **自定义 API** - 用户配置的第三方音源
3. **GD 音乐台** - GD 音乐台搜索匹配
4. **落雪音乐** - LxMusic API
5. **解锁服务** - UnblockNeteaseMusic 服务

配置路径：`设置 → 音源解析`

---

## 📦 依赖清单

### 核心依赖

```json
{
  "react": "19.1.0",
  "react-native": "0.81.5",
  "expo": "~54.0.33",
  "react-native-track-player": "^4.1.2",
  "zustand": "^4.5.0",
  "@react-navigation/native": "^7.2.4",
  "axios": "^1.16.1",
  "i18next": "^26.2.0",
  "react-i18next": "^17.0.8"
}
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) - 网易云音乐 API
- [react-native-track-player](https://github.com/doublesymmetry/react-native-track-player) - 音频播放器
- [Expo](https://expo.dev/) - React Native 开发平台

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！⭐**

Made with ❤️ by [AARONWEI97](https://github.com/AARONWEI97)

</div>
