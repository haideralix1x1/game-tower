/**
 * Game Unlocking Progression System
 * Organizes 30 games into 6 categories with cross-game score unlocks.
 */

export const CATEGORIES = [
  { id: 'ALL', label: 'ALL', icon: '🌐' },
  { id: 'NUMBERS', label: 'NUMBERS', icon: '🔢' },
  { id: 'WORDS', label: 'WORDS', icon: '🔤' },
  { id: 'ARCADE', label: 'ARCADE', icon: '👾' },
  { id: 'PUZZLES', label: 'PUZZLES', icon: '🧩' },
  { id: 'BRAIN', label: 'BRAIN', icon: '🧠' },
  { id: 'STRATEGY', label: 'STRATEGY', icon: '⚔️' },
];

export const STARTER_GAMES = [
  'cyber_2048',   // Numbers Starter (Floor 01)
  'cyber_sudoku', // Numbers Starter (Floor 20)
  'wordly_neo',   // Words Starter (Floor 02)
  'cyber_snake',  // Arcade Starter (Floor 10)
  'block_blast',  // Puzzles Starter (Floor 13)
  'memory_matrix',// Brain Starter (Floor 04)
  'tic_tac_toe',  // Strategy Starter (Floor 12)
];

/**
 * Requirements to unlock each locked game.
 * reqGame: ID of the prerequisite game
 * targetScore: score required in prerequisite game
 * desc: human readable hint
 */
export const UNLOCK_REQUIREMENTS = {
  // NUMBERS CATEGORY
  math_blitz: {
    reqGame: 'cyber_sudoku',
    targetScore: 50,
    desc: 'Score 50+ in SUDOKU',
    category: 'NUMBERS',
  },
  number_hunt: {
    reqGame: 'math_blitz',
    targetScore: 50,
    desc: 'Score 50+ in MATH BLITZ',
    category: 'NUMBERS',
  },
  cyber_slide: {
    reqGame: 'number_hunt',
    targetScore: 60,
    desc: 'Score 60+ in NUMBER HUNT 25',
    category: 'NUMBERS',
  },

  // WORDS CATEGORY
  knife_hit: {
    reqGame: 'wordly_neo',
    targetScore: 1,
    desc: 'Solve 1 word in WORDLY NEO',
    category: 'WORDS',
  },

  // ARCADE CATEGORY
  brick_breaker: {
    reqGame: 'cyber_snake',
    targetScore: 40,
    desc: 'Score 40+ in SNAKE',
    category: 'ARCADE',
  },
  neon_flappy: {
    reqGame: 'brick_breaker',
    targetScore: 80,
    desc: 'Score 80+ in BRICK BREAKER NEO',
    category: 'ARCADE',
  },
  space_shooter: {
    reqGame: 'neon_flappy',
    targetScore: 5,
    desc: 'Score 5+ in NEON FLAPPY',
    category: 'ARCADE',
  },
  whack_a_bot: {
    reqGame: 'space_shooter',
    targetScore: 80,
    desc: 'Score 80+ in SPACE SHOOTER NEO',
    category: 'ARCADE',
  },
  icy_climber: {
    reqGame: 'whack_a_bot',
    targetScore: 100,
    desc: 'Score 100+ in WHACK-A-BOT',
    category: 'ARCADE',
  },
  cyber_tetris: {
    reqGame: 'icy_climber',
    targetScore: 100,
    desc: 'Score 100+ in SPIRE ASCENT',
    category: 'ARCADE',
  },
  cyber_bomber: {
    reqGame: 'cyber_tetris',
    targetScore: 100,
    desc: 'Score 100+ in CYBER TETRIS',
    category: 'ARCADE',
  },

  // PUZZLES CATEGORY
  match3_saga: {
    reqGame: 'block_blast',
    targetScore: 150,
    desc: 'Score 150+ in BLOCK BLAST 8x8',
    category: 'PUZZLES',
  },
  color_tube: {
    reqGame: 'match3_saga',
    targetScore: 120,
    desc: 'Score 120+ in MATCH 3 SAGA',
    category: 'PUZZLES',
  },
  hanoi_tower: {
    reqGame: 'color_tube',
    targetScore: 1,
    desc: 'Clear 1 tube in COLOR TUBE SORT',
    category: 'PUZZLES',
  },
  lights_out: {
    reqGame: 'hanoi_tower',
    targetScore: 1,
    desc: 'Clear 1 level in TOWER OF HANOI',
    category: 'PUZZLES',
  },
  tap_away: {
    reqGame: 'lights_out',
    targetScore: 1,
    desc: 'Solve 1 puzzle in GRID HACKER',
    category: 'PUZZLES',
  },
  cyber_pathfinder: {
    reqGame: 'tap_away',
    targetScore: 1,
    desc: 'Clear 1 level in TAP AWAY ARROWS',
    category: 'PUZZLES',
  },
  cyber_screw: {
    reqGame: 'cyber_pathfinder',
    targetScore: 1,
    desc: 'Clear 1 level in CYBER PATHFINDER',
    category: 'PUZZLES',
  },

  // BRAIN CATEGORY
  simon_pulse: {
    reqGame: 'memory_matrix',
    targetScore: 4,
    desc: 'Score 4+ in MEMORY MATRIX',
    category: 'BRAIN',
  },
  color_stroop: {
    reqGame: 'simon_pulse',
    targetScore: 6,
    desc: 'Score 6+ in SIMON PULSE',
    category: 'BRAIN',
  },
  color_switch: {
    reqGame: 'color_stroop',
    targetScore: 60,
    desc: 'Score 60+ in COLOR STROOP',
    category: 'BRAIN',
  },
  hardcore_runner: {
    reqGame: 'color_switch',
    targetScore: 6,
    desc: 'Score 6+ in COLOR SWITCH NEO',
    category: 'BRAIN',
  },

  // STRATEGY & PHYSICS CATEGORY
  neon_mines: {
    reqGame: 'tic_tac_toe',
    targetScore: 100,
    desc: 'Score 100+ in BOX ESCAPE',
    category: 'STRATEGY',
  },
  chroma_flood: {
    reqGame: 'neon_mines',
    targetScore: 1,
    desc: 'Clear 1 minefield in NEON MINES',
    category: 'STRATEGY',
  },
  rope_cut: {
    reqGame: 'chroma_flood',
    targetScore: 1,
    desc: 'Win 1 round in CHROMA FLOOD',
    category: 'STRATEGY',
  },
  save_the_dog: {
    reqGame: 'rope_cut',
    targetScore: 1,
    desc: 'Complete 1 level in ROPE DROP',
    category: 'STRATEGY',
  },
  thief_escape: {
    reqGame: 'save_the_dog',
    targetScore: 1,
    desc: 'Clear 1 level in SAVE THE DOGE',
    category: 'STRATEGY',
  },
};

