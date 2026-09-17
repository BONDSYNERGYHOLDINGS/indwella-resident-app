import * as React from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { subscribeToForegroundPushMessages } from './src/services/pushNotifications';

const App = () => {
  React.useEffect(() => subscribeToForegroundPushMessages(), []);

  return (
    // Android wires gesture-handler into the root view natively, but on iOS the
    // drawer's swipe gestures are dead unless the tree is wrapped explicitly.
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
