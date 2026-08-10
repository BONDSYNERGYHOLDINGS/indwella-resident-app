import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenStorage } from '@indwella/sdk';

const ACCESS_KEY = 'resident_token';
const REFRESH_KEY = 'resident_refresh_token';

/**
 * Only one role lives in this app, so storage keys don't need a role prefix
 * the way the old shared app did (it kept `${role}_token` for three roles
 * side by side). That whole class of bugs - accidentally reading another
 * role's token - simply can't happen here anymore.
 */
export const residentTokenStorage: TokenStorage = {
  async getAccessToken() {
    return AsyncStorage.getItem(ACCESS_KEY);
  },
  async getRefreshToken() {
    return AsyncStorage.getItem(REFRESH_KEY);
  },
  async setTokens({ accessToken, refreshToken }) {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, accessToken],
      [REFRESH_KEY, refreshToken],
    ]);
  },
  async clear() {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  },
};
