import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group, MeshStandardMaterial } from "three";
import type { BossType } from "../../lib/types";

interface LowPolyBossProps {
  type: BossType;
  aura: string;
  sizeScale: number;
  hitNonce: number;
  defeated: boolean;
  reducedMotion: boolean;
}

interface Shard {
  offset: [number, number, number];
  velocity: [number, number, number];
  spin: number;
  kind: number;
}

export function LowPolyBoss({ type, aura, sizeScale, hitNonce, defeated, reducedMotion }: LowPolyBossProps) {
  const ref = useRef<Group>(null);
  const recoil = useRef(0);

  useEffect(() => {
    if (hitNonce > 0) recoil.current = 1;
  }, [hitNonce]);

  useFrame((state, delta) => {
    const group = ref.current;
    if (!group) return;
    const time = state.clock.elapsedTime;
    recoil.current = Math.max(0, recoil.current - delta * 2.4);
    const bob = reducedMotion || defeated ? 0 : Math.sin(time * 1.5) * 0.12;
    group.position.y = 1.7 + bob;
    if (defeated) return;
    group.rotation.y = reducedMotion ? 0.35 : time * 0.28;
    group.position.z = recoil.current * 0.45;
    group.rotation.x = recoil.current * 0.28;
  });

  return (
    <group ref={ref} scale={sizeScale * 1.15} position={[0, 1.7, 0]}>
      {defeated ? <Shatter aura={aura} /> : <BossBody type={type} aura={aura} reducedMotion={reducedMotion} />}
    </group>
  );
}

function BossBody({ type, aura, reducedMotion }: { type: BossType; aura: string; reducedMotion: boolean }) {
  if (type === "cipher-golem") return <CipherGolem aura={aura} reducedMotion={reducedMotion} />;
  if (type === "null-wisp") return <NullWisp aura={aura} reducedMotion={reducedMotion} />;
  return <RootkitWyrm aura={aura} reducedMotion={reducedMotion} />;
}

function RootkitWyrm({ aura, reducedMotion }: { aura: string; reducedMotion: boolean }) {
  const core = useRef<MeshStandardMaterial>(null);
  useFrame((state) => {
    if (!core.current || reducedMotion) return;
    core.current.emissiveIntensity = 1.15 + Math.sin(state.clock.elapsedTime * 3.2) * 0.35;
  });

  return (
    <group>
      <mesh position={[0, 0.05, 0.05]} scale={[0.78, 0.62, 1.05]} castShadow>
        <icosahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial color="#3a1824" flatShading roughness={0.48} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.22, 0.42]}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial ref={core} color={aura} emissive={aura} emissiveIntensity={2.4} toneMapped={false} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0.72]} rotation={[0.7, 0, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 0.42, 5]} />
        <meshStandardMaterial color="#4a2030" flatShading />
      </mesh>
      <mesh position={[0, 0.72, 1.05]} castShadow>
        <octahedronGeometry args={[0.36, 0]} />
        <meshStandardMaterial color="#541828" flatShading roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 1.22]} rotation={[0.5, 0, 0]} castShadow>
        <coneGeometry args={[0.14, 0.46, 4]} />
        <meshStandardMaterial color="#2a1018" flatShading />
      </mesh>
      <mesh position={[-0.22, 1.05, 1.02]} rotation={[0.35, 0, 0.45]} castShadow>
        <coneGeometry args={[0.1, 0.72, 4]} />
        <meshStandardMaterial color="#14080c" flatShading />
      </mesh>
      <mesh position={[0.22, 1.05, 1.02]} rotation={[0.35, 0, -0.45]} castShadow>
        <coneGeometry args={[0.1, 0.72, 4]} />
        <meshStandardMaterial color="#14080c" flatShading />
      </mesh>
      <mesh position={[-0.85, 0.42, 0.05]} rotation={[0.5, 0.4, 0.85]} castShadow>
        <coneGeometry args={[0.38, 1.2, 3]} />
        <meshStandardMaterial color="#4a1522" flatShading roughness={0.55} />
      </mesh>
      <mesh position={[0.85, 0.42, 0.05]} rotation={[0.5, -0.4, -0.85]} castShadow>
        <coneGeometry args={[0.38, 1.2, 3]} />
        <meshStandardMaterial color="#4a1522" flatShading roughness={0.55} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh key={index} position={[0, 0.02 - index * 0.08, -0.55 - index * 0.22]} scale={0.9 - index * 0.18} castShadow>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color="#541f2e" flatShading />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map((spike) => (
        <mesh key={spike} position={[0, 0.55, -0.15 + spike * 0.18]} rotation={[0.2, 0, 0]} castShadow>
          <coneGeometry args={[0.07, 0.32, 4]} />
          <meshStandardMaterial color="#ff6c79" emissive={aura} emissiveIntensity={0.45} flatShading />
        </mesh>
      ))}
      <Aura aura={aura} />
    </group>
  );
}

