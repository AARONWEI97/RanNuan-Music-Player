/**
 * Patch for react-native-track-player v4.1.2
 * 
 * Patch 1 - Issue: https://github.com/doublesymmetry/react-native-track-player/issues/2593
 * In bridgeless mode (newArchEnabled=true, React Native 0.76+), 
 * MusicService.emit() uses reactNativeHost.reactInstanceManager.currentReactContext
 * which returns null, causing ALL native-to-JS events to be silently dropped.
 * Fix: Replace with inherited reactContext from HeadlessJsTaskService.
 * 
 * Patch 2 - Issue: https://github.com/doublesymmetry/react-native-track-player/issues/2560
 * On RN 0.81+, MusicModule.kt passes nullable originalItem to Arguments.fromBundle()
 * which expects non-null, causing build failure.
 * Fix: Add null safety with `?: Bundle()`.
 */

const fs = require('fs');
const path = require('path');

const SERVICE_FILE = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-track-player',
  'android',
  'src',
  'main',
  'java',
  'com',
  'doublesymmetry',
  'trackplayer',
  'service',
  'MusicService.kt'
);

const MODULE_FILE = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-track-player',
  'android',
  'src',
  'main',
  'java',
  'com',
  'doublesymmetry',
  'trackplayer',
  'module',
  'MusicModule.kt'
);

function patchMusicService() {
  if (!fs.existsSync(SERVICE_FILE)) {
    console.log('[patch-rntp] MusicService.kt not found, skipping patch');
    return;
  }

  let content = fs.readFileSync(SERVICE_FILE, 'utf8');

  // Check if already patched
  if (content.includes('★ PATCHED')) {
    console.log('[patch-rntp] MusicService.kt already patched, skipping');
    return;
  }

  // Patch emit() method
  const oldEmit = `@MainThread
    private fun emit(event: String, data: Bundle? = null) {
        reactNativeHost.reactInstanceManager.currentReactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(event, data?.let { Arguments.fromBundle(it) })
    }`;

  const newEmit = `@MainThread
    private fun emit(event: String, data: Bundle? = null) {
        // ★ PATCHED: Use inherited reactContext instead of reactNativeHost chain
        // In bridgeless mode (newArchEnabled=true), reactNativeHost.reactInstanceManager.currentReactContext
        // returns null, causing all events to be silently dropped.
        // See: https://github.com/doublesymmetry/react-native-track-player/issues/2593
        reactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(event, data?.let { Arguments.fromBundle(it) })
    }`;

  if (content.includes(oldEmit)) {
    content = content.replace(oldEmit, newEmit);
    console.log('[patch-rntp] ✓ Patched MusicService.emit() method');
  } else {
    console.log('[patch-rntp] ⚠ Could not find MusicService.emit() to patch');
  }

  // Patch emitList() method
  const oldEmitList = `@MainThread
    private fun emitList(event: String, data: List<Bundle> = emptyList()) {
        val payload = Arguments.createArray()
        data.forEach { payload.pushMap(Arguments.fromBundle(it)) }

        reactNativeHost.reactInstanceManager.currentReactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(event, payload)
    }`;

  const newEmitList = `@MainThread
    private fun emitList(event: String, data: List<Bundle> = emptyList()) {
        val payload = Arguments.createArray()
        data.forEach { payload.pushMap(Arguments.fromBundle(it)) }

        // ★ PATCHED: Same fix as emit() above
        reactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(event, payload)
    }`;

  if (content.includes(oldEmitList)) {
    content = content.replace(oldEmitList, newEmitList);
    console.log('[patch-rntp] ✓ Patched MusicService.emitList() method');
  } else {
    console.log('[patch-rntp] ⚠ Could not find MusicService.emitList() to patch');
  }

  fs.writeFileSync(SERVICE_FILE, content, 'utf8');
  console.log('[patch-rntp] ✓ MusicService.kt patch applied');
}

function patchMusicModule() {
  if (!fs.existsSync(MODULE_FILE)) {
    console.log('[patch-rntp] MusicModule.kt not found, skipping patch');
    return;
  }

  let content = fs.readFileSync(MODULE_FILE, 'utf8');

  // Check if already patched
  if (content.includes('★ PATCHED_NULL_SAFETY')) {
    console.log('[patch-rntp] MusicModule.kt already patched, skipping');
    return;
  }

  // Patch: Every Arguments.fromBundle(originalItem) needs null safety
  // On RN 0.81+, originalItem can return null: Bundle?
  // https://github.com/doublesymmetry/react-native-track-player/issues/2560
  let patchCount = 0;
  content = content.replace(
    /Arguments\.fromBundle\((.*?)originalItem\)/g,
    'Arguments.fromBundle($1originalItem ?: Bundle()) /* ★ PATCHED_NULL_SAFETY */'
  );
  patchCount = (content.match(/★ PATCHED_NULL_SAFETY/g) || []).length;
  console.log(`[patch-rntp] ✓ Patched ${patchCount} MusicModule originalItem null safety occurrences`);

  fs.writeFileSync(MODULE_FILE, content, 'utf8');
  console.log('[patch-rntp] ✓ MusicModule.kt patch applied');
}

patchMusicService();
patchMusicModule();
