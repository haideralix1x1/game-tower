const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050; // High quality & compact memory footprint for instant mobile loading

function createWavBuffer(samples, sampleRate = SAMPLE_RATE) {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write 16-bit signed PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp between -1.0 and 1.0
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? s * 32768 : s * 32767;
    buffer.writeInt16LE(Math.floor(intVal), offset);
    offset += 2;
  }

  return buffer;
}

// Ensure output directories exist
const sfxDir = path.join(__dirname, '..', 'assets', 'sfx');
const audioDir = path.join(__dirname, '..', 'assets', 'audio');
fs.mkdirSync(sfxDir, { recursive: true });
fs.mkdirSync(audioDir, { recursive: true });

function writeWav(filePath, samples) {
  const buf = createWavBuffer(samples);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated: ${path.basename(filePath)} (${(buf.length / 1024).toFixed(1)} KB)`);
}

// -------------------------------------------------------------
// SFX SYNTHESIZERS
// -------------------------------------------------------------

// 1. Chess Move (Wood piece click)
function synthChessMove() {
  const duration = 0.12;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 35);
    const body = Math.sin(2 * Math.PI * 180 * t) * 0.6;
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 120) * 0.4;
    out[i] = (body + click) * env;
  }
  return out;
}

// 2. Chess Capture (Solid wood impact)
function synthChessCapture() {
  const duration = 0.22;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 22);
    const thud = Math.sin(2 * Math.PI * (120 - t * 180) * t) * 0.7;
    const crack = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.5;
    out[i] = (thud + crack) * env;
  }
  return out;
}

// 3. Chess Check (High bell ping)
function synthChessCheck() {
  const duration = 0.45;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 8);
    const ring = Math.sin(2 * Math.PI * 987.77 * t) * 0.6 + Math.sin(2 * Math.PI * 1480 * t) * 0.3;
    out[i] = ring * env;
  }
  return out;
}

// 4. Pac Chomp (Waka)
function synthPacChomp() {
  const duration = 0.14;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * (i / total));
    const freq = 280 + Math.sin(2 * Math.PI * 25 * t) * 160;
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.8;
  }
  return out;
}

// 5. Pac Eat Ghost (Rising score chime)
function synthPacEatGhost() {
  const duration = 0.35;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const seg = Math.min(3, Math.floor((i / total) * 4));
    const freq = freqs[seg];
    const env = Math.exp(-(t % (duration / 4)) * 18);
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.75;
  }
  return out;
}

// 6. Pac Power (Siren warble)
function synthPacPower() {
  const duration = 0.4;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 440 + Math.sin(2 * Math.PI * 12 * t) * 140;
    const env = Math.sin(Math.PI * (i / total));
    out[i] = (Math.sin(2 * Math.PI * freq * t) > 0 ? 0.6 : -0.6) * env;
  }
  return out;
}

// 7. Pac Die (Downward pitch slide)
function synthPacDie() {
  const duration = 0.55;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const freq = Math.max(60, 680 - t * 1100);
    const env = Math.max(0, 1 - t / duration);
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.8;
  }
  return out;
}

// 8. Bubble Shoot (Plop laser)
function synthBubbleShoot() {
  const duration = 0.16;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 24);
    const freq = 350 + Math.sin(t * 40) * 350;
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.75;
  }
  return out;
}

// 9. Bubble Pop (Liquid bursting pop)
function synthBubblePop() {
  const duration = 0.18;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 30);
    const freq = 750 - t * 2400;
    const burst = Math.sin(2 * Math.PI * Math.max(120, freq) * t) * 0.8;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.35;
    out[i] = (burst + noise) * env;
  }
  return out;
}

// 10. Bubble Bounce (Soft rubber boing)
function synthBubbleBounce() {
  const duration = 0.14;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 26);
    const freq = 260 + Math.sin(2 * Math.PI * 45 * t) * 80;
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
  }
  return out;
}

// 11. Word Letter Connect (Sweet melodic bell)
function synthWordLetter() {
  const duration = 0.22;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 14);
    const bell = Math.sin(2 * Math.PI * 784 * t) * 0.6 + Math.sin(2 * Math.PI * 1568 * t) * 0.25;
    out[i] = bell * env;
  }
  return out;
}

// 12. Word Solved (Glorious major arpeggio)
function synthWordSolved() {
  const duration = 0.55;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  const notes = [523.25, 659.25, 783.99, 1046.5];
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const startTime = n * 0.08;
      if (t >= startTime) {
        const dt = t - startTime;
        const env = Math.exp(-dt * 8);
        sample += Math.sin(2 * Math.PI * notes[n] * dt) * env * 0.25;
      }
    }
    out[i] = sample;
  }
  return out;
}

// 13. Zuma Shoot (Plasma blast)
function synthZumaShoot() {
  const duration = 0.18;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 20);
    const freq = 650 - t * 1800;
    const laser = Math.sin(2 * Math.PI * Math.max(160, freq) * t) * 0.7;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.3;
    out[i] = (laser + noise) * env;
  }
  return out;
}

// 14. Zuma Combo (Explosive energy pop)
function synthZumaCombo() {
  const duration = 0.42;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 9);
    const boom = Math.sin(2 * Math.PI * (180 - t * 250) * t) * 0.6;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.4;
    const ring = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 12) * 0.3;
    out[i] = (boom + noise + ring) * env;
  }
  return out;
}

// 15. Zuma Magnet (Rewind pull sweep)
function synthZumaMagnet() {
  const duration = 0.32;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 200 + t * 900;
    const env = Math.sin(Math.PI * (i / total));
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.65;
  }
  return out;
}

// 16. Soccer Kick (Punchy physical impact)
function synthSoccerKick() {
  const duration = 0.2;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 28);
    const thud = Math.sin(2 * Math.PI * (160 - t * 400) * t) * 0.85;
    out[i] = thud * env;
  }
  return out;
}

// 17. Soccer Goal (Goal horn & cheer fanfare)
function synthSoccerGoal() {
  const duration = 0.95;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t * 8) * Math.exp(-t * 2.5);
    const horn =
      (Math.sin(2 * Math.PI * 233 * t) * 0.4 +
        Math.sin(2 * Math.PI * 349 * t) * 0.3 +
        Math.sin(2 * Math.PI * 466 * t) * 0.3);
    const crowd = (Math.random() * 2 - 1) * 0.2 * Math.min(1, t * 4);
    out[i] = (horn + crowd) * env;
  }
  return out;
}

// 18. Paddle Bounce (Arkanoid deflection)
function synthPaddleBounce() {
  const duration = 0.15;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 30);
    out[i] = Math.sin(2 * Math.PI * 920 * t) * env * 0.8;
  }
  return out;
}

// 19. Brick Shatter (Crunchy glass/crystal shatter)
function synthBrickShatter() {
  const duration = 0.24;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 20);
    const noise = (Math.random() * 2 - 1) * 0.6;
    const chime = Math.sin(2 * Math.PI * (1200 + Math.sin(t * 100) * 400) * t) * 0.4;
    out[i] = (noise + chime) * env;
  }
  return out;
}

// 20. Laser Blast (Retro space blaster)
function synthLaserBlast() {
  const duration = 0.22;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 18);
    const freq = 1200 - t * 3800;
    out[i] = (Math.sin(2 * Math.PI * Math.max(100, freq) * t) > 0 ? 0.7 : -0.7) * env;
  }
  return out;
}

// 21. Explosion (Deep bass blast)
function synthExplosion() {
  const duration = 0.5;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 7);
    const rumble = Math.sin(2 * Math.PI * (80 - t * 70) * t) * 0.6;
    const noise = (Math.random() * 2 - 1) * 0.5;
    out[i] = (rumble + noise) * env;
  }
  return out;
}

// 22. Jump Sound (Spring whoop)
function synthJump() {
  const duration = 0.2;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 14);
    const freq = 260 + t * 1400;
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.75;
  }
  return out;
}

// 23. Victory Fanfare (Celebration)
function synthVictory() {
  const duration = 1.1;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  const melody = [
    { time: 0.0, freq: 523.25, dur: 0.15 },
    { time: 0.15, freq: 659.25, dur: 0.15 },
    { time: 0.3, freq: 783.99, dur: 0.2 },
    { time: 0.5, freq: 1046.5, dur: 0.55 },
  ];
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    for (const m of melody) {
      if (t >= m.time && t < m.time + m.dur) {
        const dt = t - m.time;
        const env = Math.exp(-dt * 4);
        s += (Math.sin(2 * Math.PI * m.freq * dt) + Math.sin(2 * Math.PI * m.freq * 2 * dt) * 0.3) * env * 0.45;
      }
    }
    out[i] = s;
  }
  return out;
}

// 24. Fail Buzz
function synthFail() {
  const duration = 0.45;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6);
    const freq = 140 - t * 60;
    out[i] = (Math.sin(2 * Math.PI * freq * t) > 0 ? 0.6 : -0.6) * env;
  }
  return out;
}

// -------------------------------------------------------------
// SEAMLESS LOOPING BGM TRACKS
// -------------------------------------------------------------

// BGM 1: Arcade Synthwave (Energetic 128 BPM 8-bar loop)
function synthBgmArcade() {
  const bpm = 128;
  const beatSec = 60 / bpm;
  const bars = 8;
  const totalSec = beatSec * 4 * bars; // ~15.0 seconds
  const totalSamples = Math.floor(SAMPLE_RATE * totalSec);
  const out = new Float32Array(totalSamples);

  // Bassline notes (F2, G#2, D#2, C2)
  const bassNotes = [87.31, 103.83, 77.78, 65.41];
  // Melody motifs (F4, G#4, C5, D#5)
  const melodyNotes = [349.23, 415.3, 523.25, 622.25, 698.46, 523.25, 415.3, 349.23];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const beatPos = (t / beatSec);
    const beatInBar = beatPos % 4;
    const barIdx = Math.floor((beatPos / 4) % bars);

    // 1. Kick Drum (on beats 0, 1, 2, 3)
    const kickT = (beatPos % 1) * beatSec;
    const kickEnv = Math.exp(-kickT * 32);
    const kick = Math.sin(2 * Math.PI * Math.max(45, 150 - kickT * 400) * kickT) * kickEnv * 0.45;

    // 2. Snare / Clap (on beats 1, 3)
    let snare = 0;
    if (Math.floor(beatInBar) === 1 || Math.floor(beatInBar) === 3) {
      const snareT = (beatPos % 1) * beatSec;
      const snareEnv = Math.exp(-snareT * 22);
      snare = (Math.random() * 2 - 1) * snareEnv * 0.3;
    }

    // 3. Hi-Hat 16th notes
    const hatT = (beatPos % 0.25) * beatSec;
    const hat = (Math.random() * 2 - 1) * Math.exp(-hatT * 60) * 0.12;

    // 4. Bassline (16th note synth stabs)
    const bassRoot = bassNotes[Math.floor(barIdx / 2) % bassNotes.length];
    const bassT = (beatPos % 0.5) * beatSec;
    const bassEnv = Math.exp(-bassT * 12);
    const bass = (Math.sin(2 * Math.PI * bassRoot * t) + Math.sin(2 * Math.PI * bassRoot * 2 * t) * 0.4) * bassEnv * 0.35;

    // 5. Arp Lead Melody
    const melodyIdx = Math.floor(beatPos * 2) % melodyNotes.length;
    const mFreq = melodyNotes[melodyIdx];
    const leadT = (beatPos % 0.5) * beatSec;
    const leadEnv = Math.exp(-leadT * 7);
    const lead = Math.sin(2 * Math.PI * mFreq * t) * leadEnv * 0.22;

    out[i] = Math.max(-0.95, Math.min(0.95, kick + snare + hat + bass + lead));
  }
  return out;
}

// BGM 2: Chill Lo-Fi Puzzle (Relaxing 85 BPM ambient groove)
function synthBgmChill() {
  const bpm = 85;
  const beatSec = 60 / bpm;
  const bars = 8;
  const totalSec = beatSec * 4 * bars; // ~22.5 seconds
  const totalSamples = Math.floor(SAMPLE_RATE * totalSec);
  const out = new Float32Array(totalSamples);

  // Warm Rhodes chords (Am7, Fmaj7, Cmaj7, Em7)
  const chords = [
    [220.0, 261.63, 329.63, 392.0], // Am7
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [130.81, 164.81, 196.0, 246.94], // Cmaj7
    [164.81, 196.0, 246.94, 293.66], // Em7
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const beatPos = (t / beatSec);
    const barIdx = Math.floor((beatPos / 4) % bars);
    const chord = chords[Math.floor(barIdx / 2) % chords.length];

    // Soft Rhodes chord pad
    let chordSound = 0;
    const chordT = (t % (beatSec * 8));
    const chordEnv = 0.5 + 0.3 * Math.sin(Math.PI * (chordT / (beatSec * 8)));
    for (const freq of chord) {
      chordSound += Math.sin(2 * Math.PI * freq * t) * 0.1;
      chordSound += Math.sin(2 * Math.PI * freq * 2 * t) * 0.03;
    }
    chordSound *= chordEnv;

    // Sub bass (warm smooth sine)
    const subFreq = chord[0] * 0.5;
    const subBass = Math.sin(2 * Math.PI * subFreq * t) * 0.35;

    // Soft chill kick on beats 0 & 2.5
    let kick = 0;
    const kPos = beatPos % 4;
    if (kPos < 0.3 || (kPos > 2.4 && kPos < 2.7)) {
      const kt = (kPos < 0.3 ? kPos : kPos - 2.5) * beatSec;
      kick = Math.sin(2 * Math.PI * (90 - kt * 120) * kt) * Math.exp(-kt * 18) * 0.35;
    }

    // Soft rim click on beat 2
    let rim = 0;
    if (kPos > 1.95 && kPos < 2.25) {
      const rt = (kPos - 2.0) * beatSec;
      rim = (Math.random() * 2 - 1) * Math.exp(-rt * 30) * 0.2;
    }

    // Subtle vinyl dust / lo-fi warmth
    const vinyl = (Math.random() * 2 - 1) * 0.02;

    out[i] = Math.max(-0.95, Math.min(0.95, chordSound + subBass + kick + rim + vinyl));
  }
  return out;
}

// BGM 3: Action / Sports (Punchy 132 BPM beat)
function synthBgmAction() {
  const bpm = 132;
  const beatSec = 60 / bpm;
  const bars = 8;
  const totalSec = beatSec * 4 * bars; // ~14.5 seconds
  const totalSamples = Math.floor(SAMPLE_RATE * totalSec);
  const out = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const beatPos = (t / beatSec);

    // Punchy 4-on-the-floor kick
    const kt = (beatPos % 1) * beatSec;
    const kick = Math.sin(2 * Math.PI * (170 - kt * 450) * kt) * Math.exp(-kt * 28) * 0.5;

    // Offbeat bass bounce
    const bt = ((beatPos + 0.5) % 1) * beatSec;
    const bassFreq = 110 + (Math.floor(beatPos / 4) % 4) * 20;
    const bass = Math.sin(2 * Math.PI * bassFreq * t) * Math.exp(-bt * 14) * 0.35;

    // Driving shaker
    const st = (beatPos % 0.25) * beatSec;
    const shaker = (Math.random() * 2 - 1) * Math.exp(-st * 45) * 0.15;

    out[i] = Math.max(-0.95, Math.min(0.95, kick + bass + shaker));
  }
  return out;
}

// -------------------------------------------------------------
// GENERATE ALL SOUND ASSETS
// -------------------------------------------------------------
console.log('Synthesizing GameTower HD Sound FX and BGM...');

writeWav(path.join(sfxDir, 'chess_move.wav'), synthChessMove());
writeWav(path.join(sfxDir, 'chess_capture.wav'), synthChessCapture());
writeWav(path.join(sfxDir, 'chess_check.wav'), synthChessCheck());

writeWav(path.join(sfxDir, 'pac_chomp.wav'), synthPacChomp());
writeWav(path.join(sfxDir, 'pac_eat_ghost.wav'), synthPacEatGhost());
writeWav(path.join(sfxDir, 'pac_power.wav'), synthPacPower());
writeWav(path.join(sfxDir, 'pac_die.wav'), synthPacDie());

writeWav(path.join(sfxDir, 'bubble_shoot.wav'), synthBubbleShoot());
writeWav(path.join(sfxDir, 'bubble_pop.wav'), synthBubblePop());
writeWav(path.join(sfxDir, 'bubble_bounce.wav'), synthBubbleBounce());

writeWav(path.join(sfxDir, 'word_letter.wav'), synthWordLetter());
writeWav(path.join(sfxDir, 'word_solved.wav'), synthWordSolved());

writeWav(path.join(sfxDir, 'zuma_shoot.wav'), synthZumaShoot());
writeWav(path.join(sfxDir, 'zuma_combo.wav'), synthZumaCombo());
writeWav(path.join(sfxDir, 'zuma_magnet.wav'), synthZumaMagnet());

writeWav(path.join(sfxDir, 'soccer_kick.wav'), synthSoccerKick());
writeWav(path.join(sfxDir, 'soccer_goal.wav'), synthSoccerGoal());

writeWav(path.join(sfxDir, 'paddle_bounce.wav'), synthPaddleBounce());
writeWav(path.join(sfxDir, 'brick_shatter.wav'), synthBrickShatter());
writeWav(path.join(sfxDir, 'laser_blast.wav'), synthLaserBlast());
writeWav(path.join(sfxDir, 'explosion.wav'), synthExplosion());
writeWav(path.join(sfxDir, 'jump_sound.wav'), synthJump());
writeWav(path.join(sfxDir, 'victory_fanfare.wav'), synthVictory());
writeWav(path.join(sfxDir, 'fail_buzz.wav'), synthFail());

// Looping BGM Tracks
writeWav(path.join(audioDir, 'bgm_arcade.wav'), synthBgmArcade());
writeWav(path.join(audioDir, 'bgm_chill.wav'), synthBgmChill());
writeWav(path.join(audioDir, 'bgm_action.wav'), synthBgmAction());

console.log('All audio assets successfully synthesized!');
