const { withProjectBuildGradle } = require('expo/config-plugins');

const NEEDLE = `allprojects {
  repositories {
    google()`;

const REPLACEMENT = `allprojects {
  repositories {
    // Maven Central 在这台机器上会超时。react-android 因此没被下载，CMake 找不到 ReactAndroid。
    maven { url 'https://maven.aliyun.com/repository/public' }
    maven { url 'https://repo.huaweicloud.com/repository/maven' }
    google()`;

/** prebuild 会重写 android/，把国内镜像写回去，否则 ReactAndroid 再次下载失败。 */
function withAndroidMavenMirror(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withAndroidMavenMirror: android/build.gradle 不是 Groovy');
    }
    if (mod.modResults.contents.includes('maven.aliyun.com/repository/public')) {
      return mod;
    }
    if (!mod.modResults.contents.includes(NEEDLE)) {
      throw new Error('withAndroidMavenMirror: 没找到 allprojects.repositories');
    }
    mod.modResults.contents = mod.modResults.contents.replace(NEEDLE, REPLACEMENT);
    return mod;
  });
}

module.exports = withAndroidMavenMirror;
