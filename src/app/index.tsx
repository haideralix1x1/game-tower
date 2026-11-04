import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import GameTowerHub from '../components/GameTowerHub';

export default function IndexScreen() {
  const params = useLocalSearchParams();
  const initialGameId =
    typeof params?.game === 'string' ? params.game : null;

  return <GameTowerHub initialGameId={initialGameId} />;
}
