import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { merge, placed, quatFromUp, seeded, tint } from './geometry';

const STONE = '#3a403a';
const STONE_DARK = '#252b26';
const BRONZE = '#7d5836';

/** Circular stone dais: stepped base, worn tiles, a copper rune ring. */
function Dais({ hitKey, reducedMotion }: { hitKey: number; reducedMotion: boolean }) {
  const rune = useRef<THREE.MeshBasicMaterial>(null);
  const glyphs = useRef<THREE.MeshBasicMaterial>(null);
  const hit = useRef({ key: hitKey, t: 10 });

  const geo = useMemo(() => {
    const rand = seeded(17);
    const q0 = new THREE.Quaternion();
    const base = tint(placed(new THREE.CylinderGeometry(4.2, 4.38, 0.5, 14, 1), new THREE.Vector3(0, -0.25, 0), q0), STONE_DARK, 0.08, 1);
    const step = tint(placed(new THREE.CylinderGeometry(4.78, 4.95, 0.3, 16, 1), new THREE.Vector3(0, -0.65, 0), q0), '#1e231f', 0.06, 2);

    // Annular tile sectors with slight height and tone variation; the gaps read as grout.
    const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const rings: [number, number, number][] = [
      [0.0, 1.05, 6],
      [1.12, 2.28, 10],
      [2.5, 3.3, 14],
      [3.37, 4.12, 18],
    ];
    const tiles: THREE.BufferGeometry[] = [];
    rings.forEach(([r0, r1, n], ri) => {
      for (let k = 0; k < n; k++) {
        const gap = r0 === 0 ? 0.04 : 0.018;
        const a0 = (k / n) * Math.PI * 2 + ri * 0.21 + gap;
        const len = (Math.PI * 2) / n - gap * 2;
        const g = new THREE.RingGeometry(Math.max(0.0, r0 + 0.02), r1 - 0.02, 3, 1, a0, len);
        const y = 0.006 + rand() * 0.018;
        const tone = new THREE.Color(STONE).multiplyScalar(0.82 + rand() * 0.3);
        // a few cracked, darker slabs
        if (rand() < 0.12) tone.multiplyScalar(0.72);
        tiles.push(tint(placed(g, new THREE.Vector3(0, y, 0), flat), tone, 0.05, ri * 40 + k));
      }
    });

    const glyphParts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const long = k % 3 === 0;
      const g = new THREE.PlaneGeometry(long ? 0.05 : 0.035, long ? 0.18 : 0.1);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -a));
      glyphParts.push(placed(g, new THREE.Vector3(Math.cos(a) * 2.39, 0.03, Math.sin(a) * 2.39), q));
    }

    return { stone: merge([base, step, ...tiles]), glyphs: merge(glyphParts) };
  }, []);

  useFrame((state, dt) => {
    if (hit.current.key !== hitKey) hit.current = { key: hitKey, t: 0 };
    hit.current.t += dt;
    const flash = hit.current.t < 0.8 ? 1 - hit.current.t / 0.8 : 0;
    const pulse = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.9) * 0.06;
    if (rune.current) rune.current.opacity = 0.32 + pulse + flash * 0.55;
    if (glyphs.current) glyphs.current.opacity = 0.42 + pulse + flash * 0.5;
  });

  return (
    <group>
      <mesh geometry={geo.stone} receiveShadow castShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.96} metalness={0} />
      </mesh>
      <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.36, 72]} />
        <meshBasicMaterial ref={rune} color="#c99460" transparent opacity={0.32} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.033, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.46, 2.48, 72]} />
        <meshBasicMaterial color="#8a5f38" transparent opacity={0.4} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh geometry={geo.glyphs}>
        <meshBasicMaterial ref={glyphs} color="#dda875" transparent opacity={0.42} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Ruined colonnade behind the dais, and a broken arch framing the boss. */
