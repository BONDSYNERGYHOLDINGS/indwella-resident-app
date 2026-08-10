const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * This app is now an INDEPENDENT repository (it is no longer part of a
 * yarn/npm-workspaces monorepo). Its only cross-repo dependency is the shared
 * `@indwella/sdk`, installed via `file:../indwella-sdk`, which npm/yarn
 * materialise as a symlink inside this app's own `node_modules`.
 *
 * Two things make Metro resolve that symlinked sibling package:
 *   1. `resolver.unstable_enableSymlinks` - follow the node_modules symlink to
 *      the SDK's real location instead of treating it as a dead link.
 *   2. `watchFolders` - include the SDK's real path so Metro's watcher/bundler
 *      is allowed to read files that live outside this project's root.
 *
 * The SDK ships a compiled build (`dist/`, CommonJS), so Metro simply bundles
 * its JS - no extra transform config is required.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const sdkRoot = path.resolve(projectRoot, '../indwella-sdk');

const config = {
  watchFolders: [sdkRoot],
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
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
