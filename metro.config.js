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
