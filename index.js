

/**
 * @format
 */
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {setBackgroundPushHandler} from './src/services/pushNotifications';

setBackgroundPushHandler();

AppRegistry.registerComponent(appName, () => App);
