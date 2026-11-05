import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Rect, Line, G, Defs, LinearGradient, Stop } from 'react-native-svg';
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

const TARGET_RADIUS = 62;
const BLADE_LENGTH = 38;
const MIN_BLADE_ANGLE_DIFF = 14; // Degrees between blades to avoid collision

export default function KnifeHitGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  const targetCenter = { x: arenaWidth * 0.5, y: arenaHeight * 0.35 };
  const launcherY = arenaHeight - 90;

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);

  // Core rotation angle
  const [rotation, setRotation] = useState(0);
  const [rotSpeed, setRotSpeed] = useState(2.2);

  // Blades
  const [totalBlades, setTotalBlades] = useState(7);
  const [bladesRemaining, setBladesRemaining] = useState(7);
  const [embeddedBlades, setEmbeddedBlades] = useState([]); // array of angles in degrees
  const [flyingBlade, setFlyingBlade] = useState(null); // { y }

  // Result modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');

  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;
  const rotSpeedRef = useRef(rotSpeed);
  rotSpeedRef.current = rotSpeed;
  const embeddedRef = useRef(embeddedBlades);
  embeddedRef.current = embeddedBlades;
  const flyingRef = useRef(flyingBlade);
  flyingRef.current = flyingBlade;

  const animFrameRef = useRef(null);

  // Setup level
  const initLevel = useCallback(
    (lvl) => {
      const bladeCount = 6 + Math.min(6, lvl);
      setTotalBlades(bladeCount);
      setBladesRemaining(bladeCount);
      setFlyingBlade(null);
      setModalVisible(false);

      // Pre-embed 1-3 obstacle blades at higher levels
      const preEmbedded = [];
      const preCount = Math.min(3, Math.floor((lvl - 1) / 2));
      for (let i = 0; i < preCount; i++) {
        preEmbedded.push((i * 360) / preCount);
      }
      setEmbeddedBlades(preEmbedded);

      // Dynamic rotation speed
      const baseSpeed = (lvl % 2 === 0 ? -1 : 1) * (2.2 + lvl * 0.25);
      setRotSpeed(baseSpeed);
    },
    []
  );

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // Main 60 FPS Rotation and Flying Blade loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      // Update core rotation
      const nextRot = (rotationRef.current + rotSpeedRef.current) % 360;
      rotationRef.current = nextRot;
      setRotation(nextRot);

      // Check flying blade movement
      const fb = flyingRef.current;
      if (fb) {
        const nextY = fb.y - 24; // High velocity throw
        if (nextY <= targetCenter.y + TARGET_RADIUS) {
          // Blade reached target!
          // Calculate impact angle on the rotating core
          // Blade hits straight from bottom (90 deg in screen coords)
          const impactAngleOnCore = ((90 - nextRot) % 360 + 360) % 360;

          // Check collision with any already embedded blade
          const curEmbedded = embeddedRef.current;
          let hitOther = false;
          for (const angle of curEmbedded) {
            let diff = Math.abs(angle - impactAngleOnCore);
            if (diff > 180) diff = 360 - diff;
            if (diff < MIN_BLADE_ANGLE_DIFF) {
              hitOther = true;
              break;
            }
          }

          if (hitOther) {
            // Deflected!
            flyingRef.current = null;
            setFlyingBlade(null);
            handleGameOver();
            return;
          } else {
            // Successfully embedded!
            playTapSound();
            triggerLightHaptic();
            const newEmbedded = [...curEmbedded, impactAngleOnCore];
            setEmbeddedBlades(newEmbedded);
            embeddedRef.current = newEmbedded;

            flyingRef.current = null;
            setFlyingBlade(null);

            setScore((s) => {
              const ns = s + 25;
              onScoreUpdate?.(ns);
              return ns;
            });

            // Check if all blades used
            if (bladesRemaining <= 1) {
              handleWin();
              return;
            }
          }
        } else {
          flyingRef.current = { y: nextY };
          setFlyingBlade({ y: nextY });
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [arenaHeight, bladesRemaining, targetCenter.y, onScoreUpdate]);

  // Tap to fling blade
  const handleThrow = () => {
    if (flyingBlade !== null || bladesRemaining <= 0 || modalVisible) return;
    playSliceSound();
    triggerMediumHaptic();

    setBladesRemaining((b) => b - 1);
    const newFlying = { y: launcherY };
    flyingRef.current = newFlying;
    setFlyingBlade(newFlying);
  };

  const handleWin = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    JuiceEngine.celebrate(width / 2, height / 2);
    setScore((s) => {
      const ns = s + 150;
      onScoreUpdate?.(ns);
      return ns;
    });
    setModalType('win');
    setModalVisible(true);
  };

  const handleGameOver = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={31}
        gameTitle="CYBER BLADE TARGET"
        category="RHYTHM PRECISION"
        accentColor="#00F5FF"
        score={score}
        onBackToHub={onBackToHub}
      />

      {/* Top Status */}
      <View style={styles.topHud}>
        <Text style={styles.hudText}>STAGE {level}</Text>
        <Text style={styles.hudSub}>TAP TO FLING BLADES // DONT HIT OTHER BLADES</Text>
        <View style={styles.bladeStock}>
          {Array.from({ length: totalBlades }).map((_, idx) => (
            <View
              key={`stock_${idx}`}
              style={[
                styles.stockDot,
                idx < bladesRemaining ? { backgroundColor: '#00F5FF' } : { backgroundColor: 'rgba(255,255,255,0.15)' },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Main Touch Arena */}
      <Pressable style={styles.arena} onPress={handleThrow}>
        <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#7928CA" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#00F5FF" stopOpacity="0.8" />
            </LinearGradient>
            <LinearGradient id="bladeGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#00F5FF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Rotating Central Cyber Core */}
          <G transform={`rotate(${rotation}, ${targetCenter.x}, ${targetCenter.y})`}>
            {/* Core Disk */}
            <Circle
              cx={targetCenter.x}
              cy={targetCenter.y}
              r={TARGET_RADIUS}
              fill="url(#coreGrad)"
              stroke="#00F5FF"
              strokeWidth={3}
            />
            {/* Core Center Tech Eye */}
            <Circle cx={targetCenter.x} cy={targetCenter.y} r={16} fill="#050218" stroke="#FF007F" strokeWidth={2} />

            {/* Embedded Blades Rotating with Core */}
            {embeddedBlades.map((angle, idx) => (
              <G
                key={`emb_${idx}`}
                transform={`rotate(${angle}, ${targetCenter.x}, ${targetCenter.y})`}
              >
                {/* Blade extending outwards from core edge */}
                <Rect
                  x={targetCenter.x - 3}
                  y={targetCenter.y + TARGET_RADIUS}
                  width={6}
                  height={BLADE_LENGTH}
                  rx={2}
                  fill="url(#bladeGrad)"
                  stroke="#00F5FF"
                  strokeWidth={1}
                />
              </G>
            ))}
          </G>

          {/* Flying In-Transit Blade */}
          {flyingBlade && (
            <Rect
              x={targetCenter.x - 3}
              y={flyingBlade.y}
              width={6}
              height={BLADE_LENGTH}
              rx={2}
              fill="url(#bladeGrad)"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          )}

          {/* Ready-to-launch Blade at bottom */}
          {!flyingBlade && bladesRemaining > 0 && (
            <Rect
              x={targetCenter.x - 3}
              y={launcherY}
              width={6}
              height={BLADE_LENGTH}
              rx={2}
              fill="url(#bladeGrad)"
              stroke="#00F5FF"
              strokeWidth={1.2}
            />
          )}
        </Svg>
      </Pressable>

      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={score}
        level={level}
        onRetry={modalType === 'win' ? handleNextLevel : handleRetry}
        onBackToHub={onBackToHub}
        buttonText={modalType === 'win' ? 'NEXT STAGE' : 'TRY AGAIN'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030114',
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 6, 28, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.25)',
  },
  hudText: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
    color: '#00F5FF',
  },
  hudSub: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.55)',
  },
  bladeStock: {
    flexDirection: 'row',
    gap: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  arena: {
    flex: 1,
    position: 'relative',
  },
});
