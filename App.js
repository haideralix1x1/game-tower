import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import GameTowerHub from './src/components/GameTowerHub';
import CompanySplashScreen from './src/components/CompanySplashScreen';
import { styles } from './styles';

// Keep native OS splash screen visible until our React custom splash screen is mounted
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [isSplashDone, setIsSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <SafeAreaProvider style={styles.rootContainer}>
        <StatusBar hidden={true} />
        <GameTowerHub isSplashActive={!isSplashDone} />
        {!isSplashDone && (
          <CompanySplashScreen onFinish={() => setIsSplashDone(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
