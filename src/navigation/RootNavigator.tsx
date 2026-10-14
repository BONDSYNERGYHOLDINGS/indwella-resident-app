// navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AppStack from './AppStack';
import ResidentStack from './ResidentStack';
import ResidentDrawer from './ResidentDrawer';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBootSplash from '../components/AnimatedBootSplash';

const Drawer = createDrawerNavigator();

const RootNavigator = () => {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [splashDone, setSplashDone] = React.useState(false);

  // The native splash stays up until auth state is resolved, then animates out
  // over the navigator (instead of the blank screen this used to render).
  return (
    <>
      {!isAuthLoading && (
        <NavigationContainer>
          {isAuthenticated ? (
            <Drawer.Navigator
              drawerContent={(props) => <ResidentDrawer {...props} />}
              screenOptions={{ headerShown: false }}>
              <Drawer.Screen name="ResidentApp" component={ResidentStack} />
            </Drawer.Navigator>
          ) : (
            <AppStack />
          )}
        </NavigationContainer>
      )}
      {!splashDone && (
        <AnimatedBootSplash ready={!isAuthLoading} onAnimationEnd={() => setSplashDone(true)} />
      )}
    </>
  );
};

export default RootNavigator;
