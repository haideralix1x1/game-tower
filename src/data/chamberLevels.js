/**
 * Chamber Escape - levels 9..100 (levels 1-8 are the hand-made classic rooms).
 *
 * Every room is built from "obstacle segments" laid out left -> right between the
 * player's start and the exit door. Segment sizes are derived from the real jump
 * physics (jump apex ~66px, 26px crates) so every room is solvable, and difficulty
 * ramps with the level: more segments, wider pits, taller walls/fences, hidden
 * requirements (keys, padlock, high switches).
 *
 * Segment types:
 *  PIT    - spike chasm, drag magnetic slabs over it
 *  WALL   - solid wall, stack crates (stairs) to climb it
 *  GATE_S - laser gate opened by a switch (switch may need a jump)
 *  GATE_P - laser gate held open only while a plate is pressed (crate on plate)
 *  FENCE  - tall laser fence, build slab stairs over it to reach the switch behind it
 *  HOP    - narrow spike strip, jump FORWARD over it
 *  PLUG   - laser gate powered by a wall plug, yank the plug
 *  DUAL   - two plates: crate on A, finger-hold B
 */

const WALL_H = { 1: 76, 2: 104, 4: 130 }; // n crates -> wall height
const FENCE_H = [110, 150, 190];
const FENCE_N = [2, 2, 3]; // slabs needed
const POOL = ['PIT', 'WALL', 'GATE_S', 'GATE_P', 'FENCE', 'HOP', 'PLUG', 'DUAL'];

const NAMES = {
  PIT: 'SPIKE CHASM',
  WALL: 'CRATE CLIMB',
  GATE_S: 'SWITCH LOCK',
  GATE_P: 'WEIGHT PLATE',
  FENCE: 'LASER FENCE',
  HOP: 'SPIKE HOP',
  PLUG: 'POWER PLUG',
  DUAL: 'DUAL PLATES',
};

const HINTS = {
  PIT: 'DRAG SLABS OVER THE SPIKES',
  WALL: 'STACK CRATES INTO STAIRS',
  GATE_S: 'TOUCH THE SWITCH',
  GATE_P: 'CRATE ON PLATE HOLDS THE LASER OPEN',
  FENCE: 'BUILD SLAB STAIRS OVER THE FENCE',
  HOP: 'JUMP FORWARD OVER SPIKES',
  PLUG: 'YANK THE POWER PLUG',
  DUAL: 'CRATE ON PLATE A + FINGER ON PLATE B',
};

const EARLY = {
  9: { segs: [], floatKeys: 3, name: 'KEY HUNT', hint: 'DRAG EVERY KEY DOWN TO YOU!' },
  10: {
    segs: [],
    doorHigh: true,
    doorKeys: 1,
    name: 'FLOATING EXIT',
    hint: 'GRAB THE KEY, THEN DRAG THE EXIT DOOR DOWN!',
  },
  11: { segs: [{ t: 'WALL', n: 1 }] },
  12: { segs: [{ t: 'PIT', w: 100 }] },
  13: { segs: [{ t: 'GATE_S', high: false }] },
  14: { segs: [{ t: 'GATE_P' }] },
  15: { segs: [{ t: 'FENCE', hi: 0 }] },
  16: { segs: [{ t: 'PLUG' }] },
  17: { segs: [{ t: 'DUAL' }] },
  18: { segs: [{ t: 'WALL', n: 2 }], wallKey: true },
  19: { segs: [{ t: 'PIT', w: 140 }], doorKeys: 1 },
  20: { segs: [{ t: 'GATE_S', high: true }, { t: 'HOP', w: 40 }] },
};

