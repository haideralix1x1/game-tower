import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
  Rect,
  Polygon,
  Line,
  G,
} from 'react-native-svg';
import { styles, THEMES, GAME_CONFIG } from '../../styles';

const VERTICAL_COLUMNS = [0.15, 0.32, 0.5, 0.68, 0.85];
const ELEVATION_MARKERS = Array.from({ length: 40 }, (_, idx) => (idx + 1) * 5);

// Deterministic starfield coordinates
const STARS = Array.from({ length: 34 }, (_, i) => ({
  id: `star_${i}`,
  xRatio: ((i * 37 + 13) % 97) / 100,
  yRatio: ((i * 53 + 7) % 72) / 100,
  size: i % 5 === 0 ? 3 : i % 2 === 0 ? 2 : 1.4,
  opacity: i % 4 === 0 ? 0.85 : 0.42,
}));

// Cyberpunk city skyline buildings (relative width/height ratios)
const SKYLINE_BUILDINGS = [
  { x: 0.0, w: 0.09, h: 95, spire: false },
  { x: 0.08, w: 0.1, h: 145, spire: true },
  { x: 0.17, w: 0.08, h: 85, spire: false },
  { x: 0.24, w: 0.11, h: 175, spire: true },
  { x: 0.34, w: 0.09, h: 110, spire: false },
  { x: 0.57, w: 0.1, h: 120, spire: false },
  { x: 0.66, w: 0.11, h: 185, spire: true },
  { x: 0.76, w: 0.08, h: 95, spire: false },
  { x: 0.83, w: 0.1, h: 150, spire: true },
  { x: 0.92, w: 0.09, h: 105, spire: false },
];

