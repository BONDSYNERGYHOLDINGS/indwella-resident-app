// navigation/AppStack.tsx
// Public (unauthenticated) routes for the resident app: onboarding, auth, and
// the shared password-reset flow. Once a resident logs in, RootNavigator
// switches to ResidentDrawer/ResidentStack instead.
import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/OnboardingScreen';
import IntroSliderScreen from '../screens/IntroSliderScreen';
import ResidentAuth from '../screens/resident/Auth';
import LegalDocumentScreen from '../screens/resident/LegalDocumentScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

const Stack = createNativeStackNavigator();

const AppStack = () => {
  return (
    <Stack.Navigator initialRouteName="onboarding" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" component={OnboardingScreen} />
      <Stack.Screen name="introslider" component={IntroSliderScreen} />
      <Stack.Screen name="resident_auth" component={ResidentAuth} />
      <Stack.Screen name="forget_password" component={ForgotPasswordScreen} />
      <Stack.Screen name="verify_otp" component={OtpVerificationScreen} />
      <Stack.Screen name="reset_password" component={ResetPasswordScreen} />
      <Stack.Screen name="legal_document" component={LegalDocumentScreen} />
    </Stack.Navigator>
  );
};

export default AppStack;
