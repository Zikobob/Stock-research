import { LinearGradient } from 'expo-linear-gradient';
import { memo, useId, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, RadialGradient, Rect, Stop, Use } from 'react-native-svg';

import { useLoop } from '@/components/ui/motion';
import type { Landmark, Pano, Roof } from '@/data/panoramas';

import { LOOKS, SHAPES, type Part, type Tone } from './shapes';

/** Layer speeds relative to the far layer. Wider layers scroll faster, which gives the parallax. */
export const K = { far: 1, mid: 1.4, near: 1.9, sky: 0.5 } as const;

export function layout(S: number) {
  const base = 4 * S;
  return { far: base * K.far, mid: base * K.mid, near: base * K.near, sky: base * K.sky };
}

/** Compass heading (0–360°) at the centre of the screen for a scroll position. */
export function headingOf(pos: number, S: number) {
  const W = layout(S).mid;
  return (((((pos * K.mid + S / 2) % W) + W) % W) / W) * 360;
}

/** Scroll position that centres a given compass heading. */
export function posForHeading(deg: number, S: number) {
  return ((deg / 360) * layout(S).mid - S / 2) / K.mid;
}

/** x position of something at compass heading `deg` inside a layer (so it lines up with the mid layer). */
function xFor(layerK: number, W: number, deg: number, S: number) {
  return (((posForHeading(deg, S) * layerK + S / 2) % W) + W) % W;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt >= 0 ? (255 - v) * amt : v * amt))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

interface Building {
  x: number;
  w: number;
  h: number;
  roof: Roof;
  v: number;
  amt: number;
}

function genBuildings(seed: number, W: number, wr: [number, number], hr: [number, number], gap: number, roofs: Roof[], towers: number, H: number): Building[] {
  const rand = rng(seed);
  const out: Building[] = [];
  let x = 0;
  while (x < W) {
    let w = wr[0] + rand() * (wr[1] - wr[0]);
    if (W - x - w < wr[0]) w = W - x;
    const tall = rand() < towers;
    const h = H * (tall ? hr[1] * (0.6 + rand() * 0.4) : hr[0] + (hr[1] - hr[0]) * Math.pow(rand(), 1.8) * 0.7);
    out.push({ x, w: Math.max(4, w - gap), h, roof: roofs[Math.floor(rand() * roofs.length)], v: Math.floor(rand() * 4), amt: (rand() - 0.5) * 0.22 });
    x += w;
  }
  return out;
}

/** Four window grids with different lit patterns, so skylines don't look tiled. */
function WindowPatterns({ id, night, color, base }: { id: string; night: boolean; color: string; base: string }) {
  return (
    <>
      {[0, 1, 2, 3].map((v) => {
        const rand = rng(900 + v * 17);
        const cells: ReactNode[] = [];
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++) {
            const lit = rand() < 0.55;
            if (night && !lit) continue;
            cells.push(<Rect key={`${i}-${j}`} x={3 + i * 6} y={4 + j * 9} width={3} height={5} fill={night ? color : lit ? '#FFFFFF' : base} opacity={night ? 0.95 : lit ? 0.4 : 0.55} />);
          }
        return (
          <Pattern key={v} id={`${id}${v}`} x={0} y={0} width={24} height={36} patternUnits="userSpaceOnUse">
            {cells}
          </Pattern>
        );
      })}
    </>
  );
}

function roofEl(b: Building, y: number, fill: string, night: boolean, key: string): ReactNode {
  const { x, w, h } = b;
  switch (b.roof) {
    case 'step':
      return <Rect key={key} x={x + w * 0.25} y={y - h * 0.08} width={w * 0.5} height={h * 0.08} fill={fill} />;
    case 'spire':
      return (
        <G key={key}>
          <Rect x={x + w / 2 - 0.8} y={y - h * 0.2} width={1.6} height={h * 0.2} fill={fill} />
          {night ? <Circle cx={x + w / 2} cy={y - h * 0.2} r={1.8} fill="#FF4B3E" /> : null}
        </G>
      );
    case 'slant':
      return <Path key={key} d={`M${x} ${y}L${x + w * 0.15} ${y - 4}L${x + w} ${y - 12}L${x + w} ${y}Z`} fill={fill} />;
    case 'gable':
      return <Path key={key} d={`M${x - 1} ${y}L${x + w / 2} ${y - w * 0.42}L${x + w + 1} ${y}Z`} fill={night ? shade('#8A4A3A', -0.6) : '#B5614A'} />;
    case 'dome':
      return <Path key={key} d={`M${x + w * 0.1} ${y}A${w * 0.4} ${w * 0.4} 0 0 1 ${x + w * 0.9} ${y}Z`} fill={shade(fill, night ? 0.1 : -0.1)} />;
    default:
      return null;
  }
}

