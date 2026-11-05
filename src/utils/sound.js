import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Configure non-intrusive audio mode (mix with others, no exclusive focus hijacking)
if (Platform.OS !== 'web') {
  try {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  } catch {}
}

const tapAsset = require('../../assets/sfx/tap.wav');
const sliceAsset = require('../../assets/sfx/slice.wav');
const perfectAsset = require('../../assets/sfx/perfect.wav');
const speedUpAsset = require('../../assets/sfx/speedUp.wav');
const gameOverAsset = require('../../assets/sfx/gameOver.wav');
const snapTickAsset = require('../../assets/sfx/snapTick.wav');

let isSoundMuted = false;

/**
 * Reusable audio player pools for zero-latency, overlapping sound playback on native mobile
 */
const createPool = (asset, size, volume = 0.85) => {
  const pool = [];
  let index = 0;

  return {
    play: () => {
      if (isSoundMuted) return;
      try {
        if (pool.length < size) {
          const p = createAudioPlayer(asset);
          p.volume = volume;
          pool.push(p);
          p.play();
          return;
        }

        const player = pool[index % size];
        index = (index + 1) % size;
        player.seekTo(0);
        player.play();
      } catch {}
    },
  };
};

const tapPool = createPool(tapAsset, 4, 0.85);
const slicePool = createPool(sliceAsset, 3, 0.90);
const perfectPool = createPool(perfectAsset, 2, 0.85);
const speedUpPool = createPool(speedUpAsset, 2, 0.85);
const gameOverPool = createPool(gameOverAsset, 2, 0.95);
const snapTickPool = createPool(snapTickAsset, 4, 0.75);

export const setSoundMuted = (muted) => {
  isSoundMuted = Boolean(muted);
};

export const getSoundMuted = () => isSoundMuted;

export const playTapSound = () => {
  tapPool.play();
};

export const playSliceSound = () => {
  slicePool.play();
};

export const playPerfectSound = (_comboCount = 1) => {
  perfectPool.play();
};

export const playSpeedUpSound = () => {
  speedUpPool.play();
};

let lastSnapTime = 0;
export const playSnapTickSound = () => {
  const now = Date.now();
  if (now - lastSnapTime < 36) return;
  lastSnapTime = now;
  snapTickPool.play();
};

export const playGameOverSound = () => {
  gameOverPool.play();
};