function Ruins() {
  const geo = useMemo(() => {
    const rand = seeded(29);
    const parts: THREE.BufferGeometry[] = [];
    const bronze: THREE.BufferGeometry[] = [];
    const q0 = new THREE.Quaternion();
    const drum = new THREE.CylinderGeometry(0.3, 0.32, 1, 8, 1);
    const block = new THREE.BoxGeometry(1, 1, 1);

    const pillar = (x: number, z: number, height: number, broken: boolean, seed: number) => {
      const r = seeded(seed);
      parts.push(tint(placed(block, new THREE.Vector3(x, -0.6, z), q0, new THREE.Vector3(0.92, 0.4, 0.92)), STONE_DARK, 0.06, seed));
      let y = -0.4;
      const drums = Math.max(1, Math.round(height / 0.9));
      for (let i = 0; i < drums; i++) {
        const h = height / drums;
        const lean = broken && i === drums - 1 ? 0.25 : (r() - 0.5) * 0.04;
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, r() * Math.PI, lean * 0.6));
        parts.push(tint(placed(drum, new THREE.Vector3(x + (r() - 0.5) * 0.04, y + h / 2, z), q, new THREE.Vector3(1, h, 1)), STONE, 0.1, seed + i));
        y += h;
      }
      if (!broken) {
        parts.push(tint(placed(block, new THREE.Vector3(x, y + 0.12, z), q0, new THREE.Vector3(0.86, 0.24, 0.86)), STONE, 0.06, seed + 9));
      }
      if (r() > 0.45) {
        bronze.push(
          tint(placed(new THREE.TorusGeometry(0.33, 0.035, 4, 12), new THREE.Vector3(x, -0.4 + height * 0.35, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), BRONZE, 0.08, seed),
        );
      }
    };

    // Colonnade on the back arc.
    const count = 7;
    for (let i = 0; i < count; i++) {
      const a = Math.PI + 0.32 + (i / (count - 1)) * (Math.PI - 0.64);
      const radius = 6.1 + rand() * 0.6;
      pillar(Math.cos(a) * radius, Math.sin(a) * radius, 1.4 + rand() * 2.4, rand() > 0.35, 100 + i * 7);
    }

    // The arch: two tall piers and a cracked lintel, one half fallen.
    pillar(-2.7, -6.4, 4.6, false, 300);
    pillar(2.7, -6.4, 3.6, true, 310);
    parts.push(
      tint(placed(block, new THREE.Vector3(-1.45, 4.42, -6.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.04)), new THREE.Vector3(3.1, 0.42, 0.7)), STONE, 0.05, 320),
      tint(placed(block, new THREE.Vector3(2.4, -0.55, -4.9), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0.6, 0.18)), new THREE.Vector3(1.6, 0.4, 0.66)), STONE_DARK, 0.06, 321),
    );
    // Fallen drums and rubble.
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.05 + rand() * 0.9);
      const radius = 5 + rand() * 2.2;
      const s = 0.18 + rand() * 0.35;
      parts.push(
        tint(
          placed(new THREE.DodecahedronGeometry(1, 0), new THREE.Vector3(Math.cos(a) * radius, -0.8 + s * 0.5, Math.sin(a) * radius), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand(), rand())), new THREE.Vector3(s, s * 0.7, s)),
          STONE_DARK,
          0.1,
          400 + i,
        ),
      );
    }
    parts.push(
      tint(placed(drum, new THREE.Vector3(-4.6, -0.52, -3.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.4, Math.PI / 2)), new THREE.Vector3(1, 1.3, 1)), STONE, 0.08, 500),
    );

    drum.dispose();
    block.dispose();
    return { stone: merge(parts), bronze: bronze.length ? merge(bronze) : null };
  }, []);

  return (
    <group>
      <mesh geometry={geo.stone} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>
      {geo.bronze && (
        <mesh geometry={geo.bronze}>
          <meshStandardMaterial vertexColors flatShading roughness={0.4} metalness={0.7} />
        </mesh>
      )}
    </group>
  );
}

