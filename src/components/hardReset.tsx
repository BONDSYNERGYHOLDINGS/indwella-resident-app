import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { Alert } from 'react-native';

export const hardResetAndNavigateToLogin = async (navigation: any) => {
  try {
    await AsyncStorage.clear(); // Clear all stored data
    console.log('✅ Storage cleared.');

    navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{ name: 'resident_auth' }],
  })
)
  } catch (error) {
    console.error('❌ Error clearing AsyncStorage:', error);
    Alert.alert('Error', 'Failed to reset app data.');
  }
};