import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const SHARD_TONES = ['#1f2823', '#2a342d', '#5a4e3b', '#8e643f'];

/** On defeat the boss breaks into flat-shaded fragments that tumble onto the dais. */
export function ShatterEffect({ color, scale }: { color: string; scale: number }) {
  const group = useRef<THREE.Group>(null);
  const pieces = useMemo(
    () =>
      Array.from({ length: 54 }, (_, i) => {
        const dir = new THREE.Vector3(Math.sin(i * 2.4), Math.cos(i * 1.7) * 0.6 + 0.7, Math.cos(i * 2.4)).normalize();
        const height = 0.6 + (i % 9) * 0.3;
        return {
          pos: new THREE.Vector3(Math.sin(i * 0.9) * 0.5, height * scale * 0.82, Math.cos(i * 0.9) * 0.4).addScaledVector(dir, 0.2),
          vel: dir.multiplyScalar(1.4 + (i % 5) * 0.5),
          spin: new THREE.Vector3((i % 3) - 1, (i % 4) - 1.5, (i % 2) - 0.5),
          size: 0.1 + (i % 4) * 0.06,
          tint: i % 7 === 0 ? color : SHARD_TONES[i % SHARD_TONES.length],
          glow: i % 7 === 0,
        };
      }),
    [color, scale],
  );
  const age = useRef(0);

  useFrame((_, dt) => {
    age.current += dt;
    if (age.current > 4) return;
    group.current?.children.forEach((c, i) => {
      const p = pieces[i];
      p.vel.y -= 5.5 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const onDais = Math.hypot(p.pos.x, p.pos.z) < 4.2;
      const floor = onDais ? 0.05 + p.size * 0.4 : -0.75;
      if (p.pos.y < floor) {
        p.pos.y = floor;
        p.vel.multiplyScalar(0.35);
        p.vel.y = Math.abs(p.vel.y) * 0.25;
        p.spin.multiplyScalar(0.5);
      }
      c.position.copy(p.pos);
      c.rotation.x += p.spin.x * dt * 3;
      c.rotation.y += p.spin.y * dt * 3;
    });
  });

  return (
    <group ref={group}>
      {pieces.map((p, i) => (
        <mesh key={i} castShadow>
          <tetrahedronGeometry args={[p.size, 0]} />
          <meshStandardMaterial
            color={p.tint}
            emissive={p.glow ? p.tint : '#000000'}
            emissiveIntensity={p.glow ? 1.2 : 0}
            flatShading
            roughness={0.7}
            metalness={p.tint === '#8e643f' ? 0.6 : 0.05}
          />
        </mesh>
      ))}
    </group>
  );
}
