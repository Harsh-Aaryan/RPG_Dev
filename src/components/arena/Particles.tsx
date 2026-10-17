import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seeded, softDotTexture } from './geometry';

let dotTexture: THREE.Texture | null = null;
const dot = () => (dotTexture ??= softDotTexture());

const EMBER_COLORS = ['#ff8a4a', '#d0a260', '#c66a5e', '#ffb067'].map((c) => new THREE.Color(c));

/** Slow embers rising off the braziers and the dais. Static under reduced motion. */
export function Embers({ count = 70, reducedMotion }: { count?: number; reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const rand = seeded(83);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Half of them rise from the braziers, the rest drift over the arena.
      const fromBrazier = i % 2 === 0;
      const side = i % 4 === 0 ? -1 : 1;
      pos[i * 3] = fromBrazier ? side * 3.55 + (rand() - 0.5) * 0.4 : (rand() - 0.5) * 9;
      pos[i * 3 + 1] = rand() * 5;
      pos[i * 3 + 2] = fromBrazier ? 1.95 + (rand() - 0.5) * 0.4 : (rand() - 0.5) * 7;
      vel[i] = 0.18 + rand() * 0.42;
      phase[i] = rand() * Math.PI * 2;
      const c = EMBER_COLORS[i % EMBER_COLORS.length];
      col.set([c.r, c.g, c.b], i * 3);
    }
    return { pos, col, vel, phase };
  }, [count]);

  useFrame((state, dt) => {
    if (reducedMotion || !points.current) return;
    const t = state.clock.elapsedTime;
    const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = attr.getY(i) + data.vel[i] * dt;
      let x = attr.getX(i) + Math.sin(t * 0.7 + data.phase[i]) * 0.12 * dt;
      if (y > 5.2) {
        y = 1.1 + Math.random() * 0.3;
        if (i % 2 === 0) x = (i % 4 === 0 ? -1 : 1) * 3.55 + (Math.random() - 0.5) * 0.3;
      }
      attr.setXY(i, x, y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[data.col, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={dot()}
        size={0.09}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/** A few low, slow smoke banks hugging the floor. */
export function Smoke({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(() => softDotTexture(128, 'rgba(170,180,170,1)', 'rgba(170,180,170,0)'), []);
  const banks = useMemo(() => {
    const rand = seeded(97);
    return Array.from({ length: 6 }, (_, i) => ({
      x: (rand() - 0.5) * 11,
      y: -0.2 + rand() * 0.9,
      z: -1.5 - rand() * 4,
      s: 4 + rand() * 4,
      speed: (rand() - 0.5) * 0.12,
      opacity: 0.05 + rand() * 0.05,
      key: i,
    }));
  }, []);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((_, dt) => {
    if (reducedMotion || !group.current) return;
    group.current.children.forEach((c, i) => {
      c.position.x += banks[i].speed * dt;
      if (c.position.x > 7) c.position.x = -7;
      if (c.position.x < -7) c.position.x = 7;
    });
  });

  return (
    <group ref={group}>
      {banks.map((b) => (
        <sprite key={b.key} position={[b.x, b.y, b.z]} scale={[b.s, b.s * 0.45, 1]}>
          <spriteMaterial map={tex} transparent opacity={b.opacity} depthWrite={false} color="#9aa69c" />
        </sprite>
      ))}
    </group>
  );
}

/** Burst of sparks from the boss's core each time a verified hit lands. */
export function HitSparks({ hitKey, origin, reducedMotion }: { hitKey: number; origin: [number, number, number]; reducedMotion: boolean }) {
  const count = 42;
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const state = useRef({ key: hitKey, age: 10 });
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const c = EMBER_COLORS[i % EMBER_COLORS.length];
      col.set([c.r, c.g, c.b], i * 3);
    }
    return { pos, col, vel };
  }, []);

  useFrame((_, dt) => {
    const s = state.current;
    const geo = points.current?.geometry;
    if (!geo || !mat.current) return;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    if (s.key !== hitKey) {
      s.key = hitKey;
      s.age = 0;
      for (let i = 0; i < count; i++) {
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 - 0.1, Math.random() * 0.8 + 0.2).normalize();
        const speed = 2 + Math.random() * 3.5;
        data.vel.set([dir.x * speed, dir.y * speed, dir.z * speed], i * 3);
        attr.setXYZ(i, origin[0], origin[1], origin[2]);
      }
    }
    s.age += dt;
    const life = reducedMotion ? 0.35 : 1.1;
    mat.current.opacity = Math.max(0, 1 - s.age / life);
    if (s.age > life || reducedMotion) {
      attr.needsUpdate = true;
      return;
    }
    for (let i = 0; i < count; i++) {
      data.vel[i * 3 + 1] -= 6 * dt;
      attr.setXYZ(i, attr.getX(i) + data.vel[i * 3] * dt, attr.getY(i) + data.vel[i * 3 + 1] * dt, attr.getZ(i) + data.vel[i * 3 + 2] * dt);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[data.col, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        map={dot()}
        size={0.12}
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
