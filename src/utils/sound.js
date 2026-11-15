import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Configure non-intrusive audio mode
if (Platform.OS !== 'web') {
  try {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  } catch {}
}

// -------------------------------------------------------------
// SOUND ASSETS
// -------------------------------------------------------------
const tapAsset = require('../../assets/sfx/tap.wav');
const sliceAsset = require('../../assets/sfx/slice.wav');
const perfectAsset = require('../../assets/sfx/perfect.wav');
const speedUpAsset = require('../../assets/sfx/speedUp.wav');
const gameOverAsset = require('../../assets/sfx/gameOver.wav');
const snapTickAsset = require('../../assets/sfx/snapTick.wav');

// Specialized SFX
const chessMoveAsset = require('../../assets/sfx/chess_move.wav');
const chessCaptureAsset = require('../../assets/sfx/chess_capture.wav');
const chessCheckAsset = require('../../assets/sfx/chess_check.wav');

const pacChompAsset = require('../../assets/sfx/pac_chomp.wav');
const pacEatGhostAsset = require('../../assets/sfx/pac_eat_ghost.wav');
const pacPowerAsset = require('../../assets/sfx/pac_power.wav');
const pacDieAsset = require('../../assets/sfx/pac_die.wav');

const bubbleShootAsset = require('../../assets/sfx/bubble_shoot.wav');
const bubblePopAsset = require('../../assets/sfx/bubble_pop.wav');
const bubbleBounceAsset = require('../../assets/sfx/bubble_bounce.wav');

const wordLetterAsset = require('../../assets/sfx/word_letter.wav');
const wordSolvedAsset = require('../../assets/sfx/word_solved.wav');

const zumaShootAsset = require('../../assets/sfx/zuma_shoot.wav');
const zumaComboAsset = require('../../assets/sfx/zuma_combo.wav');
const zumaMagnetAsset = require('../../assets/sfx/zuma_magnet.wav');

const soccerKickAsset = require('../../assets/sfx/soccer_kick.wav');
const soccerGoalAsset = require('../../assets/sfx/soccer_goal.wav');

const paddleBounceAsset = require('../../assets/sfx/paddle_bounce.wav');
const brickShatterAsset = require('../../assets/sfx/brick_shatter.wav');
const laserBlastAsset = require('../../assets/sfx/laser_blast.wav');
const explosionAsset = require('../../assets/sfx/explosion.wav');
const jumpAsset = require('../../assets/sfx/jump_sound.wav');
const victoryAsset = require('../../assets/sfx/victory_fanfare.wav');
const failAsset = require('../../assets/sfx/fail_buzz.wav');

// BGM Music Assets
const bgmArcadeAsset = require('../../assets/audio/bgm_arcade.wav');
const bgmChillAsset = require('../../assets/audio/bgm_chill.wav');
const bgmActionAsset = require('../../assets/audio/bgm_action.wav');

let isSoundMuted = false;
let isMusicMuted = false;

