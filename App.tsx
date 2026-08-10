
import * as React from 'react';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { subscribeToForegroundPushMessages } from './src/services/pushNotifications';





const App = () => {
  React.useEffect(() => subscribeToForegroundPushMessages(), []);

  return (
    <SafeAreaProvider> 
       <AuthProvider>
      <RootNavigator />
    </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
