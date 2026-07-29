import { Platform } from 'react-native';
import { API_BASE_URL } from '@env';
import { createResidentSdk } from '@indwella/api-client';
import { residentTokenStorage } from './tokenStorage';

const FALLBACK_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2' : 'http://localhost';
const baseURL = API_BASE_URL || FALLBACK_API_URL;

/** Fired by the SDK's interceptor when a refresh attempt fails (session truly expired). */
let sessionExpiredHandler: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  sessionExpiredHandler = handler;
};

export const residentSdk = createResidentSdk({
  baseURL,
  storage: residentTokenStorage,
  onSessionExpired: () => sessionExpiredHandler?.(),
});

/**
 * Drop-in replacement for the old `import api from '../../lib/apiClient'` default export.
 * Existing screens that call `api.get(...)` / `api.post(...)` directly keep
 * working unchanged - only the import path moves. New/refactored screens
 * should prefer the typed modules below (`residentApi`, `walletApi`, ...)
 * instead of hand-rolled URL strings.
 */
export const api = residentSdk.client.axios;

export const residentApi = residentSdk.resident;
export const walletApi = residentSdk.wallet;
export const authApi = residentSdk.auth;
export const passwordResetApi = residentSdk.passwordReset;
export const notificationsApi = residentSdk.notifications;