function mulberry32(seed) {
  let a = seed | 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function footprint(s) {
  switch (s.t) {
    case 'PIT':
      return s.w + 28;
    case 'WALL':
      return 76;
    case 'GATE_S':
      return 64;
    case 'GATE_P':
      return 88;
    case 'FENCE':
      return FENCE_N[s.hi] * 42 + 62;
    case 'HOP':
      return s.w + 28;
    case 'PLUG':
      return 42;
    case 'DUAL':
      return 140;
    default:
      return 0;
  }
}

function crateCountOf(segs) {
  let wall = 0;
  let plates = 0;
  segs.forEach((s) => {
    if (s.t === 'WALL') wall = Math.max(wall, s.n);
    if (s.t === 'GATE_P' || s.t === 'DUAL') plates += 1;
  });
  return wall + plates;
}

function startXFor(crateCount) {
  return Math.max(30, 18 + 28 * crateCount + 8);
}

/** Shrinks / drops segments until the layout fits between start and exit door. */
function fitSegments(segsIn) {
  const segs = segsIn.map((s) => ({ ...s }));
  for (let guard = 0; guard < 80; guard++) {
    const start = startXFor(crateCountOf(segs)) + 42;
    const total = segs.reduce((a, s) => a + footprint(s), 0);
    if (total <= 296 - start) return segs;
    const pit = segs.find((s) => s.t === 'PIT' && s.w > 90);
    if (pit) {
      pit.w -= 10;
      continue;
    }
    const fence = segs.find((s) => s.t === 'FENCE' && s.hi > 0);
    if (fence) {
      fence.hi -= 1;
      continue;
    }
    const wall = segs.find((s) => s.t === 'WALL' && s.n > 1);
    if (wall) {
      wall.n = wall.n === 4 ? 2 : 1;
      continue;
    }
    if (segs.length > 1) {
      segs.pop();
      continue;
    }
    return segs;
  }
  return segs;
}

function signatureOf(spec) {
  return (
    spec.segs
      .map((s) => [s.t, s.w || '', s.n || '', s.hi === undefined ? '' : s.hi, s.high ? 'h' : ''].join(':'))
      .join('|') +
    `|k${spec.wallKey ? 1 : 0}${spec.doorKeys || 0}${spec.floatKeys || 0}p${spec.padlock ? 1 : 0}`
  );
}

function genSpec(lvl, salt) {
  const rng = mulberry32(lvl * 9973 + salt * 131 + 7);
  const d = (lvl - 9) / 91;
  const count = lvl <= 45 ? 2 : lvl <= 70 ? (rng() < 0.45 ? 3 : 2) : rng() < 0.85 ? 3 : 2;
  const bag = [...POOL];
  const types = [];
  while (types.length < count) {
    const k = Math.floor(rng() * bag.length);
    types.push(bag.splice(k, 1)[0]);
  }
  const rawSegs = types.map((t) => {
    switch (t) {
      case 'PIT':
        return { t, w: Math.min(150, 90 + Math.round((d * 55 + rng() * 10) / 10) * 10) };
      case 'WALL': {
        let n = 1;
        if (d >= 0.6) n = rng() < 0.5 ? 2 : 4;
        else if (d >= 0.3) n = rng() < 0.5 ? 1 : 2;
        return { t, n };
      }
      case 'GATE_S':
        return { t, high: rng() < 0.25 + d * 0.6 };
      case 'FENCE':
        return { t, hi: Math.min(2, Math.floor(d * 2.4 + rng() * 0.9)) };
      case 'HOP':
        return { t, w: Math.min(52, Math.round(34 + d * 16 + rng() * 2)) };
      default:
        return { t };
    }
  });
  const segs = fitSegments(rawSegs);
  const hasWall = segs.some((s) => s.t === 'WALL');
  const spec = {
    segs,
    wallKey: hasWall && rng() < 0.7,
    doorKeys: lvl >= 30 ? (rng() < 0.5 ? 1 : 0) + (lvl >= 70 && rng() < 0.5 ? 1 : 0) : 0,
    floatKeys: lvl < 60 && rng() < 0.3 ? 1 : 0,
    padlock: lvl >= 40 && rng() < 0.45,
  };
  return spec;
}

let SPEC_CACHE = null;
function getSpecs() {
  if (SPEC_CACHE) return SPEC_CACHE;
  const used = new Set();
  const cache = {};
  for (let lvl = 9; lvl <= 100; lvl++) {
    let spec;
    if (EARLY[lvl]) {
      spec = { ...EARLY[lvl], segs: fitSegments(EARLY[lvl].segs) };
    } else {
      for (let salt = 0; salt < 60; salt++) {
        spec = genSpec(lvl, salt);
        if (!used.has(signatureOf(spec))) break;
      }
    }
    used.add(signatureOf(spec));
    cache[lvl] = spec;
  }
  SPEC_CACHE = cache;
  return cache;
}

function buildRoom(lvl, shownLvl, spec) {
  const rng = mulberry32(lvl * 4241 + 99);
  const segs = spec.segs;
  const crateCount = crateCountOf(segs);
  const px = startXFor(crateCount);
  let cursor = px + 42;

  const platforms = [
    { id: 'floor', x: 0, y: 300, w: 360, h: 40 },
    { id: 'w_left', x: 0, y: 0, w: 12, h: 300 },
    { id: 'w_right', x: 348, y: 0, w: 12, h: 300 },
    { id: 'ceiling', x: 0, y: 0, w: 360, h: 12 },
  ];
  const crates = [];
  const switches = [];
  const keys = [];
  const plates = [];
  const hazards = [];
  const barriers = [];
  let plug = null;
  let padlock = null;
  let slabNeed = 0;
  let wallTopKey = null;
  let swN = 0;
  const GATE_COLOR = '#FF0055';

  segs.forEach((s, i) => {
    switch (s.t) {
      case 'PIT': {
        hazards.push({ x: cursor + 14, y: 286, w: s.w, h: 14, type: 'SPIKES' });
        slabNeed = Math.max(slabNeed, Math.ceil(s.w / 58));
        break;
      }
      case 'WALL': {
        const x0 = cursor + 36;
        const H = WALL_H[s.n];
        platforms.push({ id: `wall_${i}`, x: x0, y: 300 - H, w: 26, h: H });
        if (!wallTopKey) wallTopKey = { x: x0 + 13, y: 300 - H - 14 };
        break;
      }
      case 'GATE_S': {
        const id = `sw_${swN++}`;
        switches.push({ id, x: cursor + 14, y: s.high ? 236 : 272, active: false });
        barriers.push({
          id: `gate_${i}`,
          x: cursor + 50,
          y: 12,
          w: 8,
          h: 288,
          active: true,
          color: GATE_COLOR,
          switchId: id,
        });
        break;
      }
      case 'GATE_P': {
        const id = `pl_${i}`;
        plates.push({ id, x: cursor + 8, y: 295, w: 38, h: 6, pressed: false, pressedByFinger: false });
        barriers.push({
          id: `gate_${i}`,
          x: cursor + 66,
          y: 12,
          w: 8,
          h: 288,
          active: true,
          color: GATE_COLOR,
          plateIds: [id],
        });
        break;
      }
      case 'FENCE': {
        const n = FENCE_N[s.hi];
        const h = FENCE_H[s.hi];
        const xb = cursor + n * 42 + 20;
        const id = `sw_${swN++}`;
        slabNeed = Math.max(slabNeed, n);
        barriers.push({
          id: `fence_${i}`,
          x: xb,
          y: 300 - h,
          w: 8,
          h,
          active: true,
          color: GATE_COLOR,
          switchId: id,
        });
        switches.push({ id, x: xb + 28, y: 272, active: false });
        break;
      }
      case 'HOP': {
        hazards.push({ x: cursor + 14, y: 286, w: s.w, h: 14, type: 'SPIKES' });
        break;
      }
      case 'PLUG': {
        barriers.push({
          id: `gate_${i}`,
          x: cursor + 20,
          y: 12,
          w: 8,
          h: 288,
          active: true,
          color: GATE_COLOR,
          byPlug: true,
        });
        plug = { id: 'plug1', x: 65, y: 180, plugged: true };
        break;
      }
      case 'DUAL': {
        plates.push(
          { id: `pl_${i}_a`, x: cursor + 10, y: 295, w: 38, h: 6, pressed: false, pressedByFinger: false },
          {
            id: `pl_${i}_b`,
            x: cursor + 100,
            y: 295,
            w: 38,
            h: 6,
            pressed: false,
            pressedByFinger: false,
            fingerLatch: true,
          }
        );
        break;
      }
      default:
        break;
    }
    cursor += footprint(s);
  });

  for (let i = 0; i < slabNeed; i++) {
    platforms.push({
      id: `slab_${i}`,
      x: 24 + i * 78,
      y: 64 + (i % 2) * 36,
      w: 60,
      h: 14,
      isDraggable: true,
      color: '#00F5D4',
    });
  }

  for (let i = 0; i < crateCount; i++) {
    crates.push({ id: `c${i}`, x: 18 + 28 * i, y: 274, vx: 0, vy: 0, isDraggable: true });
  }

  // Keys
  if (spec.wallKey && wallTopKey) {
    keys.push({ id: 'k_wall', x: wallTopKey.x, y: wallTopKey.y, taken: false, color: '#FFD166', isDraggable: false });
  }
  for (let j = 0; j < (spec.doorKeys || 0); j++) {
    keys.push({ id: `k_door${j}`, x: 298 - j * 16, y: 282, taken: false, color: '#39FF14', isDraggable: false });
  }
  const floatCount = spec.floatKeys || 0;
  for (let j = 0; j < floatCount; j++) {
    keys.push({
      id: `k_float${j}`,
      x: Math.round(70 + rng() * 220),
      y: Math.round(40 + rng() * 70),
      taken: false,
      color: '#00F5FF',
      isDraggable: true,
    });
  }

  const exitDoor = spec.doorHigh
    ? { x: 300, y: 50, w: 28, h: 42, locked: true, isDraggable: true }
    : { x: 310, y: 254, w: 28, h: 42, locked: true, isDraggable: false };
  if (spec.padlock && !spec.doorHigh) padlock = { id: 'pad1', x: 316, y: 268, onDoor: true };

  const names = spec.name ? [spec.name] : segs.map((s) => NAMES[s.t]);
  const hints = spec.hint ? [spec.hint] : segs.map((s) => HINTS[s.t]);
  if (padlock) hints.push('RIP OFF THE PADLOCK');
  const extraKeys = keys.length > 0 ? ' + COLLECT KEYS' : '';
  const title = `CHAMBER ${String(shownLvl).padStart(2, '0')}: ${names.slice(0, 2).join(' + ')}`;
  const hint = (hints.slice(0, 3).join(' → ') + extraKeys).slice(0, 90);

  return {
    title,
    hint,
    playerStart: { x: px, y: 260 },
    exitDoor,
    platforms,
    crates,
    switches,
    keys,
    plates,
    hazards,
    barriers,
    plug,
    padlock,
  };
}

/** Rooms for levels 9..100 (levels above 100 loop back through 9..100). */
export function getGeneratedRoom(lvl) {
  const idx = lvl <= 100 ? lvl : 9 + ((lvl - 9) % 92);
  return buildRoom(idx, lvl, getSpecs()[idx]);
}

export const CHAMBER_LEVEL_COUNT = 100;