function Landmarks({ list, layer, W, base, H, night, S }: { list: Landmark[]; layer: 'mid' | 'far'; W: number; base: number; H: number; night: boolean; S: number }) {
  return (
    <>
      {list
        .filter((lm) => !!lm.far === (layer === 'far'))
        .map((lm) => {
          const look = LOOKS[lm.kind];
          const idx = night ? 1 : 0;
          const x = xFor(K[layer], W, lm.heading, S);
          const colour = (k: Tone) => look[k][idx];
          return (
            <G key={lm.id} transform={`translate(${x} ${base}) scale(${H * lm.size})`}>
              {night && look.glowR > 0 ? <Circle cx={0} cy={-0.5} r={look.glowR} fill={`url(#glow-${lm.kind})`} /> : null}
              {SHAPES[lm.kind].map((pt: Part, i) => {
                const f = colour(pt.k);
                if (pt.t === 'p') return <Path key={i} d={pt.d} fill={f} />;
                if (pt.t === 'r') return <Rect key={i} x={pt.x} y={pt.y} width={pt.w} height={pt.h} fill={f} />;
                if (pt.t === 'c') return <Circle key={i} cx={pt.x} cy={pt.y} r={pt.r} fill={f} />;
                if (pt.t === 'l') return <Path key={i} d={`M${pt.x1} ${pt.y1}L${pt.x2} ${pt.y2}`} stroke={f} strokeWidth={pt.w} />;
                return <Path key={i} d={pt.d} stroke={f} strokeWidth={pt.w} fill="none" />;
              })}
            </G>
          );
        })}
    </>
  );
}

