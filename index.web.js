// index.web.js
import {AppRegistry} from 'react-native';
import App from './App'; // Your main App component
import {name as appName} from './app.json';

// Register the app
AppRegistry.registerComponent(appName, () => App);

// Mount the app to the DOM
AppRegistry.runApplication(appName, {
  initialProps: {},
  rootTag: document.getElementById('app-root'), // Ensure this ID matches your HTML template
});
