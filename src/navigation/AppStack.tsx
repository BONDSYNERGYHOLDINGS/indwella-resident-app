// navigation/AppStack.tsx
// Public (unauthenticated) routes for the resident app: intro slider, auth, and
// the shared password-reset flow. Once a resident logs in, RootNavigator
// switches to ResidentDrawer/ResidentStack instead.
//
// This app ships to residents only - security has its own app and facility
// managers use the web admin - so there is no role-picker step. The intro
// slider is the first screen.
import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IntroSliderScreen from '../screens/IntroSliderScreen';
import ResidentAuth from '../screens/resident/Auth';
import AwaitingApprovalScreen from '../screens/resident/AwaitingApprovalScreen';
import LegalDocumentScreen from '../screens/resident/LegalDocumentScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

const Stack = createNativeStackNavigator();

const AppStack = () => {
  return (
    <Stack.Navigator initialRouteName="introslider" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="introslider" component={IntroSliderScreen} />
      <Stack.Screen name="resident_auth" component={ResidentAuth} />
      {/* Reachable pre-login: an unapproved resident never gets isAuthenticated
          flipped to true, so this can't live inside the authenticated
          ResidentApp Drawer/Stack - see Auth.tsx's post-login/signup routing. */}
      <Stack.Screen name="awaiting_approval" component={AwaitingApprovalScreen} />
      <Stack.Screen name="forget_password" component={ForgotPasswordScreen} />
      <Stack.Screen name="verify_otp" component={OtpVerificationScreen} />
      <Stack.Screen name="reset_password" component={ResetPasswordScreen} />
      <Stack.Screen name="legal_document" component={LegalDocumentScreen} />
    </Stack.Navigator>
  );
};

export default AppStack;
