import { Alert, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

const postNotificationsPermission = 'android.permission.POST_NOTIFICATIONS';
const { PushNotification } = NativeModules;

export async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(postNotificationsPermission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function getFcmToken() {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return null;
  }

  return messaging().getToken();
}

export async function deleteFcmToken() {
  await messaging().deleteToken();
}

export function setBackgroundPushHandler() {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('FCM background message received:', remoteMessage.messageId);
    showSystemNotification(remoteMessage);
  });
}

export function subscribeToForegroundPushMessages() {
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
