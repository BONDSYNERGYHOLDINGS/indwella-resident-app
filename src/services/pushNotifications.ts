import { Alert, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { getApps } from '@react-native-firebase/app';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

const postNotificationsPermission = 'android.permission.POST_NOTIFICATIONS';
const { PushNotification } = NativeModules;

/**
 * Firebase is configured from a per-platform credentials file
 * (android/app/google-services.json, ios/indwella_client/GoogleService-Info.plist).
 * If that file is missing for the current platform there is no default app, and
 * every `messaging()` call throws "No Firebase App '[DEFAULT]' has been created".
 * `setBackgroundPushHandler()` runs at import time in index.js, so an unguarded
 * call takes the whole app down before the first screen renders. Degrade to
 * "push disabled" instead.
 */
function isFirebaseConfigured() {
  return getApps().length > 0;
}

function warnPushUnavailable(action: string) {
  console.warn(
    `[push] Skipping ${action}: Firebase is not configured for ${Platform.OS}. ` +
      (Platform.OS === 'ios'
        ? 'Add GoogleService-Info.plist to the Xcode target.'
        : 'Add android/app/google-services.json.'),
  );
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(postNotificationsPermission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  if (!isFirebaseConfigured()) {
    warnPushUnavailable('permission request');
    return false;
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function getFcmToken() {
  if (!isFirebaseConfigured()) {
    warnPushUnavailable('token fetch');
    return null;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return null;
  }

  return messaging().getToken();
}

export async function deleteFcmToken() {
  if (!isFirebaseConfigured()) {
    return;
  }

  await messaging().deleteToken();
}

export function setBackgroundPushHandler() {
  if (!isFirebaseConfigured()) {
    warnPushUnavailable('background handler registration');
    return;
  }

  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('FCM background message received:', remoteMessage.messageId);
    showSystemNotification(remoteMessage);
  });
}

export function subscribeToForegroundPushMessages() {
  if (!isFirebaseConfigured()) {
    warnPushUnavailable('foreground listener');
    return () => {};
  }

  return messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    showSystemNotification(remoteMessage);
  });
}

function showSystemNotification(remoteMessage: FirebaseMessagingTypes.RemoteMessage) {
  const title = remoteMessage.notification?.title || remoteMessage.data?.title;
  const body = remoteMessage.notification?.body || remoteMessage.data?.body;

  if (!title && !body) {
    return;
  }

  if (Platform.OS === 'android' && PushNotification?.show) {
    PushNotification.show(String(title || 'Notification'), String(body || ''));
    return;
  }

  Alert.alert(String(title || 'Notification'), String(body || ''));
}
