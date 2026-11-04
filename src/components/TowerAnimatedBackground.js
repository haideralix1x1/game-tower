import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Circle,
  Polygon,
  Line,
  G,
} from 'react-native-svg';
import { COLORS } from '../../styles';

// Deterministic cyber stars coordinates
const CYBER_STARS = Array.from({ length: 28 }, (_, i) => ({
  id: `cs_${i}`,
  x: ((i * 47 + 19) % 96) / 100,
  y: ((i * 73 + 31) % 65) / 100,
  size: (i % 3) + 1.6,
  color:
    i % 3 === 0
      ? COLORS.cyan
      : i % 3 === 1
        ? COLORS.magenta
        : COLORS.solarGold,
  opacity: 0.35 + (i % 5) * 0.12,
}));

// Distant Cyberpunk Megacity Skyline with Antenna Spire lights
const SKYLINE_BUILDINGS = [
  { x: 0.0, w: 0.08, h: 80, spire: false },
  { x: 0.07, w: 0.1, h: 130, spire: true },
  { x: 0.16, w: 0.08, h: 70, spire: false },
  { x: 0.23, w: 0.11, h: 160, spire: true },
  { x: 0.33, w: 0.08, h: 95, spire: false },
  { x: 0.4, w: 0.1, h: 120, spire: true },
  { x: 0.49, w: 0.09, h: 85, spire: false },
  { x: 0.57, w: 0.11, h: 175, spire: true },
  { x: 0.67, w: 0.08, h: 90, spire: false },
  { x: 0.74, w: 0.1, h: 140, spire: true },
  { x: 0.83, w: 0.09, h: 100, spire: false },
  { x: 0.91, w: 0.09, h: 125, spire: true },
];

export default function TowerAnimatedBackground() {
  const { width, height } = useWindowDimensions();

  const horizonY = height * 0.72;
  const sunRadius = Math.min(width * 0.26, 105);
  const sunCenterX = width * 0.5;
  const sunCenterY = horizonY - 45;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Deep Cyberpunk Sky Base Gradient */}
      <LinearGradient
        colors={['#030208', '#080516', '#12092E', '#1C0B3E']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient Neon Glow Orbs */}
      <View
        style={[
          styles.glowOrb,
          {
            top: -40,
            left: -30,
            backgroundColor: 'rgba(0, 245, 255, 0.12)',
          },
        ]}
      />
      <View
        style={[
          styles.glowOrb,
          {
            top: horizonY - 140,
            right: -40,
            backgroundColor: 'rgba(255, 0, 127, 0.14)',
          },
        ]}
      />

      {/* Unified Fast SVG Vector Layer */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
        <Defs>
          {/* Synthwave Sun Gradient */}
          <SvgLinearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFD166" stopOpacity="0.95" />
            <Stop offset="45%" stopColor="#FF007F" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#7928CA" stopOpacity="0.85" />
          </SvgLinearGradient>

          {/* Searchlight Beam Gradients */}
          <SvgLinearGradient id="beamLeftGrad" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.25" />
            <Stop offset="60%" stopColor="#0088FF" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#00F5FF" stopOpacity="0" />
          </SvgLinearGradient>

          <SvgLinearGradient id="beamRightGrad" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0%" stopColor="#FF007F" stopOpacity="0.25" />
            <Stop offset="60%" stopColor="#7928CA" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#FF007F" stopOpacity="0" />
          </SvgLinearGradient>

          {/* Distant Skyline Building Gradient */}
          <SvgLinearGradient id="skylineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1E0D3E" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#080315" stopOpacity="0.95" />
          </SvgLinearGradient>

          {/* 3D Floor Grid Gradient */}
          <SvgLinearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.5" />
            <Stop offset="70%" stopColor="#7928CA" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#FF007F" stopOpacity="0.08" />
          </SvgLinearGradient>
        </Defs>

        {/* Diagonal Sweeping Laser Spotlight Cones */}
        <Polygon
          points={`${width * 0.22},${horizonY + 30} ${width * 0.06},0 ${width * 0.38},0`}
          fill="url(#beamLeftGrad)"
        />
        <Polygon
          points={`${width * 0.78},${horizonY + 30} ${width * 0.62},0 ${width * 0.94},0`}
          fill="url(#beamRightGrad)"
        />

        {/* Stars in Upper Atmosphere */}
        {CYBER_STARS.map((star) => (
          <Circle
            key={star.id}
            cx={star.x * width}
            cy={star.y * height}
            r={star.size}
            fill={star.color}
            opacity={star.opacity}
          />
        ))}

        {/* Synthwave Sun Orb */}
        <Circle
          cx={sunCenterX}
          cy={sunCenterY}
          r={sunRadius}
          fill="url(#sunGrad)"
        />

        {/* Retro Horizontal Sun Scan Slits */}
        {Array.from({ length: 6 }).map((_, idx) => {
          const slitY = sunCenterY + idx * 8 + 4;
          const slitH = 2 + idx * 1.2;
          return (
            <Rect
              key={`slit_${idx}`}
              x={sunCenterX - sunRadius}
              y={slitY}
              width={sunRadius * 2}
              height={slitH}
              fill="#080516"
            />
          );
        })}

        {/* Distant Cyber Skyline Silhouette */}
        {SKYLINE_BUILDINGS.map((b, i) => {
          const bx = b.x * width;
          const bw = b.w * width;
          const by = horizonY - b.h;
          return (
            <G key={`b_${i}`}>
              <Rect
                x={bx}
                y={by}
                width={bw}
                height={b.h}
                fill="url(#skylineGrad)"
                stroke="rgba(0, 245, 255, 0.16)"
                strokeWidth={0.8}
              />
              {/* Random lit cyber windows */}
              {Array.from({ length: Math.floor(b.h / 16) }).map((_, row) => (
                <Rect
                  key={`w_${row}`}
                  x={bx + (row % 2 ? 3 : bw - 6)}
                  y={by + row * 15 + 6}
                  width={3}
                  height={3}
                  fill={
                    row % 3 === 0
                      ? '#00F5FF'
                      : row % 3 === 1
                        ? '#FFD166'
                        : '#FF007F'
                  }
                  opacity={0.65}
                />
              ))}
              {/* Spire with warning light */}
              {b.spire && (
                <Line
                  x1={bx + bw / 2}
                  y1={by}
                  x2={bx + bw / 2}
                  y2={by - 14}
                  stroke="#FF0055"
                  strokeWidth={1.4}
                />
              )}
            </G>
          );
        })}

        {/* Glowing Neon Horizon Line */}
        <Line
          x1={0}
          y1={horizonY}
          x2={width}
          y2={horizonY}
          stroke="#00F5FF"
          strokeWidth={2.5}
        />

        {/* 3D Perspective Grid Floor */}
        {[-0.6, -0.35, -0.15, 0.0, 0.15, 0.35, 0.6, 0.85, 1.1, 1.35, 1.6].map(
          (ratio, idx) => (
            <Line
              key={`p_${idx}`}
              x1={width / 2}
              y1={horizonY}
              x2={width * ratio}
              y2={height}
              stroke="url(#gridGrad)"
              strokeWidth={1.2}
            />
          )
        )}
        {[14, 32, 58, 92, 138, 198, 270].map((yStep, idx) => (
          <Line
            key={`h_${idx}`}
            x1={0}
            y1={horizonY + yStep}
            x2={width}
            y2={horizonY + yStep}
            stroke="url(#gridGrad)"
            strokeWidth={idx < 3 ? 1 : 1.5}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    elevation: 0,
  },
  glowOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.7,
  },
});