export default function CyberBackground({
  screenWidth,
  screenHeight,
  cameraY,
  baseFloorY,
  themeId = 'CYBER_NEON',
  combo = 0,
}) {
  const theme = THEMES[themeId] || THEMES.CYBER_NEON;
  const isOverdrive = combo >= 2;

  const visibleMarkers = useMemo(() => {
    if (!screenHeight || !baseFloorY) return [];
    const blockStep = GAME_CONFIG.BLOCK_HEIGHT;
    return ELEVATION_MARKERS.map((blockLevel) => {
      const worldY = baseFloorY - blockLevel * blockStep;
      const screenY = worldY + cameraY;
      return {
        blockLevel,
        screenY,
      };
    }).filter((m) => m.screenY > 70 && m.screenY < screenHeight - 30);
  }, [screenHeight, baseFloorY, cameraY]);

  const sunRadius = Math.min(115, screenWidth * 0.27);
  const sunCenterX = screenWidth * 0.5;
  // Parallax shift for synthwave sun and city skyline
  const sunCenterY = Math.min(
    screenHeight + 160,
    baseFloorY - 95 + cameraY * 0.25
  );
  const horizonY = Math.min(
    screenHeight + 240,
    baseFloorY + cameraY * 0.65
  );

  return (
    <View style={styles.bgGradient} pointerEvents="none">
      {/* Multi-stop Deep Cyberpunk Sky Gradient */}
      <LinearGradient
        colors={theme.skyColors}
        locations={[0, 0.35, 0.72, 1]}
        style={styles.bgGradient}
      />

      {/* Ambient Neon Glow Orbs */}
      <View
        style={[
          styles.ambientOrbCyan,
          { backgroundColor: `${theme.accent}15` },
        ]}
      />
      <View
        style={[
          styles.ambientOrbMagenta,
          { backgroundColor: `${theme.secondaryAccent}15` },
        ]}
      />

      {/* Vector Starfield, Synthwave Sun, Skyline & Perspective Horizon */}
      <Svg
        width={screenWidth}
        height={screenHeight}
        style={styles.bgGradient}
      >
        <Defs>
          <SvgLinearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.sunColors[2]} stopOpacity="0.92" />
            <Stop offset="55%" stopColor={theme.sunColors[1]} stopOpacity="0.88" />
            <Stop offset="100%" stopColor={theme.sunColors[0]} stopOpacity="0.85" />
          </SvgLinearGradient>
          <SvgLinearGradient id="horizonGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.secondaryAccent} stopOpacity="0.38" />
            <Stop offset="100%" stopColor={theme.skyColors[0]} stopOpacity="0.96" />
          </SvgLinearGradient>
        </Defs>

        {/* Starfield with slow parallax */}
        {STARS.map((star) => {
          const sy =
            (star.yRatio * screenHeight + cameraY * 0.08) %
            (screenHeight * 0.85);
          return (
            <Circle
              key={star.id}
              cx={star.xRatio * screenWidth}
              cy={sy}
              r={star.size}
              fill={star.size > 2.2 ? theme.accent : '#FFFFFF'}
              opacity={star.opacity}
            />
          );
        })}

        {/* Retro-Futuristic Synthwave Sun with Scanlines */}
        {sunCenterY - sunRadius < screenHeight && (
          <G>
            {/* Outer Sun Corona */}
            <Circle
              cx={sunCenterX}
              cy={sunCenterY}
              r={sunRadius * 1.24}
              fill={theme.sunColors[0]}
              opacity={0.14}
            />
            <Circle
              cx={sunCenterX}
              cy={sunCenterY}
              r={sunRadius}
              fill="url(#sunGrad)"
            />
            {/* Synthwave Horizontal Cutout Stripes */}
            {[0.18, 0.34, 0.48, 0.62, 0.75, 0.86].map((offsetRatio, idx) => {
              const barY = sunCenterY + sunRadius * (offsetRatio - 0.1);
              const barH = 2.5 + idx * 1.6;
              return (
                <Rect
                  key={`cut_${offsetRatio}`}
                  x={sunCenterX - sunRadius - 4}
                  y={barY}
                  width={sunRadius * 2 + 8}
                  height={barH}
                  fill={theme.skyColors[2]}
                />
              );
            })}
          </G>
        )}

        {/* Distant Cyberpunk City Skyline Silhouette */}
        {horizonY - 200 < screenHeight && (
          <G>
            {SKYLINE_BUILDINGS.map((b, idx) => {
              const bx = b.x * screenWidth;
              const bw = b.w * screenWidth;
              const by = horizonY - b.h;
              return (
                <G key={`bldg_${idx}`}>
                  <Rect
                    x={bx}
                    y={by}
                    width={bw}
                    height={b.h}
                    fill="#070512"
                    stroke={theme.accent}
                    strokeWidth={0.7}
                    strokeOpacity={0.35}
                  />
                  {b.spire && (
                    <Polygon
                      points={`${bx + bw * 0.5},${by - 28} ${bx + bw * 0.35},${by} ${bx + bw * 0.65},${by}`}
                      fill={theme.secondaryAccent}
                      opacity={0.65}
                    />
                  )}
                  {/* Lit Cyber Windows */}
                  {[0.2, 0.45, 0.7].map((wy, wIdx) => (
                    <Rect
                      key={`win_${idx}_${wIdx}`}
                      x={bx + bw * 0.22}
                      y={by + b.h * wy}
                      width={bw * 0.56}
                      height={3}
                      fill={wIdx % 2 === 0 ? theme.accent : theme.secondaryAccent}
                      opacity={0.42}
                    />
                  ))}
                </G>
              );
            })}

            {/* Perspective 3D Synthwave Floor Grid below Horizon */}
            <Rect
              x={0}
              y={horizonY}
              width={screenWidth}
              height={Math.max(0, screenHeight - horizonY + 120)}
              fill="url(#horizonGlow)"
            />
            <Line
              x1={0}
              y1={horizonY}
              x2={screenWidth}
              y2={horizonY}
              stroke={theme.accent}
              strokeWidth={2}
              strokeOpacity={0.75}
            />
            {/* Perspective Fanning Rays */}
            {[-0.8, -0.45, -0.2, 0, 0.2, 0.45, 0.8].map((rayRatio) => (
              <Line
                key={`ray_${rayRatio}`}
                x1={sunCenterX + rayRatio * (screenWidth * 0.35)}
                y1={horizonY}
                x2={sunCenterX + rayRatio * (screenWidth * 1.45)}
                y2={screenHeight + 100}
                stroke={theme.accent}
                strokeWidth={1}
                strokeOpacity={0.28}
              />
            ))}
          </G>
        )}
      </Svg>

      {/* Vertical Cyber Grid & Dynamic Altitude Markers */}
      <View style={styles.gridContainer}>
        {VERTICAL_COLUMNS.map((ratio) => (
          <View
            key={`col_${ratio}`}
            style={[
              styles.verticalGridLine,
              { left: Math.round(screenWidth * ratio) },
            ]}
          />
        ))}

        {visibleMarkers.map((marker) => (
          <View
            key={`alt_${marker.blockLevel}`}
            style={[
              styles.elevationLine,
              { top: marker.screenY, backgroundColor: theme.gridColor },
            ]}
          >
            <Text style={[styles.elevationLabel, { color: theme.accent }]}>
              {`ALT // ${String(marker.blockLevel).padStart(2, '0')}F`}
            </Text>
            <Text style={[styles.elevationLabel, { color: theme.accent }]}>
              {`${marker.blockLevel * 3}M`}
            </Text>
          </View>
        ))}
      </View>

      {/* Overdrive Fever Mode Border Glow when on a 3+ Perfect Streak */}
      {isOverdrive && <View style={styles.overdriveBorderVignette} />}
    </View>
  );
}
