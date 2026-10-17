import { Html } from "@react-three/drei";

export function DamageEffect({ amount, nonce, reducedMotion }: { amount: number; nonce: number; reducedMotion: boolean }) {
  if (!nonce || amount <= 0) return null;
  return (
    <Html position={[0.2, 3.15, 0]} center sprite zIndexRange={[20, 0]}>
      <div key={nonce} className={reducedMotion ? "font-display text-2xl font-bold text-coral" : "damage-pop"} aria-hidden="true">
        −{amount} HP
      </div>
    </Html>
  );
}
