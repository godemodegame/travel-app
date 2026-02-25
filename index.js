import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import {AppRegistry} from 'react-native';
import {Buffer} from 'buffer';
import App from './App';
import {name as appName} from './app.json';

global.Buffer = global.Buffer || Buffer;

AppRegistry.registerComponent(appName, () => App);