/**
 * Reusable audio player pools for zero-latency, overlapping sound playback on mobile
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

// Pools
const tapPool = createPool(tapAsset, 4, 0.85);
const slicePool = createPool(sliceAsset, 3, 0.9);
const perfectPool = createPool(perfectAsset, 2, 0.85);
const speedUpPool = createPool(speedUpAsset, 2, 0.85);
const gameOverPool = createPool(gameOverAsset, 2, 0.95);
const snapTickPool = createPool(snapTickAsset, 4, 0.75);

// New Game-specific Pools
const chessMovePool = createPool(chessMoveAsset, 3, 0.9);
const chessCapturePool = createPool(chessCaptureAsset, 2, 0.95);
const chessCheckPool = createPool(chessCheckAsset, 2, 0.85);

const pacChompPool = createPool(pacChompAsset, 3, 0.7);
const pacEatGhostPool = createPool(pacEatGhostAsset, 2, 0.9);
const pacPowerPool = createPool(pacPowerAsset, 2, 0.85);
const pacDiePool = createPool(pacDieAsset, 1, 0.95);

const bubbleShootPool = createPool(bubbleShootAsset, 3, 0.85);
const bubblePopPool = createPool(bubblePopAsset, 4, 0.9);
const bubbleBouncePool = createPool(bubbleBounceAsset, 3, 0.8);

const wordLetterPool = createPool(wordLetterAsset, 4, 0.8);
const wordSolvedPool = createPool(wordSolvedAsset, 2, 0.95);

const zumaShootPool = createPool(zumaShootAsset, 3, 0.85);
const zumaComboPool = createPool(zumaComboAsset, 3, 0.95);
const zumaMagnetPool = createPool(zumaMagnetAsset, 2, 0.8);

const soccerKickPool = createPool(soccerKickAsset, 4, 0.9);
const soccerGoalPool = createPool(soccerGoalAsset, 2, 0.95);

const paddleBouncePool = createPool(paddleBounceAsset, 4, 0.85);
const brickShatterPool = createPool(brickShatterAsset, 3, 0.9);
const laserBlastPool = createPool(laserBlastAsset, 4, 0.85);
const explosionPool = createPool(explosionAsset, 3, 0.9);
const jumpPool = createPool(jumpAsset, 3, 0.85);
const victoryPool = createPool(victoryAsset, 2, 0.95);
const failPool = createPool(failAsset, 2, 0.9);

// -------------------------------------------------------------
// BGM CONTROLLER
// -------------------------------------------------------------
let currentBgmPlayer = null;
let currentBgmType = null;

export const startBGM = (type = 'arcade') => {
  if (isMusicMuted) return;
  if (currentBgmPlayer && currentBgmType === type) {
    try {
      currentBgmPlayer.play();
    } catch {}
    return;
  }

  stopBGM();

  try {
    let asset = bgmArcadeAsset;
    let vol = 0.45;
    if (type === 'chill') {
      asset = bgmChillAsset;
      vol = 0.5;
    } else if (type === 'action') {
      asset = bgmActionAsset;
      vol = 0.45;
    }

    const player = createAudioPlayer(asset);
    player.loop = true;
    player.volume = vol;
    player.play();
    currentBgmPlayer = player;
    currentBgmType = type;
  } catch {}
};

export const stopBGM = () => {
  if (currentBgmPlayer) {
    try {
      currentBgmPlayer.pause();
    } catch {}
    currentBgmPlayer = null;
    currentBgmType = null;
  }
};

export const setMusicMuted = (muted) => {
  isMusicMuted = Boolean(muted);
  if (isMusicMuted) {
    stopBGM();
  }
};

export const setSoundMuted = (muted) => {
  isSoundMuted = Boolean(muted);
};

export const getSoundMuted = () => isSoundMuted;
export const getMusicMuted = () => isMusicMuted;

// -------------------------------------------------------------
// PUBLIC SFX EXPORTS
// -------------------------------------------------------------

// Legacy / Hub
export const playTapSound = () => tapPool.play();
export const playSliceSound = () => slicePool.play();
export const playPerfectSound = (_combo = 1) => perfectPool.play();
export const playSpeedUpSound = () => speedUpPool.play();
export const playGameOverSound = () => gameOverPool.play();
let lastSnapTime = 0;
export const playSnapTickSound = () => {
  const now = Date.now();
  if (now - lastSnapTime < 36) return;
  lastSnapTime = now;
  snapTickPool.play();
};

// Chess
export const playChessMoveSound = () => chessMovePool.play();
export const playChessCaptureSound = () => chessCapturePool.play();
export const playChessCheckSound = () => chessCheckPool.play();

// Pac-Man
let lastChompTime = 0;
export const playPacChompSound = () => {
  const now = Date.now();
  if (now - lastChompTime < 120) return;
  lastChompTime = now;
  pacChompPool.play();
};
export const playPacEatGhostSound = () => pacEatGhostPool.play();
export const playPacPowerSound = () => pacPowerPool.play();
export const playPacDieSound = () => pacDiePool.play();

// Bubble Shooter
export const playBubbleShootSound = () => bubbleShootPool.play();
export const playBubblePopSound = () => bubblePopPool.play();
export const playBubbleBounceSound = () => bubbleBouncePool.play();

// Word Link & Word Search
export const playWordLetterSound = () => wordLetterPool.play();
export const playWordSolvedSound = () => wordSolvedPool.play();

// Zuma
export const playZumaShootSound = () => zumaShootPool.play();
export const playZumaComboSound = () => zumaComboPool.play();
export const playZumaMagnetSound = () => zumaMagnetPool.play();

// Table Soccer
export const playSoccerKickSound = () => soccerKickPool.play();
export const playSoccerGoalSound = () => soccerGoalPool.play();

// Brick Breaker & Space Shooter & Action
export const playPaddleBounceSound = () => paddleBouncePool.play();
export const playBrickShatterSound = () => brickShatterPool.play();
export const playLaserBlastSound = () => laserBlastPool.play();
export const playExplosionSound = () => explosionPool.play();
export const playJumpSound = () => jumpPool.play();
export const playVictorySound = () => victoryPool.play();
export const playFailSound = () => failPool.play();