function CipherGolem({ aura, reducedMotion }: { aura: string; reducedMotion: boolean }) {
  const plates = useRef<Group>(null);
  useFrame((state) => {
    if (!plates.current || reducedMotion) return;
    plates.current.rotation.y = state.clock.elapsedTime * 0.7;
  });

  return (
    <group>
      <mesh position={[0, -0.15, 0]} castShadow>
        <boxGeometry args={[1.15, 0.85, 0.72]} />
        <meshStandardMaterial color="#2c3148" flatShading roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.72, 0.62, 0.62]} />
        <meshStandardMaterial color="#3a3358" flatShading roughness={0.55} />
      </mesh>
      <mesh position={[-0.78, 0.15, 0]} castShadow>
        <boxGeometry args={[0.28, 0.7, 0.28]} />
        <meshStandardMaterial color="#232941" flatShading />
      </mesh>
      <mesh position={[0.78, 0.15, 0]} castShadow>
        <boxGeometry args={[0.28, 0.7, 0.28]} />
        <meshStandardMaterial color="#232941" flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <coneGeometry args={[0.18, 0.42, 4]} />
        <meshStandardMaterial color="#1a1024" flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0.34]}>
        <boxGeometry args={[0.22, 0.14, 0.06]} />
        <meshStandardMaterial color={aura} emissive={aura} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <group ref={plates}>
        {[0, 1, 2, 3].map((plate) => (
          <mesh key={plate} position={[Math.cos(plate * 1.57) * 1.15, 0.35, Math.sin(plate * 1.57) * 1.15]}>
            <boxGeometry args={[0.34, 0.5, 0.06]} />
            <meshStandardMaterial color="#9C78FF" emissive={aura} emissiveIntensity={0.55} flatShading />
          </mesh>
        ))}
      </group>
      <Aura aura={aura} />
    </group>
  );
}

function NullWisp({ aura, reducedMotion }: { aura: string; reducedMotion: boolean }) {
  const shards = useRef<Group>(null);
  useFrame((state) => {
    if (!shards.current || reducedMotion) return;
    shards.current.rotation.y = state.clock.elapsedTime * 0.9;
    shards.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7) * 0.15;
  });

  return (
    <group>
      <mesh castShadow>
        <icosahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial color="#6d5cff" emissive="#24184a" emissiveIntensity={0.4} flatShading roughness={0.35} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={aura} emissive={aura} emissiveIntensity={1.5} flatShading />
      </mesh>
      <group ref={shards}>
        {[0, 1, 2, 3, 4].map((shard) => (
          <mesh key={shard} position={[Math.cos((shard / 5) * Math.PI * 2) * 1.05, Math.sin(shard) * 0.18, Math.sin((shard / 5) * Math.PI * 2) * 1.05]}>
            <octahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial color="#49DBF2" emissive="#49DBF2" emissiveIntensity={0.8} flatShading />
          </mesh>
        ))}
      </group>
      <Aura aura={aura} />
    </group>
  );
}

function Aura({ aura }: { aura: string }) {
  const ring = useRef<Group>(null);
  useFrame((state) => {
    if (!ring.current) return;
    ring.current.rotation.y = state.clock.elapsedTime * 0.35;
  });
  return (
    <group ref={ring} position={[0, -1.15, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.018, 4, 6]} />
        <meshBasicMaterial color={aura} transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Shatter({ aura }: { aura: string }) {
  const ref = useRef<Group>(null);
  const shards = useMemo<Shard[]>(
    () =>
      Array.from({ length: 16 }, (_, index) => ({
        offset: [(Math.random() - 0.5) * 0.8, Math.random() * 0.8, (Math.random() - 0.5) * 0.8],
        velocity: [(Math.random() - 0.5) * 2.2, 1.1 + Math.random() * 1.4, (Math.random() - 0.5) * 2.2],
        spin: Math.random() * 2,
        kind: index % 3,
      })),
    [],
  );

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    group.children.forEach((child, index) => {
      const shard = shards[index];
      shard.velocity[1] -= delta * 2.4;
      child.position.x += shard.velocity[0] * delta;
      child.position.y += shard.velocity[1] * delta;
      child.position.z += shard.velocity[2] * delta;
      child.rotation.x += delta * shard.spin;
      child.rotation.y += delta * shard.spin;
    });
  });

  return (
    <group ref={ref}>
      {shards.map((shard, index) => (
        <mesh key={index} position={shard.offset} castShadow>
          {shard.kind === 0 ? <octahedronGeometry args={[0.16, 0]} /> : null}
          {shard.kind === 1 ? <icosahedronGeometry args={[0.14, 0]} /> : null}
          {shard.kind === 2 ? <coneGeometry args={[0.1, 0.28, 4]} /> : null}
          <meshStandardMaterial color={index % 2 ? aura : "#f0e6d2"} emissive={aura} emissiveIntensity={0.4} flatShading />
        </mesh>
      ))}
    </group>
  );
}
