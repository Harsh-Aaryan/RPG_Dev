import { DoubleSide } from "three";

const CRACKS: Array<{ position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }> = [
  { position: [-1.1, 0.04, 0.2], rotation: [0, 0.35, 0], scale: [2.1, 0.025, 0.07] },
  { position: [0.7, 0.04, -0.55], rotation: [0, -0.8, 0], scale: [1.6, 0.025, 0.06] },
  { position: [1.35, 0.04, 1.05], rotation: [0, 1.05, 0], scale: [1.2, 0.02, 0.05] },
  { position: [-1.9, 0.04, -0.85], rotation: [0, 0.1, 0], scale: [1.35, 0.02, 0.05] },
];

const TEETH = [0, 1, 2, 3, 4, 5, 6, 7];

export function FloatingIsland() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.8, 0]}>
        <ringGeometry args={[7.2, 16, 8]} />
        <meshBasicMaterial color="#090c16" side={DoubleSide} />
      </mesh>
      <mesh position={[0, -1.55, 0]}>
        <coneGeometry args={[2.4, 1.15, 8]} />
        <meshStandardMaterial color="#121624" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, -0.62, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[5.15, 3.7, 1.15, 8]} />
        <meshStandardMaterial color="#171b2c" flatShading roughness={0.96} />
      </mesh>
      <mesh position={[0.08, -0.12, -0.06]} receiveShadow castShadow>
        <cylinderGeometry args={[4.55, 5.05, 0.22, 8]} />
        <meshStandardMaterial color="#2a314c" flatShading roughness={0.88} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[4.62, 8]} />
        <meshStandardMaterial color="#343c58" flatShading roughness={0.82} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <torusGeometry args={[4.7, 0.04, 4, 8]} />
        <meshStandardMaterial color="#49DBF2" emissive="#49DBF2" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {CRACKS.map((crack) => (
        <mesh key={crack.position.join(",")} position={crack.position} rotation={crack.rotation} scale={crack.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#49DBF2" emissive="#49DBF2" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}
      {TEETH.map((tooth) => {
        const angle = (tooth / TEETH.length) * Math.PI * 2 + 0.2;
        const radius = 4.85;
        return (
          <mesh key={tooth} position={[Math.cos(angle) * radius, -0.15, Math.sin(angle) * radius]} rotation={[0.15, -angle, 0]} castShadow>
            <coneGeometry args={[0.16, 0.55, 4]} />
            <meshStandardMaterial color="#1c2236" flatShading />
          </mesh>
        );
      })}
    </group>
  );
}
