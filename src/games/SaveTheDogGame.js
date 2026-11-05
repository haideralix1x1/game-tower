import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const DOG_RADIUS = 26;
const BEE_RADIUS = 9;
const SURVIVE_TIME = 6;
const PLATFORM_WIDTH = 100;
const PLATFORM_HEIGHT = 16;

// Helper: distance from point (px, py) to line segment (x1, y1)-(x2, y2)
function distPointToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// 2D line segment intersection check for direct line-of-sight
function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 0.000001) return false;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

export default function SaveTheDogGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const { width, height } = useWindowDimensions();

  // Dynamic layout measurement to guarantee true full-screen arena
  const [arenaLayout, setArenaLayout] = useState({
    width: width,
    height: Math.max(400, height - 70),
  });

  const arenaWidth = arenaLayout.width;
  const arenaHeight = arenaLayout.height;

  // Short platform elevated in the mid-screen
  const platformY = Math.round(arenaHeight * 0.50);
  // Toxic Acid Water pool down below
  const acidY = arenaHeight - 48;

  const [platform, setPlatform] = useState({
    x: (arenaWidth - PLATFORM_WIDTH) / 2,
    y: platformY,
    width: PLATFORM_WIDTH,
    height: PLATFORM_HEIGHT,
  });
  const platformRef = useRef(platform);
  platformRef.current = platform;

  const [level, setLevel] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        const savedScore = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (savedLvl !== null) {
          const pLvl = parseInt(savedLvl, 10);
          if (!isNaN(pLvl) && pLvl >= 1) setLevel(pLvl);
        }
        if (savedScore !== null) {
          const pScore = parseInt(savedScore, 10);
          if (!isNaN(pScore)) setScore(pScore);
        }
      } catch {}
    })();
  }, []);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('DRAWING'); // 'DRAWING' | 'SWARMING' | 'OVER'
  const [timeLeft, setTimeLeft] = useState(SURVIVE_TIME);
  const [inkLeft, setInkLeft] = useState(100);

  // Drawn lines
  const [currentLine, setCurrentLine] = useState([]);
  const [savedLines, setSavedLines] = useState([]);

  // Dog position & velocity
  const [dog, setDog] = useState({
    x: arenaWidth * 0.5,
    y: platformY - DOG_RADIUS,
    vy: 0,
  });

  // Hives & Bees
  const [hives, setHives] = useState([]);
  const [bees, setBees] = useState([]);

  // Result modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');
  const [modalMessage, setModalMessage] = useState('');

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
        x: Math.max(20, Math.min(arenaWidth - PLATFORM_WIDTH - 20, platX)),
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
        const hy = 50 + (i % 2) * 24;
        newHives.push({ id: `hive_${i}`, x: hx, y: hy });
      }
      setHives(newHives);

      // Bees
      const beeCount = 8 + Math.min(12, lvl * 2);
      const initialBees = [];
      for (let i = 0; i < beeCount; i++) {
        const h = newHives[i % newHives.length];
        initialBees.push({
          id: `bee_${i}`,
          x: h.x + (Math.random() - 0.5) * 16,
          y: h.y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 2,
          vy: 1 + Math.random() * 2,
          flankBias: i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0, // 1 = right flanker, -1 = left flanker, 0 = direct
          buzzOffset: Math.random() * Math.PI * 2,
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

  // Launch Swarm IMMEDIATELY with fast line gravity activation
  const activateSwarmImmediately = useCallback((finalLine) => {
    let allLines = savedLinesRef.current;
    if (finalLine && finalLine.length > 2) {
      allLines = [...allLines, finalLine];
      setSavedLines(allLines);
      savedLinesRef.current = allLines;
    }
    setCurrentLine([]);

    if (allLines.length === 0) return;

    // Transition to SWARMING state
    setGameState('SWARMING');
    gameStateRef.current = 'SWARMING';
    setTimeLeft(SURVIVE_TIME);
    timeLeftRef.current = SURVIVE_TIME;

    // Fast initial downward velocity for the line
    linesVelocityRef.current = { vx: 0, vy: 1.2 };

    playSliceSound();
    triggerMediumHaptic();

    // 6-second survival countdown timer
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleWin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // PanResponder to draw lines (Lifting finger IMMEDIATELY launches swarm and drops lines!)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPausedRef.current && gameStateRef.current === 'DRAWING',
      onMoveShouldSetPanResponder: () => !isPausedRef.current && gameStateRef.current === 'DRAWING',
      onPanResponderGrant: (evt) => {
        if (gameStateRef.current !== 'DRAWING') return;
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentLine([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        if (gameStateRef.current !== 'DRAWING') return;
        const { locationX, locationY } = evt.nativeEvent;

        setCurrentLine((prev) => {
          if (prev.length === 0) return [{ x: locationX, y: locationY }];
          const last = prev[prev.length - 1];

          const deltaY = Math.abs(locationY - last.y);
          const deltaX = Math.abs(locationX - last.x);
          if (deltaY > 80 || deltaX > 80) return prev;

          const dist = Math.hypot(deltaX, deltaY);
          if (dist > 5) {
            setInkLeft((ink) => Math.max(0, ink - dist * 0.08));
            return [...prev, { x: locationX, y: locationY }];
          }
          return prev;
        });
      },
      onPanResponderRelease: (evt) => {
        if (gameStateRef.current !== 'DRAWING') return;
        // As soon as user releases finger: immediately activate swarm and gravity!
        setCurrentLine((line) => {
          if (line.length > 2) {
            activateSwarmImmediately(line);
          }
          return [];
        });
      },
    })
  ).current;

  // 60 FPS Swarm, Dog & Fast Line Gravity Physics Loop
  useEffect(() => {
    if (gameState !== 'SWARMING') return;

    let active = true;

    const tick = () => {
      if (!active || gameStateRef.current !== 'SWARMING') return;
      if (isPausedRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const currentDog = { ...dogRef.current };
      let lines = savedLinesRef.current;
      const lVel = linesVelocityRef.current;

      // 1. Calculate Intelligent Bees Pathfinding & Flanking Movement
      let pushForceX = 0;
      let pushForceY = 0;
      let stung = false;

      // Collect all open endpoints / tips of all drawn lines to navigate around obstacles
      const lineTips = [];
      for (const line of lines) {
        if (line.length >= 2) {
          const startPt = line[0];
          const endPt = line[line.length - 1];

          // Waypoint extended outward from start tip
          const sDx = line[0].x - line[1].x;
          const sDy = line[0].y - line[1].y;
          const sLen = Math.hypot(sDx, sDy) || 1;
          lineTips.push({
            x: startPt.x + (sDx / sLen) * 20,
            y: startPt.y + (sDy / sLen) * 20,
            rawX: startPt.x,
            rawY: startPt.y,
          });

          // Waypoint extended outward from end tip
          const eDx = line[line.length - 1].x - line[line.length - 2].x;
          const eDy = line[line.length - 1].y - line[line.length - 2].y;
          const eLen = Math.hypot(eDx, eDy) || 1;
          lineTips.push({
            x: endPt.x + (eDx / eLen) * 20,
            y: endPt.y + (eDy / eLen) * 20,
            rawX: endPt.x,
            rawY: endPt.y,
          });
        }
      }

      const currentBees = beesRef.current;
      const updatedBees = currentBees.map((b, beeIdx) => {
        const dxToDog = currentDog.x - b.x;
        const dyToDog = currentDog.y - b.y;
        const distToDog = Math.hypot(dxToDog, dyToDog);

        // Check if direct line-of-sight to the dog is blocked by any drawn line
        let isDirectBlocked = false;
        for (const line of lines) {
          for (let i = 0; i < line.length - 1; i++) {
            if (
              linesIntersect(
                b.x,
                b.y,
                currentDog.x,
                currentDog.y,
                line[i].x,
                line[i].y,
                line[i + 1].x,
                line[i + 1].y
              )
            ) {
              isDirectBlocked = true;
              break;
            }
          }
          if (isDirectBlocked) break;
        }

        // Sting check: A bee CANNOT sting through a barrier into the safe area!
        if (distToDog < DOG_RADIUS + BEE_RADIUS - 2) {
          if (!isDirectBlocked) {
            stung = true;
          }
        }

        // Intelligent Pathfinding: If blocked, navigate around obstacle tips to find a way to the dog!
        let targetX = currentDog.x;
        let targetY = currentDog.y;

        if (isDirectBlocked && lineTips.length > 0) {
          let bestTip = lineTips[0];
          let bestMetric = Infinity;

          for (const tip of lineTips) {
            const distToTip = Math.hypot(tip.x - b.x, tip.y - b.y);
            const distTipToDog = Math.hypot(currentDog.x - tip.x, currentDog.y - tip.y);

            // Flank personality: left flankers favor open ends on the left, right flankers favor open ends on the right
            let biasBonus = 0;
            if (b.flankBias === -1 && tip.x < currentDog.x) biasBonus = -40;
            if (b.flankBias === 1 && tip.x > currentDog.x) biasBonus = -40;

            const metric = distToTip + distTipToDog * 0.8 + biasBonus;
            if (metric < bestMetric) {
              bestMetric = metric;
              bestTip = tip;
            }
          }

          targetX = bestTip.x;
          targetY = bestTip.y;
        }

        const toTargetX = targetX - b.x;
        const toTargetY = targetY - b.y;
        const distToTarget = Math.hypot(toTargetX, toTargetY) || 1;

        const baseSpeed = 3.9 + level * 0.16;
        const dirX = toTargetX / distToTarget;
        const dirY = toTargetY / distToTarget;

        // Organic swarm buzzing jitter
        const buzz = Math.sin(Date.now() * 0.012 + (b.buzzOffset || 0)) * 1.6;
        let vx = dirX * baseSpeed + buzz * (-dirY);
        let vy = dirY * baseSpeed + buzz * dirX;

        // Swarm separation: bees repel each other slightly so they spread out and probe all sides
        for (let j = 0; j < currentBees.length; j++) {
          if (j === beeIdx) continue;
          const other = currentBees[j];
          const sepDx = b.x - other.x;
          const sepDy = b.y - other.y;
          const sepDist = Math.hypot(sepDx, sepDy);
          if (sepDist > 0 && sepDist < 16) {
            vx += (sepDx / sepDist) * 1.2;
            vy += (sepDy / sepDist) * 1.2;
          }
        }

        let nextBeeX = b.x + vx;
        let nextBeeY = b.y + vy;

        // Continuous collision detection and firm safe-area boundary containment
        for (const line of lines) {
          for (let i = 0; i < line.length - 1; i++) {
            const p1 = line[i];
            const p2 = line[i + 1];
            const crossed = linesIntersect(b.x, b.y, nextBeeX, nextBeeY, p1.x, p1.y, p2.x, p2.y);
            const d = distPointToSegment(nextBeeX, nextBeeY, p1.x, p1.y, p2.x, p2.y);

            if (crossed || d < BEE_RADIUS + 5) {
              // Apply physical push force to the line from the outside
              pushForceX += (dxToDog / (distToDog || 1)) * 0.95;
              pushForceY += (dyToDog / (distToDog || 1)) * 0.95;

              // Calculate closest point on the line to bee's prior position
              const segDx = p2.x - p1.x;
              const segDy = p2.y - p1.y;
              const segLenSq = segDx * segDx + segDy * segDy || 1;
              const t = Math.max(0, Math.min(1, ((b.x - p1.x) * segDx + (b.y - p1.y) * segDy) / segLenSq));
              const closeX = p1.x + t * segDx;
              const closeY = p1.y + t * segDy;

              // Normal vector pointing strictly AWAY from the line towards the bee's origin
              const fromWallX = b.x - closeX;
              const fromWallY = b.y - closeY;
              const fromDist = Math.hypot(fromWallX, fromWallY) || 1;
              const awayNormX = fromWallX / fromDist;
              const awayNormY = fromWallY / fromDist;

              // Firmly clamp bee outside the barrier so it NEVER penetrates the safe area
              nextBeeX = closeX + awayNormX * (BEE_RADIUS + 5);
              nextBeeY = closeY + awayNormY * (BEE_RADIUS + 5);

              // Slide along line tangent towards the open ends
              const len = Math.hypot(segDx, segDy) || 1;
              const dotTangent = (vx * segDx + vy * segDy) / len;
              const slideDir = dotTangent >= 0 ? 1 : -1;
              nextBeeX += (segDx / len) * baseSpeed * 0.85 * slideDir;
              nextBeeY += (segDy / len) * baseSpeed * 0.85 * slideDir;

              // Double check: if still in safe area / crossed line, revert to b.x, b.y
              if (linesIntersect(b.x, b.y, nextBeeX, nextBeeY, p1.x, p1.y, p2.x, p2.y)) {
                nextBeeX = b.x;
                nextBeeY = b.y;
              }
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
        handleLose('STUNG BY THE SWARM!');
        return;
      }

      // 2. FAST DRAWN LINE GRAVITY & SOLID PHYSICS
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
        const mass = Math.max(1, totalPts / 10);
        lVel.vx += pushForceX / mass;
        lVel.vy += pushForceY / mass;

        // FAST GRAVITY: Line drops quickly and snappy!
        lVel.vy += 0.95;

        // Air drag
        lVel.vx *= 0.91;
        lVel.vy *= 0.94;

        // Platform & Acid surface collision check
        const plat = platformRef.current;
        let restsOnPlatform = false;
        for (const line of lines) {
          for (const pt of line) {
            if (
              pt.x >= plat.x - 4 &&
              pt.x <= plat.x + plat.width + 4 &&
              Math.abs(pt.y - (plat.y - 2)) < 8
            ) {
              restsOnPlatform = true;
              break;
            }
          }
          if (restsOnPlatform) break;
        }

        const onGround = lowestY >= acidY - 4 || restsOnPlatform;
        if (onGround) {
          lVel.vx *= 0.72; // Surface friction
          if (lVel.vy > 0) lVel.vy = 0; // Settles firmly
        }

        // Left / Right screen boundary
        if (minX + lVel.vx < 4 && lVel.vx < 0) lVel.vx = 0;
        if (maxX + lVel.vx > arenaWidth - 4 && lVel.vx > 0) lVel.vx = 0;

        // Dog collision with line: line cannot crush into dog; gently rests around it
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

      // 3. Fast Dog Gravity, Platform Landing & Acid Water Hazard
      currentDog.vy += 0.75;
      let nextDogY = currentDog.y + currentDog.vy;

      const plat = platformRef.current;
      const isOverPlatform =
        currentDog.x >= plat.x - 8 &&
        currentDog.x <= plat.x + plat.width + 8;

      // Platform Landing
      if (
        isOverPlatform &&
        currentDog.y <= plat.y - DOG_RADIUS + 6 &&
        nextDogY >= plat.y - DOG_RADIUS
      ) {
        nextDogY = plat.y - DOG_RADIUS;
        currentDog.vy = 0;
      }

      // Drawn line can catch the dog
      for (const line of lines) {
        for (let i = 0; i < line.length - 1; i++) {
          const p1 = line[i];
          const p2 = line[i + 1];
          const d = distPointToSegment(currentDog.x, nextDogY, p1.x, p1.y, p2.x, p2.y);
          if (d < DOG_RADIUS + 4) {
            nextDogY = currentDog.y;
            currentDog.vy = 0;
            break;
          }
        }
      }

      // Acid Water Hazard
      if (nextDogY >= acidY - DOG_RADIUS) {
        nextDogY = acidY - DOG_RADIUS;
        currentDog.y = nextDogY;
        dogRef.current = currentDog;
        setDog(currentDog);
        if (gameStateRef.current === 'SWARMING') {
          handleLose('DOG FELL INTO TOXIC ACID!');
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

    JuiceEngine.celebrate(dogRef.current.x, dogRef.current.y);
    const winPoints = 300 + Math.floor(inkLeft * 2);
    const nextScore = score + winPoints;
    setScore(nextScore);
    onScoreUpdate?.(nextScore);
      AsyncStorage.setItem(STORAGE_BEST_KEY, String(nextScore)).catch(() => {});

    setModalMessage('SURVIVED THE SWARM! EXCELLENT DEFENSE!');
    setModalType('win');
    setModalVisible(true);
  };

  const handleLose = (msg = 'LEVEL FAILED!') => {
    if (gameStateRef.current !== 'SWARMING') return;
    setGameState('OVER');
    gameStateRef.current = 'OVER';
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    playGameOverSound();
    triggerGameOverHaptic();
    setModalMessage(msg);
    setModalType('gameover');
    setModalVisible(true);
  };

  const handleNextLevel = () => {
    setLevel((lvl) => {
      const nl = lvl + 1;
      AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nl)).catch(() => {});
      return nl;
    });
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
        floorNum={21}
        gameTitle="SAVE CYBER DOGE"
        category="PHYSICS PUZZLE"
        accentColor="#FFD166"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
        onReset={handleRetry}
      />

      {/* Top HUD: Level, Ink & Survival Countdown */}
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
          <Text style={styles.badgeLabel}>STATUS</Text>
          <Text
            style={[
              styles.badgeVal,
              {
                color:
                  gameState === 'SWARMING'
                    ? timeLeft <= 2
                      ? '#FF0055'
                      : COLORS.matrixMint
                    : '#00F5FF',
              },
            ]}
          >
            {gameState === 'SWARMING' ? `DEFEND: ${timeLeft}s` : 'DRAW SHIELD'}
          </Text>
        </View>
      </View>

      {/* True Full-Screen Touch Arena with NO button overlays */}
      <View
        style={styles.arena}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (w > 0 && h > 0 && (w !== arenaLayout.width || h !== arenaLayout.height)) {
            setArenaLayout({ width: w, height: h });
          }
        }}
        {...panResponder.panHandlers}
      >
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
            <Line
              x1={platform.x + 18}
              y1={platform.y + platform.height}
              x2={platform.x + 30}
              y2={platform.y + platform.height + 40}
              stroke="#FF007F"
              strokeWidth={3}
            />
            <Line
              x1={platform.x + platform.width - 18}
              y1={platform.y + platform.height}
              x2={platform.x + platform.width - 30}
              y2={platform.y + platform.height + 40}
              stroke="#FF007F"
              strokeWidth={3}
            />
            <Line
              x1={platform.x + 28}
              y1={platform.y + platform.height + 40}
              x2={platform.x + platform.width - 28}
              y2={platform.y + platform.height + 40}
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
            <Line
              x1={platform.x}
              y1={platform.y}
              x2={platform.x + platform.width}
              y2={platform.y}
              stroke="#00F5FF"
              strokeWidth={3.5}
            />
          </G>

          {/* Toxic Acid Water Hazard Down Below */}
          <G>
            <Rect
              x={0}
              y={acidY}
              width={arenaWidth}
              height={arenaHeight - acidY}
              fill="url(#acidGrad)"
            />
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
            <Circle cx={arenaWidth * 0.16} cy={acidY + 12} r={6} fill="#70FF00" opacity={0.7} />
            <Circle cx={arenaWidth * 0.36} cy={acidY + 18} r={9} fill="#39FF14" opacity={0.8} />
            <Circle cx={arenaWidth * 0.64} cy={acidY + 14} r={7} fill="#70FF00" opacity={0.75} />
            <Circle cx={arenaWidth * 0.86} cy={acidY + 20} r={10} fill="#39FF14" opacity={0.85} />
            <SvgText
              x={arenaWidth * 0.5}
              y={acidY + 28}
              textAnchor="middle"
              fill="#062F12"
              fontSize={11}
              fontFamily={monoFont}
              fontWeight="900"
            >
              ☣ TOXIC ACID WATER - DO NOT FALL ☣
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

          {/* Saved Drawn Lines (Physics Barriers with Fast Gravity) */}
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
              <Line
                x1={bee.x - 5}
                y1={bee.y}
                x2={bee.x + 5}
                y2={bee.y}
                stroke="#000000"
                strokeWidth={2}
              />
              <Circle
                cx={bee.x}
                cy={bee.y - 7}
                r={4}
                fill="rgba(255, 255, 255, 0.7)"
              />
            </G>
          ))}
        </Svg>

        {/* Helpful drawing guide when starting */}
        {gameState === 'DRAWING' && currentLine.length === 0 && (
          <View style={styles.hintContainer} pointerEvents="none">
            <Text style={styles.hintText}>DRAW A SHIELD AROUND DOGE</Text>
            <Text style={styles.hintSub}>RELEASE FINGER TO UNLEASH SWARM & GRAVITY</Text>
          </View>
        )}
      </View>

      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={score}
        level={level}
        onRetry={modalType === 'win' ? handleNextLevel : handleRetry}
        onBackToHub={onBackToHub}
        buttonText={modalType === 'win' ? 'NEXT LEVEL' : 'TRY AGAIN'}
        message={modalMessage}
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
  hintContainer: {
    position: 'absolute',
    top: 75,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  hintText: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 1.5,
    backgroundColor: 'rgba(4, 2, 18, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
  },
  hintSub: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
