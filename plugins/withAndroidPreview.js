const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const MARKER = `            crunchPngs enablePngCrunchInRelease.toBoolean()
        }
    }
    packagingOptions {`;

const REPLACEMENT = `            crunchPngs enablePngCrunchInRelease.toBoolean()
        }
        // 给 Android Studio 直接安装/出包。JS 会打进 APK，不依赖 Metro。
        // 依赖库通常只有 debug/release，所以回退到 release。
        preview {
            initWith release
            matchingFallbacks = ['release']
            signingConfig signingConfigs.debug
            minifyEnabled false
            shrinkResources false
            crunchPngs false
        }
    }
    packagingOptions {`;

/** 下次 expo prebuild 时把 preview 构建类型写回 android/app/build.gradle。 */
function withAndroidPreview(config) {
  config = withGradleProperties(config, (mod) => {
    const key = 'android.overridePathCheck';
    if (!mod.modResults.some((item) => item.type === 'property' && item.key === key)) {
      mod.modResults.push({ type: 'property', key, value: 'true' });
    }
    const archKey = 'reactNativeArchitectures';
    const arch = mod.modResults.find((item) => item.type === 'property' && item.key === archKey);
    if (arch) {
      arch.value = 'arm64-v8a';
    } else {
      mod.modResults.push({ type: 'property', key: archKey, value: 'arm64-v8a' });
    }
    return mod;
  });
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withAndroidPreview: app/build.gradle 不是 Groovy');
    }
    if (mod.modResults.contents.includes('\n        preview {')) {
      return mod;
    }
    if (!mod.modResults.contents.includes(MARKER)) {
      throw new Error('withAndroidPreview: 没找到 release 构建类型，无法插入 preview');
    }
    mod.modResults.contents = mod.modResults.contents.replace(MARKER, REPLACEMENT);
    return mod;
  });
}

module.exports = withAndroidPreview;
