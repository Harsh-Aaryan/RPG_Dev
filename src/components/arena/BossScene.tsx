import { ContactShadows, Float, OrbitControls, useProgress } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { PCFShadowMap } from "three";
import { AURA_COLOR, BOSS_NAME } from "../../lib/game-rules";
import type { BossType, Severity } from "../../lib/types";
import { ARENA_CHARACTERS, ARENA_PROPS, KENNEY } from "./assets";
import { DamageEffect } from "./DamageEffect";
import { FlatArena } from "./FlatArena";
import { FloatingIsland } from "./FloatingIsland";
import { KenneyModel } from "./KenneyModel";
import { LowPolyBoss } from "./LowPolyBoss";

export interface BossSceneProps {
  bossType: BossType;
  severity: Severity;
  sizeScale: number;
  defeated?: boolean;
  reducedMotion?: boolean;
  preview?: boolean;
  hit?: { amount: number; nonce: number } | null;
}

export function BossScene(props: BossSceneProps) {
  const webgl = useWebGL();
  if (webgl === false) {
    return <FlatArena bossName={BOSS_NAME[props.bossType]} severity={props.severity} />;
  }

  return (
    <ArenaErrorBoundary fallback={<FlatArena bossName={BOSS_NAME[props.bossType]} severity={props.severity} />}>
      <div className="relative h-full w-full">
        <Canvas
          shadows={{ type: PCFShadowMap }}
          dpr={[1, 1.6]}
          camera={{ position: props.preview ? [4.8, 3.55, 7.6] : [5.2, 3.7, 8.1], fov: 34, near: 0.1, far: 40 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1.18;
          }}
          aria-label={`${BOSS_NAME[props.bossType]} in a low-poly arena`}
        >
          <color attach="background" args={["#070910"]} />
          <fog attach="fog" args={["#070910", 9, 18]} />
          <Suspense fallback={null}>
            <ArenaContents {...props} />
          </Suspense>
        </Canvas>
        <ArenaLoader />
      </div>
    </ArenaErrorBoundary>
  );
}

function ArenaContents({ bossType, severity, sizeScale, defeated = false, reducedMotion = false, preview = false, hit = null }: BossSceneProps) {
  const aura = AURA_COLOR[severity];
  return (
    <>
      <AimCamera />
      <hemisphereLight args={["#9eb0d4", "#1a1020", 0.45]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[4.5, 8.5, 3.2]}
        intensity={2.1}
        color="#fff1dc"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={22}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-6, 3.2, -4]} intensity={1.15} color="#49DBF2" />
      <directionalLight position={[0, 2.2, 6]} intensity={0.35} color="#F0E6D2" />
      <pointLight position={[0, 1.7, 0.6]} intensity={6} color={aura} distance={7} decay={2} />
      <pointLight position={[-2.6, 0.8, 0.2]} intensity={1.4} color="#49DBF2" distance={5} decay={2} />
      <pointLight position={[2.5, 0.7, -1.4]} intensity={0.8} color="#FF6C79" distance={4} decay={2} />
      <FloatingIsland />
      <LowPolyBoss
        type={bossType}
        aura={aura}
        sizeScale={sizeScale}
        hitNonce={hit?.nonce ?? 0}
        defeated={defeated}
        reducedMotion={reducedMotion}
      />
      {ARENA_PROPS.map((prop) => (
        <KenneyModel
          key={`${prop.url}-${prop.position.join(",")}`}
          url={prop.url}
          position={prop.position}
          rotation={prop.rotation}
          targetHeight={prop.height}
        />
      ))}
      {ARENA_CHARACTERS.map((character) => (
        <KenneyModel
          key={character.url}
          url={character.url}
          position={character.position}
          rotation={character.rotation}
          targetHeight={character.height}
        />
      ))}
      <Float speed={reducedMotion ? 0 : 1.6} rotationIntensity={0.15} floatIntensity={reducedMotion ? 0 : 0.65}>
        <KenneyModel url={KENNEY.ghost} position={[-2.55, 0.85, -1.15]} rotation={[0, 0.9, 0]} targetHeight={0.95} />
      </Float>
      <ContactShadows opacity={0.45} scale={14} blur={2.4} far={4.5} color="#05060e" />
      <DamageEffect amount={hit?.amount ?? 0} nonce={hit?.nonce ?? 0} reducedMotion={reducedMotion} />
      <OrbitControls
        enablePan={false}
        autoRotate={preview && !reducedMotion}
        autoRotateSpeed={0.55}
        minPolarAngle={0.85}
        maxPolarAngle={1.35}
        minDistance={5.5}
        maxDistance={14}
        target={[0, 1.35, 0]}
      />
    </>
  );
}

function AimCamera() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.lookAt(0, 1.15, 0);
  }, [camera]);
  return null;
}

function ArenaLoader() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="rounded-full border border-cyan/40 bg-obsidian/95 px-4 py-2 text-sm text-sand">
        Loading low-poly arena {Math.round(progress)}%
      </div>
    </div>
  );
}

function useWebGL() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const supported = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
      setOk(supported);
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

class ArenaErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