function GlowDefs({ list }: { list: Landmark[] }) {
  return (
    <>
      {list.map((lm) => (
        <RadialGradient key={lm.id} id={`glow-${lm.kind}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={LOOKS[lm.kind].glow} stopOpacity={0.55} />
          <Stop offset="1" stopColor={LOOKS[lm.kind].glow} stopOpacity={0} />
        </RadialGradient>
      ))}
    </>
  );
}

/** One scrolling layer: content is drawn once and repeated twice side by side so it can wrap around 360°. */
function Wrap({ W, H, defs, children }: { W: number; H: number; defs: ReactNode; children: ReactNode }) {
  const id = `strip${useId().replace(/\W/g, '')}`;
  return (
    <Svg width={W * 2} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>{defs}</Defs>
      <G id={id}>{children}</G>
      <Use href={`#${id}`} x={W} />
    </Svg>
  );
}

function skylineLayers(pano: Pano, S: number, H: number, night: boolean) {
  const W = layout(S);
  const i = night ? 1 : 0;
  const rand = rng(pano.seed * 7);
  const midBase = H * 0.58;
  const nearBase = H * 0.67;
  const farBase = H * 0.5;

  // ---- far layer: mountains or distant blocks
  const far: ReactNode[] = [];
  if (pano.mountains) {
    const f = rng(pano.seed + 3);
    const ph = [f() * 6, f() * 6, f() * 6];
    let d = `M0 ${farBase}`;
    for (let x = 0; x <= W.far; x += 12) {
      const t = (x / W.far) * Math.PI * 2;
      const amp =
        pano.mountains === 'hills'
          ? 0.05 + 0.03 * Math.sin(t * 3 + ph[0]) + 0.02 * Math.sin(t * 7 + ph[1])
          : pano.mountains === 'granite'
            ? 0.07 + 0.1 * Math.pow(Math.abs(Math.sin(t * 3 + ph[0])), 1.6) + 0.03 * Math.sin(t * 9 + ph[1])
            : 0.08 + 0.1 * Math.abs(Math.sin(t * 4 + ph[0])) + 0.04 * Math.sin(t * 11 + ph[2]);
      d += `L${x} ${farBase - H * amp}`;
    }
    d += `L${W.far} ${farBase}Z`;
    far.push(<Path key="mount" d={d} fill={pano.tone.far[i]} />);
  } else {
    genBuildings(pano.seed + 5, W.far, [12, 30], [0.03, 0.15], 2, ['flat', 'step', 'flat'], 0.1, H).forEach((b, k) =>
      far.push(<Rect key={`f${k}`} x={b.x} y={farBase - b.h} width={b.w} height={b.h} fill={shade(pano.tone.far[i], b.amt)} />),
    );
  }

  // ---- mid layer: the skyline
  const mid: ReactNode[] = [];
  const midDefs: ReactNode[] = [];
  if (pano.ground === 'slope') {
    const f = rng(pano.seed + 9);
    const ph = [f() * 6, f() * 6];
    const top = (x: number) => midBase - H * (0.13 + 0.06 * Math.sin((x / W.mid) * Math.PI * 2 * 2 + ph[0]) + 0.04 * Math.sin((x / W.mid) * Math.PI * 2 * 5 + ph[1]));
    let d = `M0 ${midBase}`;
    for (let x = 0; x <= W.mid; x += 12) d += `L${x} ${top(x)}`;
    d += `L${W.mid} ${midBase}Z`;
    mid.push(<Path key="hill" d={d} fill={pano.tone.mid[i]} />);
    const colours = pano.houses ?? ['#F2B8A2'];
    for (let row = 0; row < 2; row++) {
      let x = row * 11;
      let n = 0;
      while (x < W.mid - 40) {
        const w = 24 + rand() * 16;
        const h = H * (0.035 + rand() * 0.02);
        const y = Math.min(midBase - h, top(x + w / 2) + row * H * 0.035 + rand() * 6);
        const c = colours[Math.floor(rand() * colours.length)];
        const fill = night ? shade(c, -0.62) : c;
        mid.push(<Path key={`h${row}-${n}`} d={`M${x} ${y + h}L${x} ${y + 6}L${x + w / 2} ${y}L${x + w} ${y + 6}L${x + w} ${y + h}Z`} fill={fill} />);
        if (night) mid.push(<Rect key={`w${row}-${n}`} x={x + w * 0.3} y={y + h * 0.45} width={4} height={5} fill={pano.lights} />);
        x += w + 3;
        n++;
      }
    }
  } else {
    midDefs.push(<WindowPatterns key="wp" id={night ? 'wmn' : 'wmd'} night={night} color={pano.lights} base={shade(pano.tone.mid[i], 0.25)} />);
    genBuildings(pano.seed, W.mid, pano.mid.w, pano.mid.h, pano.mid.gap, pano.mid.roofs, pano.mid.towers, H).forEach((b, k) => {
      const fill = shade(pano.tone.mid[i], b.amt);
      const y = midBase - b.h;
      mid.push(<Rect key={`m${k}`} x={b.x} y={y} width={b.w} height={b.h} fill={fill} />);
      if (b.w > 8 && b.h > 16) mid.push(<Rect key={`mw${k}`} x={b.x + 1} y={y + 2} width={b.w - 2} height={b.h - 2} fill={`url(#${night ? 'wmn' : 'wmd'}${b.v})`} />);
      mid.push(roofEl(b, y, fill, night, `mr${k}`));
      if (pano.ground === 'water')
        mid.push(<Rect key={`mr${k}f`} x={b.x} y={midBase} width={b.w} height={Math.min(H * 0.1, b.h * 0.45)} fill={night ? pano.lights : '#FFFFFF'} opacity={night ? 0.12 : 0.1} />);
    });
  }

  // ---- near layer: low rooftops and street lamps
  const near: ReactNode[] = [];
  const nearDefs: ReactNode[] = [<WindowPatterns key="wp" id={night ? 'wnn' : 'wnd'} night={night} color={pano.lights} base={shade(pano.tone.near[i], 0.2)} />];
  genBuildings(pano.seed + 1, W.near, [34, 78], [pano.near.h[0], pano.near.h[1]], 6, pano.houses ? ['gable', 'flat'] : ['flat', 'gable', 'step'], 0, H).forEach((b, k) => {
    const c = pano.houses ? pano.houses[k % pano.houses.length] : pano.tone.near[i];
    const fill = pano.houses ? (night ? shade(c, -0.68) : c) : shade(c, b.amt);
    const y = nearBase - b.h;
    near.push(
      <Rect key={`n${k}`} x={b.x} y={y} width={b.w} height={b.h} fill={fill} />,
      <Rect key={`nw${k}`} x={b.x + 2} y={y + 3} width={b.w - 4} height={b.h - 4} fill={`url(#${night ? 'wnn' : 'wnd'}${b.v})`} />,
      roofEl({ ...b, roof: b.roof === 'step' ? 'flat' : b.roof }, y, fill, night, `nr${k}`),
    );
  });
  for (let x = 40; x < W.near; x += 130 + rand() * 40) {
    near.push(<Rect key={`lp${x}`} x={x} y={nearBase - H * 0.075} width={2} height={H * 0.075} fill={night ? '#20243A' : '#4A505C'} />);
    near.push(night ? <Circle key={`lg${x}`} cx={x + 1} cy={nearBase - H * 0.078} r={13} fill={pano.lights} opacity={0.3} /> : null);
    near.push(<Circle key={`lb${x}`} cx={x + 1} cy={nearBase - H * 0.078} r={2.6} fill={night ? '#FFF1C9' : '#9AA3B0'} />);
  }
  // Foreground details: lane markings on streets, shimmer on water.
  if (pano.ground === 'road') {
    for (let x = 0; x < W.near; x += 64) near.push(<Rect key={`ln${x}`} x={x} y={H * 0.79} width={30} height={3} fill={night ? '#C9C3A0' : '#E8E3C8'} opacity={night ? 0.3 : 0.7} />);
    near.push(<Rect key="edge" x={0} y={H * 0.72} width={W.near} height={2} fill={night ? '#2A2E48' : '#6B7280'} opacity={0.8} />);
  } else {
    for (let k = 0; k < 140; k++) near.push(<Rect key={`sh${k}`} x={rand() * W.near} y={H * (0.69 + rand() * 0.27)} width={14 + rand() * 40} height={1.6} rx={1} fill={night ? pano.lights : '#FFFFFF'} opacity={night ? 0.14 + rand() * 0.14 : 0.18 + rand() * 0.2} />);
  }
  return { far, mid, near, midDefs, nearDefs, W, farBase, midBase, nearBase };
}

function Skyline({ pano, S, H, night, pos }: { pano: Pano; S: number; H: number; night: boolean; pos: Animated.Value }) {
  const [built] = useState(() => skylineLayers(pano, S, H, night));
  const { W } = built;
  const glowDefs = <GlowDefs list={pano.landmarks} />;
  return (
    <>
      <Layer pos={pos} k={K.far} W={W.far} H={H} defs={null}>
        {built.far}
        <Landmarks list={pano.landmarks} layer="far" W={W.far} base={built.farBase} H={H} night={night} S={S} />
      </Layer>
      <Layer pos={pos} k={K.mid} W={W.mid} H={H} defs={[...built.midDefs, glowDefs]}>
        {built.mid}
        <Landmarks list={pano.landmarks} layer="mid" W={W.mid} base={built.midBase} H={H} night={night} S={S} />
      </Layer>
      <Layer pos={pos} k={K.near} W={W.near} H={H} defs={built.nearDefs}>
        {built.near}
      </Layer>
    </>
  );
}

/** A layer wrapper that scrolls with the shared position value. */
function Layer({ pos, k, W, H, defs, children }: { pos: Animated.Value; k: number; W: number; H: number; defs: ReactNode; children: ReactNode }) {
  const tx = Animated.multiply(Animated.modulo(Animated.multiply(pos, k), W), -1);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: tx }] }]}>
      <Wrap W={W} H={H} defs={defs}>
        {children}
      </Wrap>
    </Animated.View>
  );
}

