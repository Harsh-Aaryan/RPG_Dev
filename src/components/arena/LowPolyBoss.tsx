import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SEVERITY_STYLE } from '../../lib/game-rules';
import type { Severity } from '../../lib/types';

type Props = {
  severity: Severity | null;
  scale: number;
  hpRatio: number;
  hitKey: number; // increments on each verified hit
  defeated: boolean;
  reducedMotion: boolean;
};

const BODY = '#2f3654';
const ARMOR = '#4a4f7a';
const BONE = '#f0e6d2';

/** Procedural, flat-shaded boss built only from primitive geometry. */
export function LowPolyBoss({ severity, scale, hpRatio, hitKey, defeated, reducedMotion }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shards = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshStandardMaterial>(null);
  const aura = useRef<THREE.Mesh>(null);
  const hit = useRef({ key: hitKey, t: 10 });

  const auraColor = useMemo(() => new THREE.Color(severity ? SEVERITY_STYLE[severity].color : '#61e6ac'), [severity]);
  const spikeCount = severity === 'critical' ? 9 : severity === 'high' ? 7 : 5;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (hit.current.key !== hitKey) hit.current = { key: hitKey, t: 0 };
    hit.current.t += dt;
    const h = hit.current.t;
    const recoil = h < 0.6 ? Math.sin((h / 0.6) * Math.PI) * Math.exp(-h * 3) : 0;

    if (root.current) {
      const bob = reducedMotion ? 0 : Math.sin(t * 1.4) * 0.12;
      root.current.position.y = 1.35 * scale + bob;
      root.current.position.z = -recoil * 0.9;
      root.current.rotation.x = -recoil * 0.35;
      if (!reducedMotion) root.current.rotation.y = Math.sin(t * 0.35) * 0.25;
    }
    if (body.current && !reducedMotion) {
      // Wounded bosses breathe faster and lower.
      const pulse = 1 + Math.sin(t * (2 + (1 - hpRatio) * 4)) * 0.025;
      body.current.scale.setScalar(pulse);
    }
    if (shards.current && !reducedMotion) shards.current.rotation.y = t * 0.6;
    if (core.current) {
      const flash = h < 0.25 ? 1 - h / 0.25 : 0;
      core.current.emissiveIntensity = 1.2 + Math.sin(t * 3) * 0.3 + flash * 6;
      core.current.emissive.copy(auraColor).lerp(new THREE.Color('#ffffff'), flash);
    }
    if (aura.current) {
      const m = aura.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.1 + 0.08 * Math.sin(t * 2) + (h < 0.3 ? 0.35 * (1 - h / 0.3) : 0);
      aura.current.rotation.y = -t * 0.2;
    }
  });

  if (defeated) return null;

  return (
    <group ref={root} scale={scale}>
      <group ref={body}>
        {/* torso */}
        <mesh castShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={BODY} flatShading roughness={0.8} />
        </mesh>
        {/* glowing core */}
        <mesh position={[0, 0.05, 0.72]}>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial ref={core} color="#111" emissive={auraColor} emissiveIntensity={1.4} flatShading />
        </mesh>
        {/* shoulder plates */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 1.05, 0.45, 0]} rotation={[0, 0, s * -0.5]}>
            <mesh castShadow>
              <dodecahedronGeometry args={[0.42, 0]} />
              <meshStandardMaterial color={ARMOR} flatShading />
            </mesh>
            <mesh position={[s * 0.15, 0.45, 0]} rotation={[0, 0, s * -0.4]} castShadow>
              <coneGeometry args={[0.14, 0.6, 4]} />
              <meshStandardMaterial color={BONE} flatShading />
            </mesh>
          </group>
        ))}
        {/* claws */}
        {[-1, 1].map((s) => (
          <group key={`arm${s}`} position={[s * 1.25, -0.35, 0.25]} rotation={[0.3, 0, s * 0.25]}>
            <mesh castShadow>
              <octahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color={ARMOR} flatShading />
            </mesh>
            {[-0.12, 0, 0.12].map((x) => (
              <mesh key={x} position={[x, -0.32, 0.08]} rotation={[Math.PI, 0, 0]} castShadow>
                <coneGeometry args={[0.06, 0.32, 3]} />
                <meshStandardMaterial color={BONE} flatShading />
              </mesh>
            ))}
          </group>
        ))}
        {/* head */}
        <group position={[0, 1.15, 0.15]}>
          <mesh castShadow>
            <dodecahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial color={ARMOR} flatShading />
          </mesh>
          {/* snout */}
          <mesh position={[0, -0.12, 0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.28, 0.5, 4]} />
            <meshStandardMaterial color={BODY} flatShading />
          </mesh>
          {/* eyes */}
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 0.1, 0.45]} rotation={[0, 0, x > 0 ? -0.4 : 0.4]}>
              <boxGeometry args={[0.18, 0.06, 0.05]} />
              <meshBasicMaterial color={auraColor} toneMapped={false} />
            </mesh>
          ))}
          {/* horns */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.35, 0.5, -0.05]} rotation={[-0.35, 0, s * -0.45]} castShadow>
              <coneGeometry args={[0.12, 0.85, 4]} />
              <meshStandardMaterial color={BONE} flatShading />
            </mesh>
          ))}
        </group>
        {/* dorsal spikes: more for higher severity */}
        {Array.from({ length: spikeCount }, (_, i) => {
          const a = (i / (spikeCount - 1)) * Math.PI - Math.PI / 2;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 0.75, 0.55 + Math.cos(a) * 0.35, -0.55]}
              rotation={[-0.7, 0, -a * 0.6]}
              castShadow
            >
              <coneGeometry args={[0.1, 0.55, 3]} />
              <meshStandardMaterial color={auraColor} emissive={auraColor} emissiveIntensity={0.35} flatShading />
            </mesh>
          );
        })}
      </group>

      {/* orbiting data shards */}
      <group ref={shards}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.9, 0.4 + (i % 2) * 0.5, Math.sin(a) * 1.9]} rotation={[a, a, 0]}>
              <octahedronGeometry args={[0.14, 0]} />
              <meshStandardMaterial color={auraColor} emissive={auraColor} emissiveIntensity={0.8} flatShading />
            </mesh>
          );
        })}
      </group>

      {/* threat aura */}
      <mesh ref={aura}>
        <icosahedronGeometry args={[2.1, 1]} />
        <meshBasicMaterial color={auraColor} wireframe transparent opacity={0.15} toneMapped={false} />
      </mesh>
    </group>
  );
}