/**
 * Returns mapping of gameId to broad Category ID.
 */
export const GAME_CATEGORY_MAP = {
  // Numbers
  cyber_2048: 'NUMBERS',
  cyber_sudoku: 'NUMBERS',
  math_blitz: 'NUMBERS',
  number_hunt: 'NUMBERS',
  cyber_slide: 'NUMBERS',

  // Words
  wordly_neo: 'WORDS',
  knife_hit: 'WORDS',

  // Arcade
  cyber_snake: 'ARCADE',
  brick_breaker: 'ARCADE',
  neon_flappy: 'ARCADE',
  space_shooter: 'ARCADE',
  whack_a_bot: 'ARCADE',
  icy_climber: 'ARCADE',
  cyber_tetris: 'ARCADE',
  cyber_bomber: 'ARCADE',

  // Puzzles
  block_blast: 'PUZZLES',
  match3_saga: 'PUZZLES',
  color_tube: 'PUZZLES',
  hanoi_tower: 'PUZZLES',
  lights_out: 'PUZZLES',
  tap_away: 'PUZZLES',
  cyber_pathfinder: 'PUZZLES',
  cyber_screw: 'PUZZLES',

  // Brain
  memory_matrix: 'BRAIN',
  simon_pulse: 'BRAIN',
  color_stroop: 'BRAIN',
  color_switch: 'BRAIN',
  hardcore_runner: 'BRAIN',

  // Strategy
  tic_tac_toe: 'STRATEGY',
  neon_mines: 'STRATEGY',
  chroma_flood: 'STRATEGY',
  rope_cut: 'STRATEGY',
  save_the_dog: 'STRATEGY',
  thief_escape: 'STRATEGY',
};

/**
 * Evaluates whether a game is unlocked based on high scores or starter set.
 */
export function isGameUnlocked(gameId, highScores = {}, customUnlockedList = []) {
  if (STARTER_GAMES.includes(gameId)) return true;
  if (customUnlockedList.includes(gameId)) return true;

  const req = UNLOCK_REQUIREMENTS[gameId];
  if (!req) return true; // If no requirement, unlocked

  const prereqScore = highScores[req.reqGame] || 0;
  return prereqScore >= req.targetScore;
}

/**
 * Returns unlock progress ratio (0 to 1) for a locked game.
 */
export function getUnlockProgress(gameId, highScores = {}) {
  if (STARTER_GAMES.includes(gameId)) return 1;
  const req = UNLOCK_REQUIREMENTS[gameId];
  if (!req) return 1;

  const prereqScore = highScores[req.reqGame] || 0;
  return Math.min(1, Math.max(0, prereqScore / req.targetScore));
}

/**
 * Returns the prerequisite game ID for a given locked game.
 */
export function getPrerequisiteGame(gameId) {
  const req = UNLOCK_REQUIREMENTS[gameId];
  return req ? req.reqGame : null;
}