function SkyDecor({ pano, S, H, night }: { pano: Pano; S: number; H: number; night: boolean }) {
  const Ws = layout(S).sky;
  const [items] = useState(() => {
    const rand = rng(pano.seed * 13);
    const stars = Array.from({ length: 70 }, () => ({ x: rand() * Ws, y: rand() * H * 0.42, r: 0.6 + rand() * 1.4, o: 0.5 + rand() * 0.5 }));
    const clouds = Array.from({ length: 5 }, () => ({ x: rand() * Ws, y: H * (0.1 + rand() * 0.22), w: 70 + rand() * 90 }));
    return { stars, clouds };
  });
  const sunX = xFor(K.sky, Ws, 205, S);
  const moonX = xFor(K.sky, Ws, 150, S);
  return (
    <Wrap
      W={Ws}
      H={H}
      defs={
        <>
          <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFE9A8" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#FFE9A8" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="moon" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFF4C7" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#FFF4C7" stopOpacity={0} />
          </RadialGradient>
        </>
      }>
      {night ? (
        <>
          {items.stars.map((st, i) => (
            <Circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#FFFFFF" opacity={st.o} />
          ))}
          <Circle cx={moonX} cy={H * 0.17} r={70} fill="url(#moon)" />
          <Circle cx={moonX} cy={H * 0.17} r={20} fill="#FFF4C7" />
          <Circle cx={moonX + 8} cy={H * 0.17 - 4} r={18} fill={pano.sky.nightTop} opacity={0.9} />
        </>
      ) : (
        <>
          <Circle cx={sunX} cy={H * 0.2} r={150} fill="url(#sun)" />
          <Circle cx={sunX} cy={H * 0.2} r={26} fill="#FFF3C4" />
          {items.clouds.map((c, i) => (
            <G key={i} opacity={0.75}>
              <Rect x={c.x} y={c.y} width={c.w} height={14} rx={7} fill="#FFFFFF" />
              <Rect x={c.x + c.w * 0.2} y={c.y - 9} width={c.w * 0.5} height={16} rx={8} fill="#FFFFFF" />
            </G>
          ))}
        </>
      )}
    </Wrap>
  );
}

