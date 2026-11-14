import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

// Prevent native splash screen from auto-hiding before React mounts
SplashScreen.preventAutoHideAsync().catch(() => {});

import App from './App';

registerRootComponent(App);