/** Bronze tripod brazier with flickering coals. */
function Brazier({ position, seed, reducedMotion }: { position: [number, number, number]; seed: number; reducedMotion: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const flames = useRef<THREE.Group>(null);

  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const leg = new THREE.CylinderGeometry(0.025, 0.035, 0.95, 4);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a) * 0.32, 1, Math.sin(a) * 0.32).normalize();
      parts.push(tint(placed(leg, new THREE.Vector3(Math.cos(a) * 0.17, 0.45, Math.sin(a) * 0.17), quatFromUp(dir)), BRONZE, 0.06, seed + i));
    }
    parts.push(tint(placed(new THREE.CylinderGeometry(0.36, 0.2, 0.24, 8, 1, true), new THREE.Vector3(0, 0.98, 0), new THREE.Quaternion()), '#8e643f', 0.08, seed + 5));
    parts.push(tint(placed(new THREE.TorusGeometry(0.36, 0.03, 4, 8), new THREE.Vector3(0, 1.1, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), '#a87a4b', 0.05, seed + 6));
    leg.dispose();
    return merge(parts);
  }, [seed]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + seed;
    const flick = reducedMotion ? 0 : Math.sin(t * 9.3) * 0.25 + Math.sin(t * 15.7) * 0.15 + Math.sin(t * 3.1) * 0.2;
    if (light.current) light.current.intensity = 5.2 + flick * 2.2;
    if (flames.current && !reducedMotion) {
      flames.current.children.forEach((f, i) => {
        f.scale.y = 1 + Math.sin(t * (7 + i * 2.3)) * 0.22;
        f.rotation.y = t * (0.6 + i * 0.3);
      });
    }
  });

  return (
    <group position={position}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.45} metalness={0.65} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <dodecahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color="#2a120b" emissive="#ff6a2a" emissiveIntensity={1.6} flatShading toneMapped={false} />
      </mesh>
      <group ref={flames} position={[0, 1.12, 0]}>
        {[
          [0, 0.5, 0.15, '#ff8a3d'],
          [0.07, 0.36, 0.1, '#ffb45c'],
          [-0.07, 0.3, 0.09, '#ff6a2a'],
        ].map(([x, h, r, c], i) => (
          <mesh key={i} position={[x as number, (h as number) / 2, 0]}>
            <coneGeometry args={[r as number, h as number, 5]} />
            <meshBasicMaterial color={c as string} transparent opacity={0.82} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 1.5, 0]} color="#ff9450" intensity={5.2} distance={7} decay={2} />
    </group>
  );
}

/** Distant peaks, swallowed by fog: depth without detail. */
function Peaks() {
  const geo = useMemo(() => {
    const rand = seeded(61);
    const parts: THREE.BufferGeometry[] = [];
    const cone = new THREE.ConeGeometry(1, 1, 5, 1);
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (1.02 + (i / 13) * 0.96);
      const r = 22 + rand() * 8;
      const h = 4 + rand() * 7;
      parts.push(
        tint(placed(cone, new THREE.Vector3(Math.cos(a) * r, -0.8 + h / 2, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * 3, 0)), new THREE.Vector3(3 + rand() * 4, h, 3 + rand() * 4)), '#1a201c', 0.08, i),
      );
    }
    cone.dispose();
    return merge(parts);
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
}

export function ArenaStage({ hitKey, reducedMotion }: { hitKey: number; reducedMotion: boolean }) {
  return (
    <group>
      <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[40, 24]} />
        <meshStandardMaterial color="#121814" roughness={1} />
      </mesh>
      <Dais hitKey={hitKey} reducedMotion={reducedMotion} />
      <Ruins />
      <Peaks />
      <Brazier position={[-3.55, 0, 1.95]} seed={1} reducedMotion={reducedMotion} />
      <Brazier position={[3.55, 0, 1.95]} seed={4} reducedMotion={reducedMotion} />
    </group>
  );
}
