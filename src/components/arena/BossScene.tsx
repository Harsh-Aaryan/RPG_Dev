import { OrbitControls, Sparkles } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { SEVERITY_STYLE } from '../../lib/game-rules';
import type { Severity } from '../../lib/types';
import { ShatterEffect } from './DamageEffect';
import { FloatingIsland } from './FloatingIsland';
import { LowPolyBoss } from './LowPolyBoss';

export type BossSceneProps = {
  severity: Severity | null;
  scale: number;
  hpRatio: number;
  hitKey: number;
  defeated: boolean;
  reducedMotion: boolean;
  interactive?: boolean;
};

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function BossScene(props: BossSceneProps) {
  const supported = useMemo(webglAvailable, []);
  if (!supported) return <BossFallback2D {...props} />;
  const accent = props.severity ? SEVERITY_STYLE[props.severity].color : '#61e6ac';

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={{ position: [0, 3.6, 8.2], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-label="3D arena showing the repository boss"
      role="img"
    >
      <color attach="background" args={['#10131f']} />
      <fog attach="fog" args={['#10131f', 10, 22]} />
      <ambientLight intensity={0.55} color="#8c90c8" />
      <directionalLight
        position={[5, 9, 4]}
        intensity={2.2}
        color="#f0e6d2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <pointLight position={[-4, 2.5, -3]} intensity={18} color="#9c78ff" />
      <pointLight position={[4, 1.5, -2]} intensity={14} color="#49dbf2" />
      <pointLight position={[0, 1.2, 2.5]} intensity={props.defeated ? 4 : 8} color={accent} />
      <Suspense fallback={null}>
        <group position={[0, -1.1, 0]}>
          <FloatingIsland reducedMotion={props.reducedMotion} />
          <LowPolyBoss {...props} />
          {props.defeated && <ShatterEffect color={accent} scale={props.scale} />}
        </group>
        {!props.reducedMotion && <Sparkles count={40} scale={[12, 6, 12]} size={2.5} speed={0.3} color={accent} />}
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enabled={props.interactive ?? true}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate={!props.reducedMotion && props.defeated}
        autoRotateSpeed={0.6}
        target={[0, 0.6, 0]}
      />
    </Canvas>
  );
}

/** 2D low-poly fallback for devices without WebGL. */
function BossFallback2D({ severity, hpRatio, defeated }: BossSceneProps) {
  const accent = severity ? SEVERITY_STYLE[severity].color : '#61e6ac';
  return (
    <div className="flex h-full w-full items-center justify-center bg-obsidian" role="img" aria-label="Boss illustration (2D fallback)">
      <svg viewBox="0 0 200 200" className="h-full max-h-80 w-auto" style={{ opacity: defeated ? 0.25 : 1 }}>
        <polygon points="20,170 100,150 180,170 150,190 50,190" fill="#2a3150" />
        <polygon points="100,40 145,80 130,140 70,140 55,80" fill="#2f3654" />
        <polygon points="100,40 145,80 100,95" fill="#3a4166" />
        <polygon points="70,140 100,95 130,140" fill="#262b45" />
        <polygon points="85,30 75,5 92,28" fill="#f0e6d2" />
        <polygon points="115,30 125,5 108,28" fill="#f0e6d2" />
        <polygon points="100,85 110,100 100,115 90,100" fill={accent} />
        <rect x="82" y="60" width="12" height="4" fill={accent} />
        <rect x="106" y="60" width="12" height="4" fill={accent} />
        <circle cx="100" cy="95" r={60 + 20 * hpRatio} fill="none" stroke={accent} strokeOpacity="0.25" strokeDasharray="4 6" />
      </svg>
    </div>
  );
}
