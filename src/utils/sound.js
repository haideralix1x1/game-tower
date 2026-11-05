import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';

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

const SAMPLE_RATE = 22050;

// Base64 encoder for raw Uint8Array WAV buffers
const toBase64 = (bytes) => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    output += chars[(triplet >> 18) & 0x3f];
    output += chars[(triplet >> 12) & 0x3f];
    output += i + 1 < len ? chars[(triplet >> 6) & 0x3f] : '=';
    output += i + 2 < len ? chars[triplet & 0x3f] : '=';
  }
  return output;
};

/**
 * Generates an in-memory 16-bit PCM WAV data URI from a synthesizer callback.
 */
const buildWavDataUri = (durationSec, sampleFn) => {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / SAMPLE_RATE;
    const progress = i / numSamples;
    const raw = Math.max(-1, Math.min(1, sampleFn(t, progress)));
    view.setInt16(44 + i * 2, Math.floor(raw * 32767), true);
  }

  return `data:audio/wav;base64,${toBase64(new Uint8Array(buffer))}`;
};

// Pentatonic rising frequencies for PERFECT combo streaks
const COMBO_FREQUENCIES = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0, // A5
  1046.5, // C6
  1174.66, // D6
  1318.51, // E6
  1567.98, // G6
  1760.0, // A6
];

const cachedUris = {
  tap: null,
  slice: null,
  speedUp: null,
  gameOver: null,
  snapTick: null,
  perfect: [],
};

const playerPool = {};
let isSoundMuted = false;

const ensureSoundsBuilt = () => {
  if (cachedUris.tap) return;

  // 1. UI Tap Sound (Crisp cyber blip)
  cachedUris.tap = buildWavDataUri(0.07, (t, p) => {
    const env = Math.pow(1 - p, 2.2);
    return Math.sin(2 * Math.PI * (780 + p * 420) * t) * env * 0.45;
  });

  // 2. Slice Impact Sound (Laser shear + punchy bass thud)
  cachedUris.slice = buildWavDataUri(0.16, (t, p) => {
    const env = Math.pow(1 - p, 1.8);
    const sweepFreq = 520 * Math.pow(0.28, p);
    const laser = Math.sin(2 * Math.PI * sweepFreq * t);
    const harmonic = Math.sin(2 * Math.PI * sweepFreq * 2.4 * t) * 0.35;
    return (laser + harmonic) * env * 0.55;
  });

  // 3. Rising Perfect Chime Notes (Harmonic bell + shimmer)
  cachedUris.perfect = COMBO_FREQUENCIES.map((freq) =>
    buildWavDataUri(0.26, (t, p) => {
      const env = p < 0.04 ? p / 0.04 : Math.pow(1 - (p - 0.04) / 0.96, 1.9);
      const fundamental = Math.sin(2 * Math.PI * freq * t);
      const fifth = Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.35;
      const octave = Math.sin(2 * Math.PI * (freq * 2) * t) * 0.25;
      return (fundamental + fifth + octave) * env * 0.5;
    })
  );

  // 4. Speed Up Arpeggio Fanfare
  cachedUris.speedUp = buildWavDataUri(0.32, (t, p) => {
    const env = Math.pow(1 - p, 1.4);
    const freq = p < 0.33 ? 587.33 : p < 0.66 ? 880.0 : 1174.66;
    return (
      (Math.sin(2 * Math.PI * freq * t) +
        0.3 * Math.sin(2 * Math.PI * freq * 2 * t)) *
      env *
      0.48
    );
  });

  // 5. Game Over Sub-Bass Power Down
  cachedUris.gameOver = buildWavDataUri(0.42, (t, p) => {
    const env = Math.pow(1 - p, 1.5);
    const freq = 240 * Math.pow(0.25, p);
    const saw = 2 * ((t * freq) - Math.floor(0.5 + t * freq));
    const sub = Math.sin(2 * Math.PI * freq * 0.5 * t);
    return (saw * 0.4 + sub * 0.6) * env * 0.6;
  });

  // 6. Cyber Scroll Ratchet / Snap Tick Sound (Crisp high-frequency mechanical tactile click)
  cachedUris.snapTick = buildWavDataUri(0.038, (t, p) => {
    const env = Math.pow(1 - p, 3.8);
    const freq = 1450 - p * 900;
    const tone = Math.sin(2 * Math.PI * freq * t);
    const click = (Math.random() * 2 - 1) * (p < 0.2 ? 0.35 : 0);
    return (tone * 0.75 + click) * env * 0.42;
  });
};

const playDataUri = (key, uri) => {
  if (isSoundMuted || !uri) return;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.Audio) {
      const audio = new window.Audio(uri);
      audio.volume = 0.65;
      audio.play().catch(() => {});
      return;
    }

    // On native mobile (Android/iOS), expo-audio Media3/ExoPlayer cannot decode data: URIs
    // and creates unreleased MediaSessions that steal focus and crash the app.
    // Tactile haptics handle immediate mobile touch feedback safely.
  } catch {
    // Gracefully ignore audio playback errors
  }
};

export const setSoundMuted = (muted) => {
  isSoundMuted = Boolean(muted);
};

export const getSoundMuted = () => isSoundMuted;

export const playTapSound = () => {
  ensureSoundsBuilt();
  playDataUri('tap', cachedUris.tap);
};

export const playSliceSound = () => {
  ensureSoundsBuilt();
  playDataUri('slice', cachedUris.slice);
};

export const playPerfectSound = (comboCount = 1) => {
  ensureSoundsBuilt();
  const idx = Math.max(
    0,
    Math.min(COMBO_FREQUENCIES.length - 1, (comboCount - 1) % COMBO_FREQUENCIES.length)
  );
  playDataUri(`perfect_${idx}`, cachedUris.perfect[idx]);
};

export const playSpeedUpSound = () => {
  ensureSoundsBuilt();
  playDataUri('speedUp', cachedUris.speedUp);
};

let lastSnapTime = 0;
let snapPoolIndex = 0;

export const playSnapTickSound = () => {
  const now = Date.now();
  if (now - lastSnapTime < 42) return;
  lastSnapTime = now;

  ensureSoundsBuilt();
  const poolKey = `snapTick_${snapPoolIndex % 4}`;
  snapPoolIndex += 1;
  playDataUri(poolKey, cachedUris.snapTick);
};

export const playGameOverSound = () => {
  ensureSoundsBuilt();
  playDataUri('gameOver', cachedUris.gameOver);
};
