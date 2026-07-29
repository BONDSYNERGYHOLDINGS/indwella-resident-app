const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * This app lives inside a yarn/npm workspaces monorepo (see the repo root
 * package.json) and depends on the sibling packages `@indwella/api-client`
 * and `@indwella/types`. Metro needs two extra things to resolve those:
 *   1. `watchFolders` - so Metro's file watcher also looks at the monorepo
 *      root (where `packages/*` lives), not just this app's own folder.
 *   2. `resolver.nodeModulesPaths` - so requiring `@indwella/*` resolves via
 *      the hoisted root `node_modules` as well as this app's own.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    disableHierarchicalLookup: false,
    extraNodeModules: {
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      url: require.resolve('react-native-url-polyfill'),
      stream: require.resolve('readable-stream'),
      crypto: require.resolve('react-native-crypto'),
      net: require.resolve('react-native-tcp-socket'),
      tls: require.resolve('react-native-tcp-socket'),
      zlib: require.resolve('browserify-zlib'),
      path: require.resolve('path-browserify'),
      fs: require.resolve('react-native-fs'),
      os: require.resolve('os-browserify/browser.js'),
      assert: require.resolve('assert/'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
