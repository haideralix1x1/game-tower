import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
  G,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playTapSound, playSliceSound, playGameOverSound } from '../utils/sound';
import { triggerLightHaptic, triggerMediumHaptic, triggerGameOverHaptic } from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const DOG_RADIUS = 26;
const BEE_RADIUS = 9;
const SURVIVE_TIME = 6;
const PLATFORM_WIDTH = 96;
const PLATFORM_HEIGHT = 16;

// Helper: distance from point (px, py) to line segment (x1, y1)-(x2, y2)
function distPointToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export default function SaveTheDogGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  // Short Platform elevated in the middle of the screen
  const platformY = Math.round(arenaHeight * 0.48);
  // Toxic Acid Water pool down below
  const acidY = arenaHeight - 65;

  const [platform, setPlatform] = useState({
    x: (arenaWidth - PLATFORM_WIDTH) / 2,
    y: platformY,
    width: PLATFORM_WIDTH,
    height: PLATFORM_HEIGHT,
  });
  const platformRef = useRef(platform);
  platformRef.current = platform;

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('DRAWING'); // 'DRAWING', 'SWARMING', 'OVER'
  const [timeLeft, setTimeLeft] = useState(SURVIVE_TIME);
  const [inkLeft, setInkLeft] = useState(100);

  // Drawn lines
  const [currentLine, setCurrentLine] = useState([]);
  const [savedLines, setSavedLines] = useState([]);

  // Dog position & velocity
  const [dog, setDog] = useState({
    x: arenaWidth * 0.5,
    y: groundY - DOG_RADIUS,
    vy: 0,
  });

  // Hives & Bees
  const [hives, setHives] = useState([]);
  const [bees, setBees] = useState([]);

  // Result modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');

  const dogRef = useRef(dog);
  dogRef.current = dog;
  const savedLinesRef = useRef(savedLines);
  savedLinesRef.current = savedLines;
  const beesRef = useRef(bees);
  beesRef.current = bees;
  const linesVelocityRef = useRef({ vx: 0, vy: 0 });
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const animFrameRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize Level
  const initLevel = useCallback(
    (lvl) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);

      setSavedLines([]);
      setCurrentLine([]);
      savedLinesRef.current = [];
      linesVelocityRef.current = { vx: 0, vy: 0 };
      setInkLeft(100);
      setTimeLeft(SURVIVE_TIME);
      timeLeftRef.current = SURVIVE_TIME;
      setGameState('DRAWING');
      gameStateRef.current = 'DRAWING';
      setModalVisible(false);

      const platX = Math.round(
        arenaWidth * 0.5 + ((lvl % 2 === 0 ? 1 : -1) * 36) - PLATFORM_WIDTH / 2
      );
      const newPlat = {
        x: Math.max(24, Math.min(arenaWidth - PLATFORM_WIDTH - 24, platX)),
        y: platformY,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
      };
      setPlatform(newPlat);
      platformRef.current = newPlat;

      const dX = newPlat.x + newPlat.width / 2;
      const dY = newPlat.y - DOG_RADIUS;
      const newDog = { x: dX, y: dY, vy: 0 };
      setDog(newDog);
      dogRef.current = newDog;

      // Hives placed near top
      const hiveCount = Math.min(3, 1 + Math.floor((lvl - 1) / 2));
      const newHives = [];
      for (let i = 0; i < hiveCount; i++) {
        const hx = (arenaWidth * (i + 1)) / (hiveCount + 1);
        const hy = 80 + (i % 2) * 26;
        newHives.push({ id: `hive_${i}`, x: hx, y: hy });
      }
      setHives(newHives);

      // Bees
      const beeCount = 8 + Math.min(10, lvl * 2);
      const initialBees = [];
      for (let i = 0; i < beeCount; i++) {
        const h = newHives[i % newHives.length];
        initialBees.push({
          id: `bee_${i}`,
          x: h.x + (Math.random() - 0.5) * 16,
          y: h.y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 2,
          vy: 1 + Math.random() * 2,
        });
      }
      setBees(initialBees);
      beesRef.current = initialBees;
    },
    [arenaWidth, platformY]
  );

  useEffect(() => {
    initLevel(level);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [level, initLevel]);

  // PanResponder to draw lines (bulletproof coordinates without snapping)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => gameStateRef.current === 'DRAWING',
      onMoveShouldSetPanResponder: () => gameStateRef.current === 'DRAWING',
      onPanResponderGrant: (evt) => {
        if (gameStateRef.current !== 'DRAWING') return;
        const { locationX, locationY } = evt.nativeEvent;
        // Don't draw over action buttons at bottom
        if (locationY > arenaHeight - 75) return;
        setCurrentLine([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        if (gameStateRef.current !== 'DRAWING') return;
        const { locationX, locationY } = evt.nativeEvent;
        if (locationY > arenaHeight - 75) return;

        setCurrentLine((prev) => {
          if (prev.length === 0) return [{ x: locationX, y: locationY }];
          const last = prev[prev.length - 1];

          // Protection against coordinate snapping glitch
          const deltaY = Math.abs(locationY - last.y);
          const deltaX = Math.abs(locationX - last.x);
          if (deltaY > 90 || deltaX > 90) return prev;

          const dist = Math.hypot(deltaX, deltaY);
          if (dist > 5) {
            setInkLeft((ink) => Math.max(0, ink - dist * 0.08));
            return [...prev, { x: locationX, y: locationY }];
          }
          return prev;
        });
      },
      onPanResponderRelease: () => {
        if (gameStateRef.current !== 'DRAWING') return;
        setCurrentLine((line) => {
          if (line.length > 2) {
            setSavedLines((all) => {
              const updated = [...all, line];
              savedLinesRef.current = updated;
              return updated;
            });
            playTapSound();
          }
          return [];
        });
      },
    })
  ).current;

  // Clear drawn line
  const handleClear = () => {
    if (gameState !== 'DRAWING') return;
    setSavedLines([]);
    savedLinesRef.current = [];
    linesVelocityRef.current = { vx: 0, vy: 0 };
    setCurrentLine([]);
    setInkLeft(100);
    playTapSound();
  };

  // Launch the Bee Swarm!
  const launchSwarm = () => {
    if (gameState !== 'DRAWING') return;
    if (currentLine.length > 2) {
      setSavedLines((all) => {
        const updated = [...all, currentLine];
        savedLinesRef.current = updated;
        return updated;
      });
      setCurrentLine([]);
    }

    setGameState('SWARMING');
    gameStateRef.current = 'SWARMING';
    setTimeLeft(SURVIVE_TIME);
    timeLeftRef.current = SURVIVE_TIME;
    linesVelocityRef.current = { vx: 0, vy: 0 };
    playSliceSound();
    triggerMediumHaptic();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleWin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 60 FPS Swarm, Dog & Line Gravity Physics Loop
  useEffect(() => {
    if (gameState !== 'SWARMING') return;

    let active = true;

    const tick = () => {
      if (!active || gameStateRef.current !== 'SWARMING') return;

      const currentDog = { ...dogRef.current };
      let lines = savedLinesRef.current;
      const lVel = linesVelocityRef.current;

      // 1. Calculate Bees Movement & Physical Push Force onto Drawn Lines
      let pushForceX = 0;
      let pushForceY = 0;
      let stung = false;

      const currentBees = beesRef.current;
      const updatedBees = currentBees.map((b) => {
        const dx = currentDog.x - b.x;
        const dy = currentDog.y - b.y;
        const distToDog = Math.hypot(dx, dy);

        // Sting check
        if (distToDog < DOG_RADIUS + BEE_RADIUS - 4) {
          stung = true;
        }

        // Desired velocity towards dog
        const speed = 3.4 + level * 0.15;
        const dirX = dx / (distToDog || 1);
        const dirY = dy / (distToDog || 1);
        let vx = dirX * speed + (Math.random() - 0.5) * 1.6;
        let vy = dirY * speed + (Math.random() - 0.5) * 1.6;

        let nextBeeX = b.x + vx;
        let nextBeeY = b.y + vy;

        // Check barrier collisions & transfer physical push force
        for (const line of lines) {
          for (let i = 0; i < line.length - 1; i++) {
            const p1 = line[i];
            const p2 = line[i + 1];
            const d = distPointToSegment(nextBeeX, nextBeeY, p1.x, p1.y, p2.x, p2.y);
            if (d < BEE_RADIUS + 5) {
              // The bee's impact transfers physical momentum/force onto the drawn line!
              pushForceX += dirX * 0.75;
              pushForceY += dirY * 0.75;

              // Bounce the bee off the line
              const segDx = p2.x - p1.x;
              const segDy = p2.y - p1.y;
              const len = Math.hypot(segDx, segDy) || 1;
              const normX = -segDy / len;
              const normY = segDx / len;
              nextBeeX = b.x + normX * speed * 2;
              nextBeeY = b.y + normY * speed * 2;
              vx = normX * speed;
              vy = normY * speed;
              break;
            }
          }
        }

        return {
          ...b,
          x: nextBeeX,
          y: nextBeeY,
          vx,
          vy,
        };
      });

      beesRef.current = updatedBees;
      setBees(updatedBees);

      if (stung && gameStateRef.current === 'SWARMING') {
        handleLose();
        return;
      }

      // 2. Line Physics (Gravity, Mass, Bee Push Momentum, Ground Friction)
      let totalPts = 0;
      let lowestY = -Infinity;
      let minX = Infinity;
      let maxX = -Infinity;

      for (const line of lines) {
        totalPts += line.length;
        for (const pt of line) {
          if (pt.y > lowestY) lowestY = pt.y;
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
        }
      }

      if (totalPts > 0) {
        // Line mass: longer lines are heavier, small lines get shoved easily
        const mass = Math.max(1, totalPts / 12);
        lVel.vx += pushForceX / mass;
        lVel.vy += pushForceY / mass;

        // Gravity pulls line down
        lVel.vy += 0.35;

        // Air drag
        lVel.vx *= 0.90;
        lVel.vy *= 0.95;

        // Platform & Acid pool surface collision check
        const plat = platformRef.current;
        let restsOnPlatform = false;
        for (const line of lines) {
          for (const pt of line) {
            if (
              pt.x >= plat.x - 4 &&
              pt.x <= plat.x + plat.width + 4 &&
              Math.abs(pt.y - (plat.y - 2)) < 6
            ) {
              restsOnPlatform = true;
              break;
            }
          }
          if (restsOnPlatform) break;
        }

        const onGround = lowestY >= acidY - 4 || restsOnPlatform;
        if (onGround) {
          lVel.vx *= 0.78; // Surface friction resists sliding
          if (lVel.vy > 0) lVel.vy = 0; // Resting
        }

        // Left / Right screen boundary
        if (minX + lVel.vx < 4 && lVel.vx < 0) lVel.vx = 0;
        if (maxX + lVel.vx > arenaWidth - 4 && lVel.vx > 0) lVel.vx = 0;

        // Dog collision with line: line cannot crush into dog; transfers partial horizontal nudge
        for (const line of lines) {
          for (let i = 0; i < line.length - 1; i++) {
            const p1 = line[i];
            const p2 = line[i + 1];
            const d = distPointToSegment(currentDog.x, currentDog.y, p1.x + lVel.vx, p1.y + lVel.vy, p2.x + lVel.vx, p2.y + lVel.vy);
            if (d < DOG_RADIUS + 4) {
              if (Math.abs(lVel.vx) > 0.1) {
                currentDog.x += lVel.vx * 0.35;
                lVel.vx = 0;
              }
              if (lVel.vy > 0) lVel.vy = 0;
              break;
            }
          }
        }

        // Apply physical movement delta to all points of the drawn lines
        const dx = lVel.vx;
        const dy = lVel.vy;

        if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) {
          lines = lines.map((line) =>
            line.map((pt) => {
              let ny = pt.y + dy;
              // If resting on top of short platform
              if (
                pt.x >= plat.x - 4 &&
                pt.x <= plat.x + plat.width + 4 &&
                pt.y <= plat.y &&
                ny >= plat.y - 2
              ) {
                ny = plat.y - 2;
              }
              return {
                x: Math.max(4, Math.min(arenaWidth - 4, pt.x + dx)),
                y: Math.min(acidY - 4, ny),
              };
            })
          );
          savedLinesRef.current = lines;
          setSavedLines(lines);
        }
      }

      // 3. Dog Gravity, Short Platform Landing & Acid Water Hazard
      currentDog.vy += 0.32;
      let nextDogY = currentDog.y + currentDog.vy;

      const plat = platformRef.current;
      const isOverPlatform =
        currentDog.x >= plat.x - 6 &&
        currentDog.x <= plat.x + plat.width + 6;

      // Platform Landing: Dog lands on short platform top
      if (
        isOverPlatform &&
        currentDog.y <= plat.y - DOG_RADIUS + 4 &&
        nextDogY >= plat.y - DOG_RADIUS
      ) {
        nextDogY = plat.y - DOG_RADIUS;
        currentDog.vy = 0;
      }

      // Check Dog collision with drawn lines (drawn line can catch/support dog if falling!)
      for (const line of lines) {
        for (let i = 0; i < line.length - 1; i++) {
          const p1 = line[i];
          const p2 = line[i + 1];
          const d = distPointToSegment(currentDog.x, nextDogY, p1.x, p1.y, p2.x, p2.y);
          if (d < DOG_RADIUS + 3) {
            nextDogY = currentDog.y;
            currentDog.vy = 0;
            break;
          }
        }
      }

      // ACID WATER HAZARD: If dog falls off short platform into the bubbling acid lake!
      if (nextDogY >= acidY - DOG_RADIUS) {
        nextDogY = acidY - DOG_RADIUS;
        currentDog.y = nextDogY;
        dogRef.current = currentDog;
        setDog(currentDog);
        if (gameStateRef.current === 'SWARMING') {
          handleLose();
        }
        return;
      }

      currentDog.x = Math.max(DOG_RADIUS + 4, Math.min(arenaWidth - DOG_RADIUS - 4, currentDog.x));
      currentDog.y = nextDogY;
      dogRef.current = currentDog;
      setDog(currentDog);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, acidY, level]);

  const handleWin = () => {
    if (gameStateRef.current !== 'SWARMING') return;
    setGameState('OVER');
    gameStateRef.current = 'OVER';
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    JuiceEngine.celebrate(dog.x, dog.y);
    const winPoints = 300 + Math.floor(inkLeft * 2);
    const nextScore = score + winPoints;
    setScore(nextScore);
    onScoreUpdate?.(nextScore);

    setModalType('win');
    setModalVisible(true);
  };

  const handleLose = () => {
    if (gameStateRef.current !== 'SWARMING') return;
    setGameState('OVER');
    gameStateRef.current = 'OVER';
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    playGameOverSound();
    triggerGameOverHaptic();
    setModalType('gameover');
    setModalVisible(true);
  };

  const handleNextLevel = () => {
    setLevel((lvl) => lvl + 1);
  };

  const handleRetry = () => {
    initLevel(level);
  };

  // Convert array of points to SVG path
  const buildSvgPath = (points) => {
    if (!points || points.length === 0) return '';
    return points.reduce(
      (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
      ''
    );
  };

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={22}
        gameTitle="SAVE CYBER DOGE"
        category="PHYSICS PUZZLE"
        accentColor="#FFD166"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      {/* Top HUD: Level, Ink & Status */}
      <View style={styles.topBar}>
        <View style={styles.badgeBox}>
          <Text style={styles.badgeLabel}>LEVEL</Text>
          <Text style={[styles.badgeVal, { color: '#FFD166' }]}>{level}</Text>
        </View>
        <View style={styles.badgeBox}>
          <Text style={styles.badgeLabel}>ENERGY INK</Text>
          <View style={styles.inkTrack}>
            <View
              style={[
                styles.inkFill,
                {
                  width: `${inkLeft}%`,
                  backgroundColor: inkLeft > 30 ? COLORS.cyan : '#FF0055',
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.badgeBox}>
          <Text style={styles.badgeLabel}>SURVIVE</Text>
          <Text
            style={[
              styles.badgeVal,
              { color: timeLeft <= 2 ? '#FF0055' : COLORS.matrixMint },
            ]}
          >
            {gameState === 'SWARMING' ? `${timeLeft}s` : 'READY'}
          </Text>
        </View>
      </View>

      {/* Touch Arena: pointerEvents="none" on SVG so touches NEVER jump or snap! */}
      <View style={styles.arena} {...panResponder.panHandlers}>
        <Svg
          width={arenaWidth}
          height={arenaHeight}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#7928CA" stopOpacity="0.9" />
            </LinearGradient>
            <LinearGradient id="platGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#25184B" stopOpacity="0.98" />
              <Stop offset="100%" stopColor="#0F0922" stopOpacity="0.98" />
            </LinearGradient>
            <LinearGradient id="acidGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#39FF14" stopOpacity="0.95" />
              <Stop offset="22%" stopColor="#00E676" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#064E3B" stopOpacity="0.98" />
            </LinearGradient>
          </Defs>

          {/* Short Elevated Cyber Platform Under Dog */}
          <G>
            {/* Structural Support Pylons */}
            <Line
              x1={platform.x + 18}
              y1={platform.y + platform.height}
              x2={platform.x + 30}
              y2={platform.y + platform.height + 42}
              stroke="#FF007F"
              strokeWidth={3}
            />
            <Line
              x1={platform.x + platform.width - 18}
              y1={platform.y + platform.height}
              x2={platform.x + platform.width - 30}
              y2={platform.y + platform.height + 42}
              stroke="#FF007F"
              strokeWidth={3}
            />
            <Line
              x1={platform.x + 28}
              y1={platform.y + platform.height + 42}
              x2={platform.x + platform.width - 28}
              y2={platform.y + platform.height + 42}
              stroke="#00F5FF"
              strokeWidth={2}
            />

            {/* Platform Main Body */}
            <Rect
              x={platform.x}
              y={platform.y}
              width={platform.width}
              height={platform.height}
              rx={4}
              fill="url(#platGrad)"
              stroke="#00F5FF"
              strokeWidth={2}
            />
            {/* Glowing Top Ledge */}
            <Line
              x1={platform.x}
              y1={platform.y}
              x2={platform.x + platform.width}
              y2={platform.y}
              stroke="#00F5FF"
              strokeWidth={3.5}
            />
            <Line
              x1={platform.x + 4}
              y1={platform.y + 4}
              x2={platform.x + platform.width - 4}
              y2={platform.y + 4}
              stroke="#FFD166"
              strokeWidth={1.2}
              strokeDasharray="4 4"
            />
          </G>

          {/* Toxic Acid Water Hazard Down Below */}
          <G>
            {/* Acid Water Lake */}
            <Rect
              x={0}
              y={acidY}
              width={arenaWidth}
              height={arenaHeight - acidY}
              fill="url(#acidGrad)"
            />
            {/* Acid Surface Wave Crest */}
            <Line
              x1={0}
              y1={acidY}
              x2={arenaWidth}
              y2={acidY}
              stroke="#39FF14"
              strokeWidth={4}
            />
            <Line
              x1={0}
              y1={acidY + 4}
              x2={arenaWidth}
              y2={acidY + 4}
              stroke="#FFFFFF"
              strokeWidth={1.5}
              strokeDasharray="8 6"
              opacity={0.8}
            />
            {/* Bubbling Acid Droplets */}
            <Circle cx={arenaWidth * 0.16} cy={acidY + 12} r={6} fill="#70FF00" opacity={0.7} />
            <Circle cx={arenaWidth * 0.36} cy={acidY + 18} r={9} fill="#39FF14" opacity={0.8} />
            <Circle cx={arenaWidth * 0.64} cy={acidY + 14} r={7} fill="#70FF00" opacity={0.75} />
            <Circle cx={arenaWidth * 0.86} cy={acidY + 20} r={10} fill="#39FF14" opacity={0.85} />
            {/* Danger Hazard Text */}
            <SvgText
              x={arenaWidth * 0.5}
              y={acidY + 34}
              textAnchor="middle"
              fill="#062F12"
              fontSize={12}
              fontFamily={monoFont}
              fontWeight="900"
            >
              ☣ TOXIC ACID WATER - PROTECT FROM FALL ☣
            </SvgText>
          </G>

          {/* Bee Hives */}
          {hives.map((hive) => (
            <G key={hive.id}>
              <Circle
                cx={hive.x}
                cy={hive.y}
                r={22}
                fill="#FF6D00"
                stroke="#FFD166"
                strokeWidth={2}
              />
              <Circle cx={hive.x} cy={hive.y + 4} r={7} fill="#261000" />
            </G>
          ))}

          {/* Saved Drawn Lines (Physics Barriers with Gravity) */}
          {savedLines.map((line, idx) => (
            <Path
              key={`line_${idx}`}
              d={buildSvgPath(line)}
              stroke="url(#shieldGrad)"
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}

          {/* Active Drawing Line */}
          {currentLine.length > 1 && (
            <Path
              d={buildSvgPath(currentLine)}
              stroke="#00F5FF"
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}

          {/* Cyber Dog sitting on mid-screen platform */}
          <G>
            <Circle
              cx={dog.x}
              cy={dog.y}
              r={DOG_RADIUS}
              fill="#FFD166"
              stroke="#FF6D00"
              strokeWidth={2.5}
            />
            {/* Dog Ears */}
            <Circle cx={dog.x - 18} cy={dog.y - 18} r={9} fill="#FF6D00" />
            <Circle cx={dog.x + 18} cy={dog.y - 18} r={9} fill="#FF6D00" />
            {/* Dog Eyes */}
            <Circle cx={dog.x - 8} cy={dog.y - 4} r={3.5} fill="#050212" />
            <Circle cx={dog.x + 8} cy={dog.y - 4} r={3.5} fill="#050212" />
            {/* Dog Nose & Smile */}
            <Circle cx={dog.x} cy={dog.y + 4} r={4.5} fill="#FF0055" />
            <Text
              x={dog.x - 12}
              y={dog.y + 20}
              style={styles.dogMouthText}
            >
              ∪
            </Text>
          </G>

          {/* Bees */}
          {bees.map((bee) => (
            <G key={bee.id}>
              <Circle
                cx={bee.x}
                cy={bee.y}
                r={BEE_RADIUS}
                fill="#FFE600"
                stroke="#000000"
                strokeWidth={1.5}
              />
              {/* Stripes */}
              <Line
                x1={bee.x - 5}
                y1={bee.y}
                x2={bee.x + 5}
                y2={bee.y}
                stroke="#000000"
                strokeWidth={2}
              />
              {/* Wings */}
              <Circle
                cx={bee.x}
                cy={bee.y - 7}
                r={4}
                fill="rgba(255, 255, 255, 0.7)"
              />
            </G>
          ))}
        </Svg>
      </View>

      {/* Control Buttons during DRAWING state (Well below the mid-screen dog) */}
      {gameState === 'DRAWING' && (
        <View style={styles.actionRow} pointerEvents="box-none">
          <Pressable
            style={styles.clearBtn}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearBtnText}>↺ CLEAR</Text>
          </Pressable>
          <Pressable
            style={styles.swarmBtn}
            onPress={launchSwarm}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.swarmBtnText}>🛡️ RELEASE SWARM</Text>
          </Pressable>
        </View>
      )}

      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={score}
        level={level}
        onRetry={modalType === 'win' ? handleNextLevel : handleRetry}
        onBackToHub={onBackToHub}
        buttonText={modalType === 'win' ? 'NEXT LEVEL' : 'TRY AGAIN'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040212',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 6, 26, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 209, 102, 0.25)',
  },
  badgeBox: {
    alignItems: 'center',
  },
  badgeLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeVal: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  inkTrack: {
    width: 85,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginTop: 4,
  },
  inkFill: {
    height: '100%',
    borderRadius: 4,
  },
  arena: {
    flex: 1,
    position: 'relative',
  },
  actionRow: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  clearBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  clearBtnText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  swarmBtn: {
    backgroundColor: '#FF6D00',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FFD166',
    shadowColor: '#FF6D00',
    shadowRadius: 10,
    shadowOpacity: 0.7,
    elevation: 6,
  },
  swarmBtnText: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  dogMouthText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#050212',
  },
});
