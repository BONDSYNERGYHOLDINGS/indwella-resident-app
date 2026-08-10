// navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AppStack from './AppStack';
import ResidentStack from './ResidentStack';
import ResidentDrawer from './ResidentDrawer';
import { useAuth } from '../contexts/AuthContext';

const Drawer = createDrawerNavigator();

const RootNavigator = () => {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  return (
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
  );
};

export default RootNavigator;
