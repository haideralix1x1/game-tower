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
import Svg, { Rect, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
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

const PLAYER_SIZE = 26;
const GRAVITY = 0.45;
const NORMAL_JUMP = -11.5;
const HIGH_JUMP = -14.5;
const PLAT_HEIGHT = 14;

export default function IcyTowerClimberGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  const [score, setScore] = useState(0);
  const [floorsClimbed, setFloorsClimbed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Player physics
  const [player, setPlayer] = useState({
    x: arenaWidth * 0.5 - PLAYER_SIZE / 2,
    y: arenaHeight - 80,
    vx: 0,
    vy: 0,
    isOnIce: false,
  });

  const [cameraY, setCameraY] = useState(0);
  const [laserFloorY, setLaserFloorY] = useState(arenaHeight + 50);

  // Platforms
  const [platforms, setPlatforms] = useState([]);

  // Result modal
  const [modalVisible, setModalVisible] = useState(false);

  const playerRef = useRef(player);
  playerRef.current = player;
  const cameraYRef = useRef(cameraY);
  cameraYRef.current = cameraY;
  const platformsRef = useRef(platforms);
  platformsRef.current = platforms;

  const animFrameRef = useRef(null);

  // Generate initial tower platforms
  const initTower = useCallback(() => {
    setScore(0);
    setFloorsClimbed(0);
    setIsPlaying(false);
    setModalVisible(false);
    setCameraY(0);
    setLaserFloorY(arenaHeight + 80);

    const startPlayer = {
      x: arenaWidth * 0.5 - PLAYER_SIZE / 2,
      y: arenaHeight - 80,
      vx: 0,
      vy: 0,
      isOnIce: false,
    };
    setPlayer(startPlayer);
    playerRef.current = startPlayer;

    // Build 60 vertical platforms
    const plats = [];
    // Base floor
    plats.push({
      id: 'plat_0',
      x: 0,
      y: arenaHeight - 40,
      w: arenaWidth,
      type: 'NORMAL',
    });

    for (let i = 1; i < 70; i++) {
      const platY = arenaHeight - 40 - i * 68;
      const platW = Math.max(70, 130 - Math.floor(i / 10) * 10);
      const platX = Math.random() * (arenaWidth - platW - 20) + 10;

      // Platform types: NORMAL, ICE, CRUMBLE, BOUNCE
      let type = 'NORMAL';
      const rand = Math.random();
      if (rand < 0.28) {
        type = 'ICE';
      } else if (rand < 0.44) {
        type = 'CRUMBLE';
      } else if (rand < 0.54) {
        type = 'BOUNCE';
      }

      plats.push({
        id: `plat_${i}`,
        x: platX,
        y: platY,
        w: platW,
        type,
        floor: i,
        crumbling: false,
        broken: false,
      });
    }

    setPlatforms(plats);
  }, [arenaWidth, arenaHeight]);

  useEffect(() => {
    initTower();
  }, [initTower]);

  // Swipe / Touch Controls
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gesture) => {
        if (!isPlaying) {
          setIsPlaying(true);
        }

        const p = playerRef.current;
        // Jump impulse
        const isUpSwipe = gesture.dy < -30;
        const jumpPower = isUpSwipe ? HIGH_JUMP : NORMAL_JUMP;

        let impulseVx = 0;
        if (gesture.dx > 25) {
          impulseVx = p.isOnIce ? 8.5 : 6.0; // Extra slippery slide on ice
        } else if (gesture.dx < -25) {
          impulseVx = p.isOnIce ? -8.5 : -6.0;
        } else {
          // Tap on left or right half
          const tapX = evt.nativeEvent.locationX;
          impulseVx = tapX > arenaWidth * 0.5 ? 5.5 : -5.5;
        }

        playerRef.current = {
          ...p,
          vx: impulseVx,
          vy: jumpPower,
        };
        setPlayer(playerRef.current);
        playTapSound();
        triggerLightHaptic();
      },
    })
  ).current;

  // 60 FPS Physics Simulation Loop
  useEffect(() => {
    if (!isPlaying) return;

    let active = true;

    const tick = () => {
      if (!active) return;

      const p = playerRef.current;
      const camY = cameraYRef.current;

      // Move laser floor up slowly
      setLaserFloorY((ly) => ly - 0.7);

      let vx = p.vx * (p.isOnIce ? 0.985 : 0.91); // Ice low friction
      let vy = p.vy + GRAVITY;

      let nextX = p.x + vx;
      let nextY = p.y + vy;

      // Screen boundary wrap / bounce
      if (nextX < 0) {
        nextX = 0;
        vx = -vx * 0.6;
      } else if (nextX > arenaWidth - PLAYER_SIZE) {
        nextX = arenaWidth - PLAYER_SIZE;
        vx = -vx * 0.6;
      }

      // Check landing on platforms (only while falling downward: vy > 0)
      let landedOnIce = false;
      let highestFloor = floorsClimbed;

      if (vy > 0) {
        const curPlats = platformsRef.current;
        for (const plat of curPlats) {
          if (plat.broken) continue;

          // Check if feet cross top of platform
          if (
            p.y + PLAYER_SIZE <= plat.y &&
            nextY + PLAYER_SIZE >= plat.y &&
            nextX + PLAYER_SIZE > plat.x &&
            nextX < plat.x + plat.w
          ) {
            // Landed!
            nextY = plat.y - PLAYER_SIZE;

            if (plat.type === 'BOUNCE') {
              vy = -16.0; // Super bounce pad!
              playSliceSound();
              triggerMediumHaptic();
            } else {
              vy = 0;
              playTapSound();
            }

            if (plat.type === 'ICE') {
              landedOnIce = true;
            } else if (plat.type === 'CRUMBLE') {
              // Trigger crumbling break
              plat.broken = true;
            }

            if (plat.floor && plat.floor > highestFloor) {
              highestFloor = plat.floor;
              setFloorsClimbed(highestFloor);
              setScore((s) => {
                const ns = s + 50;
                onScoreUpdate?.(ns);
                return ns;
              });
            }
            break;
          }
        }
      }

      // Camera upward tracking
      const targetCam = Math.max(0, arenaHeight * 0.6 - nextY);
      if (targetCam > camY) {
        cameraYRef.current = targetCam;
        setCameraY(targetCam);
      }

      // Check fall below screen or touched laser floor
      if (nextY + camY > arenaHeight + 40) {
        handleGameOver();
        return;
      }

      playerRef.current = {
        x: nextX,
        y: nextY,
        vx,
        vy,
        isOnIce: landedOnIce,
      };
      setPlayer(playerRef.current);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, arenaWidth, arenaHeight, floorsClimbed, onScoreUpdate]);

  const handleGameOver = () => {
    setIsPlaying(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    playGameOverSound();
    triggerGameOverHaptic();
    setModalVisible(true);
  };

  const handleRetry = () => {
    initTower();
  };

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={30}
        gameTitle="CYBER ICY CLIMBER"
        category="ENDLESS VERTICAL"
        accentColor="#00F5FF"
        score={score}
        onBackToHub={onBackToHub}
      />

      {/* Top HUD */}
      <View style={styles.topHud}>
        <Text style={styles.hudStat}>ALTITUDE: {floorsClimbed}F</Text>
        <Text style={styles.hudSub}>
          {player.isOnIce ? '🧊 SLICK ICE FLOOR!' : 'SWIPE TO LEAP UPWARD'}
        </Text>
        <Text style={[styles.hudStat, { color: COLORS.solarGold }]}>
          PTS: {score}
        </Text>
      </View>

      {/* Main Touch Arena with Svg Platforms */}
      <View style={styles.arena} {...panResponder.panHandlers}>
        <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="iceGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
            </LinearGradient>
            <LinearGradient id="bounceGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#39FF14" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFD166" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Platforms translated by cameraY */}
          {platforms.map((plat) => {
            if (plat.broken) return null;
            const drawY = plat.y + cameraY;
            if (drawY < -30 || drawY > arenaHeight + 30) return null;

            let fillColor = '#7928CA';
            let strokeColor = '#00F5FF';

            if (plat.type === 'ICE') {
              fillColor = 'url(#iceGrad)';
              strokeColor = '#FFFFFF';
            } else if (plat.type === 'CRUMBLE') {
              fillColor = '#FF0055';
              strokeColor = '#FF6D00';
            } else if (plat.type === 'BOUNCE') {
              fillColor = 'url(#bounceGrad)';
              strokeColor = '#39FF14';
            }

            return (
              <Rect
                key={plat.id}
                x={plat.x}
                y={drawY}
                width={plat.w}
                height={PLAT_HEIGHT}
                rx={6}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={1.5}
              />
            );
          })}

          {/* Player Cube */}
          <Rect
            x={player.x}
            y={player.y + cameraY}
            width={PLAYER_SIZE}
            height={PLAYER_SIZE}
            rx={5}
            fill="#FFE600"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        </Svg>

        {!isPlaying && (
          <View style={styles.promptOverlay} pointerEvents="none">
            <Text style={styles.promptText}>SWIPE TO CLIMB</Text>
            <Text style={styles.promptSub}>WATCH OUT FOR ICY & CRUMBLING LEDGES</Text>
          </View>
        )}
      </View>

      <GameResultModal
        visible={modalVisible}
        type="gameover"
        score={score}
        level={floorsClimbed}
        onRetry={handleRetry}
        onBackToHub={onBackToHub}
        buttonText="CLIMB AGAIN"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040214',
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 8, 30, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.25)',
  },
  hudStat: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
    color: '#00F5FF',
  },
  hudSub: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  arena: {
    flex: 1,
    position: 'relative',
  },
  promptOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  promptText: {
    fontFamily: monoFont,
    fontSize: 22,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 2,
    textShadowColor: '#00F5FF',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  promptSub: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 6,
    letterSpacing: 1,
  },
});
