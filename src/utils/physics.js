import { THEMES, GAME_CONFIG, COLORS } from '../../styles';

let entityIdCounter = 1;
export const nextEntityId = (prefix = 'ent') => {
  entityIdCounter += 1;
  return `${prefix}_${entityIdCounter}`;
};

export const getBlockColor = (index, themeId = 'CYBER_NEON') => {
  const theme = THEMES[themeId] || THEMES.CYBER_NEON;
  const palette = theme.palette;
  const safeIndex = Math.abs(index) % palette.length;
  return palette[safeIndex];
};

export const getSpeedForBlockCount = (placedCount) => {
  const level = Math.floor(placedCount / GAME_CONFIG.BLOCKS_PER_SPEED_LEVEL) + 1;
  const speed = Math.min(
    GAME_CONFIG.MAX_SPEED,
    GAME_CONFIG.BASE_SPEED + (level - 1) * GAME_CONFIG.SPEED_INCREMENT_PER_LEVEL
  );
  const multiplierRatio = (speed / GAME_CONFIG.BASE_SPEED).toFixed(1);
  return { level, speed, multiplierRatio };
};

/**
 * Evaluates a dropped block against the current top block of the stack.
 * Handles:
 *  - MISS (0 overlap)
 *  - PERFECT (within 5% alignment tolerance, awards combo & width expansion)
 *  - SLICED (cuts overhanging portion into falling physics debris)
 */
export const evaluateBlockDrop = ({
  activeBlock,
  targetBlock,
  currentCombo,
  maxInitialWidth,
  screenWidth,
}) => {
  const deltaX = activeBlock.x - targetBlock.x;
  const absDelta = Math.abs(deltaX);

  const overlapLeft = Math.max(activeBlock.x, targetBlock.x);
  const overlapRight = Math.min(
    activeBlock.x + activeBlock.width,
    targetBlock.x + targetBlock.width
  );
  const overlapWidth = overlapRight - overlapLeft;

  // 1. Complete Miss -> Game Over
  if (overlapWidth <= 2) {
    const missDirection = deltaX < 0 ? -1 : 1;
    return {
      status: 'MISS',
      placedBlock: null,
      debris: {
        id: nextEntityId('debris'),
        x: activeBlock.x,
        y: activeBlock.y,
        width: activeBlock.width,
        height: activeBlock.height,
        vx: missDirection * 80,
        vy: 25,
        rotation: 0,
        angularVelocity: missDirection * 175,
        opacity: 1,
        color: activeBlock.color,
      },
      newCombo: 0,
      pointsEarned: 0,
      widthRestored: 0,
      cutX: activeBlock.x + activeBlock.width / 2,
    };
  }

  // 2. Check for Near-Perfect Alignment (within 5% of target width)
  const perfectTolerancePx = Math.max(
    GAME_CONFIG.PERFECT_MIN_TOLERANCE_PX,
    targetBlock.width * GAME_CONFIG.PERFECT_TOLERANCE_RATIO
  );

  if (absDelta <= perfectTolerancePx) {
    const newCombo = currentCombo + 1;
    let finalWidth = targetBlock.width;
    let finalX = targetBlock.x;
    let widthRestored = 0;

    // On combo streaks >= 2, reward player by expanding the block width slightly
    if (
      newCombo >= GAME_CONFIG.STREAK_FOR_WIDTH_BONUS &&
      targetBlock.width < maxInitialWidth
    ) {
      const expandedWidth = Math.min(
        maxInitialWidth,
        targetBlock.width + GAME_CONFIG.WIDTH_BONUS_PX
      );
      widthRestored = Math.round(expandedWidth - targetBlock.width);
      const center = targetBlock.x + targetBlock.width / 2;
      finalWidth = expandedWidth;
      finalX = Math.max(
        16,
        Math.min(screenWidth - finalWidth - 16, center - finalWidth / 2)
      );
    }

    const comboMultiplier = Math.min(6, 1 + newCombo);
    const pointsEarned = 10 * comboMultiplier;

    return {
      status: 'PERFECT',
      placedBlock: {
        id: nextEntityId('block'),
        index: activeBlock.index,
        x: finalX,
        y: activeBlock.y,
        width: finalWidth,
        height: activeBlock.height,
        color: activeBlock.color,
        isPerfect: true,
        comboStreak: newCombo,
      },
      debris: null,
      newCombo,
      pointsEarned,
      widthRestored,
      cutX: finalX + finalWidth / 2,
    };
  }

  // 3. Partial Overlap -> Precision Slice
  const isLeftOverhang = deltaX < 0;
  const debrisX = isLeftOverhang
    ? activeBlock.x
    : targetBlock.x + targetBlock.width;
  const debrisWidth = Math.max(4, activeBlock.width - overlapWidth);
  const cutX = isLeftOverhang
    ? targetBlock.x
    : targetBlock.x + targetBlock.width;
  const sideSign = isLeftOverhang ? -1 : 1;

  // Accuracy bonus for close cuts (10 to 18 points)
  const accuracyRatio = overlapWidth / targetBlock.width;
  const pointsEarned = Math.max(10, Math.round(10 + accuracyRatio * 8));

  return {
    status: 'SLICED',
    placedBlock: {
      id: nextEntityId('block'),
      index: activeBlock.index,
      x: overlapLeft,
      y: activeBlock.y,
      width: overlapWidth,
      height: activeBlock.height,
      color: activeBlock.color,
      isPerfect: false,
      comboStreak: 0,
    },
    debris: {
      id: nextEntityId('debris'),
      x: debrisX,
      y: activeBlock.y,
      width: debrisWidth,
      height: activeBlock.height,
      vx: sideSign * (105 + Math.min(95, debrisWidth * 0.65)),
      vy: -75,
      rotation: 0,
      angularVelocity: sideSign * 260,
      opacity: 1,
      color: activeBlock.color,
    },
    newCombo: 0,
    pointsEarned,
    widthRestored: 0,
    cutX,
  };
};

/**
 * Generates a burst of glowing neon particles at the slice or perfect impact coordinates.
 */
export const createParticleBurst = ({
  x,
  y,
  color,
  count = 20,
  isPerfect = false,
  blockWidth = 0,
}) => {
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    const spreadX = isPerfect
      ? x - blockWidth / 2 + Math.random() * blockWidth
      : x + (Math.random() - 0.5) * 16;

    const angle = isPerfect
      ? -Math.PI * 0.1 - Math.random() * Math.PI * 0.8
      : -Math.PI * 0.88 + Math.random() * Math.PI * 0.76;

    const speed = isPerfect
      ? 100 + Math.random() * 240
      : 80 + Math.random() * 210;

    const size = isPerfect ? 4.5 + Math.random() * 5.5 : 3.5 + Math.random() * 5;

    particles.push({
      id: nextEntityId('pt'),
      x: spreadX,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (isPerfect ? 75 : 35),
      size,
      isDiamond: i % 2 === 0,
      opacity: 1,
      decay: 1.25 + Math.random() * 0.75,
      color:
        i % 3 === 0
          ? '#FFFFFF'
          : i % 2 === 0
            ? color.primary
            : isPerfect
              ? COLORS.solarGold
              : color.highlight,
    });
  }
  return particles;
};
