import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SEVERITY_STYLE } from '../../lib/game-rules';
import type { Severity } from '../../lib/types';
import { ArenaStage } from './ArenaStage';
import { ShatterEffect } from './DamageEffect';
import { softDotTexture } from './geometry';
import { LowPolyBoss } from './LowPolyBoss';
import { Embers, HitSparks, Smoke } from './Particles';

export type BossSceneProps = {
  /** Highest unresolved severity: drives the core and aura colour. */
  severity: Severity | null;
  /** Highest severity the boss was born from: drives its build (wings, girth, spines). */
  form?: Severity | null;
  scale: number;
  hpRatio: number;
  hitKey: number;
  defeated: boolean;
  reducedMotion: boolean;
  /** Mouse parallax on the camera. Never captures touch, so the page still scrolls. */
  interactive?: boolean;
  /** Pause rendering while the arena is off screen. */
  paused?: boolean;
  /** Fraction of the frame covered by a HUD at the top; the view shifts the boss below it. */
  hudInset?: number;
};

const FOG = '#121714';

/** Frames the boss for any aspect ratio, adds mouse parallax and a short shake on hits. */
function CameraRig({
  hitKey,
  interactive,
  reducedMotion,
  scale,
  hudInset,
}: {
  hitKey: number;
  interactive: boolean;
  reducedMotion: boolean;
  scale: number;
  hudInset: number;
}) {
  const { camera, size } = useThree();

  // Lens shift: render as if the frame started above the canvas so the boss sits under the HUD.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (hudInset > 0) cam.setViewOffset(size.width, size.height, 0, -size.height * hudInset, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, hudInset]);

  const hit = useRef({ key: hitKey, t: 10 });
  const look = useRef(new THREE.Vector3(0, 1.75, 0));
  const target = new THREE.Vector3();

  useFrame((state, dt) => {
    if (hit.current.key !== hitKey) hit.current = { key: hitKey, t: 0 };
    hit.current.t += dt;
    const aspect = size.width / Math.max(1, size.height);
    // Narrow (portrait) viewports step back so the wings and dais still fit.
    const fit = Math.pow(Math.min(1.25, Math.max(0.55, aspect)) / 1.25, -0.75);
    const dist = (9.4 + (scale - 1) * 2.2) * fit * (1 + hudInset * 0.9);
    const px = interactive && !reducedMotion ? state.pointer.x * 0.55 : 0;
    const py = interactive && !reducedMotion ? state.pointer.y * 0.25 : 0;
    const h = hit.current.t;
    const shake = reducedMotion || h > 0.45 ? 0 : (1 - h / 0.45) * 0.07;
    target.set(px + Math.sin(h * 70) * shake, 2.35 + py + Math.cos(h * 55) * shake, dist);
    camera.position.lerp(target, 1 - Math.exp(-dt * 4));
    look.current.set(0, 1.75 + (scale - 1) * 0.6, 0);
    camera.lookAt(look.current);
  });
  return null;
}

/** A faint warm haze far behind the arch so the boss's silhouette separates from the night. */
function Backdrop() {
  const tex = useMemo(() => softDotTexture(128, 'rgba(201,148,96,1)', 'rgba(201,148,96,0)'), []);
  return (
    <sprite position={[0, 3.4, -14]} scale={[26, 15, 1]}>
      <spriteMaterial map={tex} transparent opacity={0.16} depthWrite={false} fog={false} />
    </sprite>
  );
}

export function BossScene(props: BossSceneProps) {
  const accent = props.severity ? SEVERITY_STYLE[props.severity].color : '#82a58a';
  const s = props.scale * 0.82;
  const reduced = props.reducedMotion;

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      frameloop={props.paused ? 'never' : 'always'}
      camera={{ position: [0, 2.35, 9.4], fov: 36, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-label="3D arena showing the repository boss"
      role="img"
    >
      <color attach="background" args={[FOG]} />
      <fog attach="fog" args={[FOG, 12, 34]} />
      <hemisphereLight args={['#5a6b61', '#0d100e', 1.15]} />
      <directionalLight
        position={[-4.5, 9, 6]}
        intensity={2.7}
        color="#f3d2ac"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0006}
      />
      {/* cool moonlit rim from behind to carve the silhouette */}
      <directionalLight position={[5, 5, -8]} intensity={3} color="#9cc2b6" />
      <directionalLight position={[-6, 3, -6]} intensity={1.4} color="#c99460" />
      {/* soft front fill so the belly plates and jaw read against the dark */}
      <directionalLight position={[1.5, 2.5, 10]} intensity={0.95} color="#cdbda4" />
      <Backdrop />
      <Suspense fallback={null}>
        <group position={[0, -0.25, 0]}>
          <ArenaStage hitKey={props.hitKey} reducedMotion={reduced} />
          <LowPolyBoss {...props} />
          {props.defeated && <ShatterEffect color={accent} scale={props.scale} />}
          {!props.defeated && <HitSparks hitKey={props.hitKey} origin={[0.15 * s, 1.65 * s, 0.35 * s]} reducedMotion={reduced} />}
        </group>
        <Embers count={reduced ? 28 : 70} reducedMotion={reduced} />
        <Smoke reducedMotion={reduced} />
      </Suspense>
      <CameraRig
        hitKey={props.hitKey}
        interactive={props.interactive ?? true}
        reducedMotion={reduced}
        scale={props.scale}
        hudInset={props.hudInset ?? 0}
      />
    </Canvas>
  );
}

export default BossScene;
