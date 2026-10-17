import { useFrame } from '@react-three/fiber';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/** Floating "−250 HP" numbers and a brief arena flash, rendered over the canvas. */
export function DamageOverlay({ hits }: { hits: { id: string; damage: number }[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-live="polite">
      <AnimatePresence>
        {hits.map((h) => (
          <motion.div
            key={`flash-${h.id}`}
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0.45 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          />
        ))}
        {hits.map((h) => (
          <motion.div
            key={h.id}
            className="absolute left-1/2 top-[38%] -translate-x-1/2 font-display text-5xl font-bold text-coral drop-shadow-[0_0_18px_rgba(255,108,121,0.8)] sm:text-6xl"
            initial={{ opacity: 0, y: 20, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -90, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          >
            −{h.damage} HP
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Boss shatters into flat-shaded fragments that tumble off the island. */
export function ShatterEffect({ color, scale }: { color: string; scale: number }) {
  const group = useRef<THREE.Group>(null);
  const pieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => {
        const dir = new THREE.Vector3(Math.sin(i * 2.4), Math.cos(i * 1.7) * 0.6 + 0.8, Math.cos(i * 2.4)).normalize();
        return {
          pos: new THREE.Vector3(0, 1.35 * scale, 0).addScaledVector(dir, 0.4 * scale),
          vel: dir.multiplyScalar(2 + (i % 5) * 0.6),
          spin: new THREE.Vector3((i % 3) - 1, (i % 4) - 1.5, (i % 2) - 0.5),
          size: 0.12 + (i % 4) * 0.06,
          tint: i % 3 === 0 ? color : i % 3 === 1 ? '#4a4f7a' : '#f0e6d2',
        };
      }),
    [color, scale],
  );
  const age = useRef(0);

  useFrame((_, dt) => {
    age.current += dt;
    group.current?.children.forEach((c, i) => {
      const p = pieces[i];
      if (age.current > 4) return;
      p.vel.y -= 4.5 * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.4 && Math.hypot(p.pos.x, p.pos.z) < 4) {
        p.pos.y = 0.4;
        p.vel.multiplyScalar(0.4);
        p.vel.y = Math.abs(p.vel.y) * 0.3;
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
          <meshStandardMaterial color={p.tint} emissive={p.tint === color ? color : '#000'} emissiveIntensity={0.6} flatShading />
        </mesh>
      ))}
    </group>
  );
}