function CarLights({ H, S, color }: { H: number; S: number; color: string }) {
  const a = useLoop(9000, { rest: 0 });
  const b = useLoop(12000, { rest: 0 });
  const dots = Array.from({ length: 18 }, (_, i) => i);
  const row = (key: string, v: Animated.Value, y: number, c: string, dir: 1 | -1) => (
    <Animated.View
      key={key}
      pointerEvents="none"
      style={{ position: 'absolute', top: y, left: 0, width: S * 2, height: 6, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: dir === 1 ? [-S, 0] : [0, -S] }) }] }}>
      {dots.map((i) => (
        <View key={i} style={{ position: 'absolute', left: (i * S * 2) / 18 + ((i * 37) % 23), width: 11, height: 4, borderRadius: 2, backgroundColor: c, opacity: 0.9 }} />
      ))}
    </Animated.View>
  );
  return (
    <>
      {row('w', a, H * 0.755, '#FFF6D8', -1)}
      {row('r', b, H * 0.8, '#FF5A4D', 1)}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: H * 0.745, height: H * 0.08, backgroundColor: color, opacity: 0.05 }} />
    </>
  );
}

function PanoramaSceneImpl({ pano, night, pos, S, H }: { pano: Pano; night: Animated.Value; pos: Animated.Value; S: number; H: number }) {
  const flicker = useLoop(2600, { pingPong: true, rest: 0.5 });
  const nightOp = Animated.multiply(night, flicker.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] }));
  const dayOp = night.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const water = pano.ground !== 'road';
  const ground = water ? { day: ['#5B97C9', '#2F6A9E'], night: ['#0B1235', '#04061A'] } : { day: ['#454C59', '#2B3039'], night: ['#0E1122', '#05060F'] };
  const skyTx = Animated.multiply(Animated.modulo(Animated.multiply(pos, K.sky), layout(S).sky), -1);
  const sparkle = useLoop(3200, { pingPong: true, rest: 0.5 });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sky */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: dayOp }]}>
        <LinearGradient colors={[pano.sky.dayTop, pano.sky.dayHorizon]} locations={[0.05, 0.55]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: night }]}>
        <LinearGradient colors={[pano.sky.nightTop, pano.sky.nightHorizon]} locations={[0.05, 0.58]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: dayOp, transform: [{ translateX: skyTx }] }]}>
        <SkyDecor pano={pano} S={S} H={H} night={false} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: Animated.multiply(night, sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] })), transform: [{ translateX: skyTx }] }]}>
        <SkyDecor pano={pano} S={S} H={H} night />
      </Animated.View>

      {/* Ground / water */}
      <Animated.View style={[styles.ground, { top: H * 0.5, opacity: dayOp }]}>
        <LinearGradient colors={ground.day as [string, string]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.ground, { top: H * 0.5, opacity: night }]}>
        <LinearGradient colors={ground.night as [string, string]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Skyline: day set and night set cross-fade */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: dayOp }]}>
        <Skyline pano={pano} S={S} H={H} night={false} pos={pos} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: nightOp }]}>
        <Skyline pano={pano} S={S} H={H} night pos={pos} />
      </Animated.View>

      {/* Warm city glow above the skyline at night */}
      <Animated.View style={[styles.glow, { top: H * 0.3, height: H * 0.3, opacity: Animated.multiply(night, 0.5) }]}>
        <LinearGradient colors={['rgba(255,150,70,0)', pano.lights]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.glow, { top: H * 0.3, height: H * 0.3, opacity: Animated.multiply(dayOp, 0.28) }]}>
        <LinearGradient colors={['rgba(255,255,255,0)', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {!water ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: night }]}>
          <CarLights S={S} H={H} color={pano.lights} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export const PanoramaScene = memo(PanoramaSceneImpl);

const styles = StyleSheet.create({
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  glow: { position: 'absolute', left: 0, right: 0 },
});
