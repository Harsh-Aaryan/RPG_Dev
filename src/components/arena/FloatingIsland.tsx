import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Low-poly floating plateau with glowing rim, circuit pillars and drifting rocks. */
export function FloatingIsland({ reducedMotion }: { reducedMotion: boolean }) {
  const rocks = useRef<THREE.Group>(null);
  const rim = useRef<THREE.MeshBasicMaterial>(null);

  const top = useMemo(() => {
    const g = new THREE.CylinderGeometry(4.2, 3.6, 0.6, 9, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) pos.setY(i, 0.3 + (seeded(i) - 0.5) * 0.08);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const pillars = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        return { a, h: 0.8 + seeded(i + 3) * 1.4, broken: seeded(i + 9) > 0.55 };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (rocks.current && !reducedMotion) {
      rocks.current.children.forEach((c, i) => {
        c.position.y = c.userData.y + Math.sin(t * 0.8 + i) * 0.15;
        c.rotation.x = t * 0.2 + i;
      });
    }
    if (rim.current) rim.current.opacity = 0.55 + Math.sin(t * 1.5) * 0.2;
  });

  return (
    <group>
      <mesh geometry={top} receiveShadow>
        <meshStandardMaterial color="#2a3150" flatShading roughness={0.95} />
      </mesh>
      {/* underside */}
      <mesh position={[0, -1.9, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[3.6, 3.4, 9, 1]} />
        <meshStandardMaterial color="#1b2036" flatShading />
      </mesh>
      {/* glowing rim */}
      <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.15, 0.04, 3, 9]} />
        <meshBasicMaterial ref={rim} color="#49dbf2" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      {/* summoning circle */}
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.9, 2.05, 6]} />
        <meshBasicMaterial color="#9c78ff" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.341, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
        <ringGeometry args={[1.2, 1.28, 3]} />
        <meshBasicMaterial color="#9c78ff" transparent opacity={0.35} toneMapped={false} />
      </mesh>
      {/* circuit pillars */}
      {pillars.map(({ a, h, broken }, i) => (
        <group key={i} position={[Math.cos(a) * 3.5, 0.3, Math.sin(a) * 3.5]} rotation={[0, -a, broken ? 0.15 : 0]}>
          <mesh position={[0, h / 2, 0]} castShadow>
            <boxGeometry args={[0.35, h, 0.35]} />
            <meshStandardMaterial color="#3a4166" flatShading />
          </mesh>
          <mesh position={[0, h + 0.15, 0]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshBasicMaterial color={i % 2 ? '#49dbf2' : '#61e6ac'} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* drifting rocks */}
      <group ref={rocks}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const r = 5.4 + seeded(i) * 1.2;
          const y = -0.6 + seeded(i + 20) * 1.8;
          return (
            <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]} userData={{ y }} scale={0.2 + seeded(i + 5) * 0.35}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#2a3150" flatShading />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
