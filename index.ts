import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';
import { PlaybackService } from './app/services/playbackService';

// 注册 TrackPlayer 后台播放服务（必须在 App 组件之前）
TrackPlayer.registerPlaybackService(() => PlaybackService);

registerRootComponent(App);
