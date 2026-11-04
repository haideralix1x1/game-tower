import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameTowerHub from './src/components/GameTowerHub';
import { styles } from './styles';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <SafeAreaProvider style={styles.rootContainer}>
        <StatusBar style="light" />
        <GameTowerHub />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
