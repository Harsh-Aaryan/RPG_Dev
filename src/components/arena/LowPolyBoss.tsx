import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SEVERITY_STYLE } from '../../lib/game-rules';
import type { Severity } from '../../lib/types';
import { frameAt, merge, placed, quatFromUp, seeded, smoothstep, taperedTube, tint } from './geometry';

type Props = {
  severity: Severity | null;
  form?: Severity | null;
  scale: number;
  hpRatio: number;
  hitKey: number; // increments on each verified hit
  defeated: boolean;
  reducedMotion: boolean;
};

/** One parameterised creature; severity decides its build. */
const BUILDS = {
  wyrm: { girth: 1, spines: 16, plates: 5, wings: true, horn: 1, ghost: false },
  golem: { girth: 1.22, spines: 11, plates: 8, wings: false, horn: 1.35, ghost: false },
  wisp: { girth: 0.78, spines: 6, plates: 2, wings: false, horn: 0.7, ghost: true },
} as const;

function buildFor(severity: Severity | null) {
  if (severity === 'high') return BUILDS.golem;
  if (severity === 'medium' || severity === 'low') return BUILDS.wisp;
  return BUILDS.wyrm;
}

// Tail coils across the front of the dais, loops behind, then rears up to face the party.
const SPINE = new THREE.CatmullRomCurve3(
  [
    [1.95, 0.12, 1.45],
    [0.95, 0.2, 2.0],
    [-0.5, 0.26, 1.88],
    [-1.62, 0.32, 1.02],
    [-1.78, 0.38, -0.2],
    [-1.02, 0.45, -1.02],
    [0.12, 0.55, -1.16],
    [0.32, 0.92, -0.82],
    [0.2, 1.62, -0.38],
    [0.08, 2.3, -0.06],
    [0.0, 2.84, 0.3],
    [0.0, 3.12, 0.78],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  false,
  'centripetal',
);

function bodyRadius(t: number): number {
  if (t < 0.5) return 0.035 + (t / 0.5) * 0.345;
  if (t < 0.68) return 0.38 + ((t - 0.5) / 0.18) * 0.14;
  return 0.52 - ((t - 0.68) / 0.32) * 0.17;
}

/** Dorsal side faces up along the coil and turns to face away from the camera as it rears. */
function dorsalAt(t: number): THREE.Vector3 {
  const k = smoothstep(0.46, 0.7, t);
  const n = smoothstep(0.86, 1, t);
  return new THREE.Vector3(0, 1 - k * 0.65 + n * 0.5, -k * 1 + n * 0.55);
}

const DORSAL = new THREE.Color('#2b3630');
const FLANK = new THREE.Color('#3c4841');
const BELLY = new THREE.Color('#7b6a4f');
const BRONZE = '#8e643f';
const BONE = '#c9bb9c';

export function LowPolyBoss({ severity, form, scale, hpRatio, hitKey, defeated, reducedMotion }: Props) {
  const build = buildFor(form === undefined ? severity : form);
  const accent = useMemo(() => new THREE.Color(severity ? SEVERITY_STYLE[severity].color : '#82a58a'), [severity]);

  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const eyeMat = useRef<THREE.MeshBasicMaterial>(null);
  const coreLight = useRef<THREE.PointLight>(null);
  const hit = useRef({ key: hitKey, t: 10 });

  const parts = useMemo(() => {
    const g = build.girth;
    const body = taperedTube(SPINE, {
      tubular: 72,
      radial: 7,
      radius: (t) => bodyRadius(t) * g,
      dorsal: dorsalAt,
      bellyScale: 0.82,
      jitter: 0.07,
      seed: 11,
      color: (t, around, r) => {
        const c = around > 0.45 ? DORSAL.clone() : around > -0.3 ? FLANK.clone() : BELLY.clone();
        const fade = 0.75 + smoothstep(0, 0.4, t) * 0.25;
        return c.multiplyScalar(fade * (0.92 + r * 0.16));
      },
    });

    // Dorsal spines, merged into one mesh.
    const rand = seeded(5);
    const spineCone = new THREE.ConeGeometry(1, 1, 4, 1);
    const spines: THREE.BufferGeometry[] = [];
    for (let i = 0; i < build.spines; i++) {
      const t = 0.12 + (i / Math.max(1, build.spines - 1)) * 0.78;
      const f = frameAt(SPINE, t, dorsalAt);
      const r = bodyRadius(t) * g;
      const dir = f.normal.clone().addScaledVector(f.tangent, -0.65).normalize();
      const h = (0.18 + r * 0.95) * (0.85 + rand() * 0.3);
      const pos = f.point.clone().addScaledVector(f.normal, r * 0.78).addScaledVector(dir, h * 0.42);
      spines.push(tint(placed(spineCone, pos, quatFromUp(dir), new THREE.Vector3(0.05 + r * 0.16, h, 0.05 + r * 0.16)), '#5f4630', 0.08, i));
    }
    spineCone.dispose();

    // Forged chest plates on the belly as it rears.
    const plateGeo = new THREE.OctahedronGeometry(1, 0);
    const plates: THREE.BufferGeometry[] = [];
    for (let i = 0; i < build.plates; i++) {
      const t = 0.55 + (i / Math.max(1, build.plates - 1)) * 0.27;
      const f = frameAt(SPINE, t, dorsalAt);
      const r = bodyRadius(t) * g;
      const out = f.normal.clone().negate();
      const pos = f.point.clone().addScaledVector(out, r * 0.86);
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.binormal, out, f.tangent));
      plates.push(tint(placed(plateGeo, pos, q, new THREE.Vector3(r * 0.85, 0.05, r * 0.42)), BRONZE, 0.1, i + 40));
    }
    plateGeo.dispose();

    const end = frameAt(SPINE, 1, dorsalAt);
    const core = frameAt(SPINE, 0.64, dorsalAt);
    const corePos = core.point.clone().addScaledVector(core.normal, -bodyRadius(0.64) * g * 0.98);
    const shoulder = frameAt(SPINE, 0.73, dorsalAt);

    return {
      body,
      spines: merge(spines),
      plates: plates.length ? merge(plates) : null,
      headPos: end.point,
      headQuat: new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(new THREE.Vector3(), end.tangent.clone().setY(end.tangent.y * 0.35).negate(), new THREE.Vector3(0, 1, 0)),
      ),
      corePos,
      shoulder: shoulder.point.clone().addScaledVector(shoulder.normal, bodyRadius(0.73) * g * 0.5),
    };
  }, [build]);

  const headParts = useMemo(() => buildHead(build.horn), [build]);
  const wingParts = useMemo(() => (build.wings ? buildWing() : null), [build]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (hit.current.key !== hitKey) hit.current = { key: hitKey, t: 0 };
    hit.current.t += dt;
    const h = hit.current.t;
    const recoil = reducedMotion ? 0 : h < 0.9 ? Math.sin(Math.min(1, h / 0.18) * Math.PI * 0.5) * Math.exp(-h * 4.2) : 0;
    const flash = h < 0.35 ? 1 - h / 0.35 : 0;
    const wounded = 1 - hpRatio;
    const idle = reducedMotion ? 0 : 1;

    if (root.current) {
      root.current.position.z = -recoil * 0.35;
      root.current.rotation.y = idle * Math.sin(t * 0.22) * 0.07;
    }
    if (torso.current) {
      const breath = Math.sin(t * (1.05 + wounded * 1.4)) * 0.014 * idle;
      torso.current.scale.set(1 + breath * 0.6, 1 + breath, 1 + breath * 0.6);
      torso.current.rotation.x = -recoil * 0.12;
    }
    if (head.current) {
      head.current.rotation.y = idle * Math.sin(t * 0.38) * 0.16;
      head.current.rotation.x = idle * Math.sin(t * 0.55) * 0.05 - recoil * 0.55 + wounded * 0.1;
    }
    if (jaw.current) {
      jaw.current.rotation.x = 0.08 + idle * Math.max(0, Math.sin(t * 0.7)) * 0.07 + recoil * 0.55;
    }
    // Each wing sits in a mirrored parent, so the same rotation reads symmetrically.
    wings.current.forEach((w, i) => {
      if (!w) return;
      const flap = idle * Math.sin(t * 0.85 + i * 0.4) * 0.07 + recoil * 0.45;
      w.rotation.z = 0.12 + flap;
      w.rotation.y = 0.22 - recoil * 0.2;
    });

    const glow = defeated ? 0 : 0.45 + hpRatio * 0.55;
    if (coreMat.current) {
      const flicker = wounded > 0.6 && !reducedMotion ? (Math.sin(t * 23) > 0.6 ? 0.55 : 1) : 1;
      coreMat.current.emissiveIntensity = (1.4 + Math.sin(t * 2.2) * 0.25 * idle) * glow * flicker + flash * 5;
      coreMat.current.emissive.copy(accent).lerp(WHITE_HOT, flash * 0.8);
    }
    if (coreLight.current) coreLight.current.intensity = (2.2 + Math.sin(t * 2.2) * 0.3 * idle) * glow + flash * 14;
    if (eyeMat.current) eyeMat.current.color.copy(EYE).lerp(WHITE_HOT, flash * 0.7).multiplyScalar(0.55 + glow * 0.45 + flash);
  });

  if (defeated) return null;

  const s = scale * 0.82;
  return (
    <group ref={root} scale={s}>
      <group ref={torso}>
        <mesh geometry={parts.body} castShadow receiveShadow>
          <meshStandardMaterial
            vertexColors
            flatShading
            roughness={0.62}
            metalness={0.18}
            transparent={build.ghost}
            opacity={build.ghost ? 0.82 : 1}
            emissive={build.ghost ? '#22332c' : '#000000'}
          />
        </mesh>
        <mesh geometry={parts.spines} castShadow>
          <meshStandardMaterial vertexColors flatShading roughness={0.55} metalness={0.45} />
        </mesh>
        {parts.plates && (
          <mesh geometry={parts.plates} castShadow>
            <meshStandardMaterial vertexColors flatShading roughness={0.38} metalness={0.7} />
          </mesh>
        )}

        {/* corrupted core */}
        <group position={parts.corePos}>
          <mesh scale={[1, 1.35, 1]}>
            <octahedronGeometry args={[0.15, 0]} />
            <meshStandardMaterial ref={coreMat} color="#160f0c" emissive={accent} emissiveIntensity={1.4} flatShading toneMapped={false} />
          </mesh>
          <pointLight ref={coreLight} color={accent} intensity={2.2} distance={4} decay={2} position={[0, 0, 0.35]} />
        </group>

        {/* wings */}
        {wingParts &&
          [1, -1].map((side, i) => (
            <group key={side} position={parts.shoulder} scale={[side, 1, 1]}>
              <group ref={(el) => (wings.current[i] = el)}>
                <mesh geometry={wingParts.membrane}>
                  <meshStandardMaterial color="#3b2e27" emissive="#1c0b06" emissiveIntensity={0.45} roughness={0.9} flatShading side={THREE.DoubleSide} />
                </mesh>
                <mesh geometry={wingParts.bones} castShadow>
                  <meshStandardMaterial vertexColors flatShading roughness={0.5} metalness={0.35} />
                </mesh>
              </group>
            </group>
          ))}

        {/* head */}
        <group position={parts.headPos} quaternion={parts.headQuat} scale={1.4}>
          <group ref={head}>
            <mesh geometry={headParts.skull} castShadow>
              <meshStandardMaterial
                vertexColors
                flatShading
                roughness={0.75}
                metalness={0.1}
                transparent={build.ghost}
                opacity={build.ghost ? 0.85 : 1}
                emissive={build.ghost ? '#22332c' : '#000000'}
              />
            </mesh>
            <mesh geometry={headParts.bone} castShadow>
              <meshStandardMaterial vertexColors flatShading roughness={0.6} />
            </mesh>
            <group ref={jaw} position={[0, -0.13, 0.04]}>
              <mesh geometry={headParts.jaw} castShadow>
                <meshStandardMaterial vertexColors flatShading roughness={0.75} transparent={build.ghost} opacity={build.ghost ? 0.85 : 1} />
              </mesh>
            </group>
            <mesh geometry={headParts.eyes}>
              <meshBasicMaterial ref={eyeMat} color={EYE} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

const EYE = new THREE.Color('#ff8a4f');
const WHITE_HOT = new THREE.Color('#fff1dc');

/** Low-poly skull facing +z: cranium, ridged snout, jaw, horns, teeth and ember eyes. */
function buildHead(horn: number) {
  const q0 = new THREE.Quaternion();
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  const cranium = tint(placed(new THREE.DodecahedronGeometry(0.34, 0), v(0, 0.05, -0.04), q0, v(1.05, 0.82, 1.15)), '#26302a', 0.1, 1);
  const snoutQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const snout = tint(placed(new THREE.CylinderGeometry(0.075, 0.25, 0.62, 4, 1), v(0, -0.02, 0.4), snoutQ, v(1, 1, 0.62)), '#222b25', 0.1, 2);
  const brow = [-1, 1].map((sd) =>
    tint(
      placed(new THREE.BoxGeometry(0.24, 0.06, 0.16), v(sd * 0.15, 0.15, 0.24), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, sd * -0.3, sd * 0.32))),
      '#323d35',
      0.06,
      3,
    ),
  );
  const frill = Array.from({ length: 5 }, (_, i) => {
    const a = (i - 2) * 0.32;
    const dir = v(Math.sin(a) * 0.6, 0.45, -1).normalize();
    return tint(placed(new THREE.ConeGeometry(0.045, 0.32, 4), v(Math.sin(a) * 0.22, 0.12 + Math.cos(a) * 0.08, -0.28).addScaledVector(dir, 0.12), quatFromUp(dir)), '#4a3826', 0.08, 10 + i);
  });
  const skull = merge([cranium, snout, ...brow, ...frill]);

  const jawQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const jaw = merge([tint(placed(new THREE.CylinderGeometry(0.06, 0.19, 0.5, 4, 1), v(0, -0.02, 0.32), jawQ, v(0.95, 1, 0.42)), '#1b221e', 0.08, 4)]);

  const hornGeos: THREE.BufferGeometry[] = [];
  for (const sd of [-1, 1]) {
    const big = new THREE.CatmullRomCurve3([v(sd * 0.18, 0.2, -0.06), v(sd * 0.42 * horn, 0.48 * horn, -0.48), v(sd * 0.5 * horn, 0.66 * horn, -0.92 * horn), v(sd * 0.44 * horn, 0.9 * horn, -1.12 * horn)]);
    hornGeos.push(
      taperedTube(big, { tubular: 9, radial: 5, radius: (t) => 0.085 * (1 - t * 0.9), seed: 21, color: (t, _a, r) => new THREE.Color('#8f8268').lerp(new THREE.Color(BONE), t).multiplyScalar(0.94 + r * 0.12) }),
    );
    const small = new THREE.CatmullRomCurve3([v(sd * 0.28, -0.02, -0.1), v(sd * 0.55, -0.04, -0.4), v(sd * 0.7, 0.04, -0.62)]);
    hornGeos.push(
      taperedTube(small, { tubular: 6, radial: 4, radius: (t) => 0.05 * (1 - t * 0.85), seed: 22, color: () => new THREE.Color('#a39477') }),
    );
    for (let k = 0; k < 3; k++) {
      hornGeos.push(
        tint(placed(new THREE.ConeGeometry(0.022, 0.09, 3), v(sd * (0.13 - k * 0.025), -0.12, 0.46 + k * 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0))), BONE, 0.05, 30 + k),
      );
    }
  }
  hornGeos.forEach((g) => g.deleteAttribute('uv'));
  const bone = merge(hornGeos);

  const eyeGeos = [-1, 1].map((sd) =>
    placed(new THREE.OctahedronGeometry(0.05, 0), v(sd * 0.165, 0.085, 0.29), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, sd * -0.35)), v(1.7, 0.55, 0.8)),
  );
  const eyes = merge(eyeGeos);
  return { skull, jaw, bone, eyes };
}

/** Tattered membrane wing in shoulder space (x outward, y up, z back toward −z). */
function buildWing() {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const S = v(0, 0, 0);
  const E = v(0.85, 0.6, -0.35);
  const W = v(1.6, 1.15, -0.6);
  const tips = [v(2.75, 1.65, -1.05), v(3.05, 0.75, -1.0), v(2.6, -0.15, -0.8), v(1.75, -0.55, -0.55)];
  const root = v(0.15, -0.75, -0.15);

  // Membrane: scalloped trailing edge between finger tips, fanned from the wrist.
  const rim: THREE.Vector3[] = [];
  tips.forEach((p, i) => {
    rim.push(p);
    const next = tips[i + 1] ?? root;
    rim.push(p.clone().lerp(next, 0.5).lerp(W, 0.24));
  });
  rim.push(root);
  const pos: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  tri(S, E, W);
  for (let i = 0; i < rim.length - 1; i++) tri(W, rim[i], rim[i + 1]);
  tri(S, W, root);
  const membrane = new THREE.BufferGeometry();
  membrane.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  membrane.computeVertexNormals();

  const boneColor = (t: number, _a: number, r: number) => new THREE.Color('#7a5a3c').lerp(new THREE.Color('#4f3a27'), t).multiplyScalar(0.92 + r * 0.16);
  const arm = taperedTube(new THREE.CatmullRomCurve3([S, E, W]), { tubular: 8, radial: 5, radius: (t) => 0.075 - t * 0.03, seed: 31, color: boneColor });
  const fingers = tips.map((p, i) =>
    taperedTube(new THREE.CatmullRomCurve3([W, W.clone().lerp(p, 0.5).add(v(0, 0.08, 0)), p]), { tubular: 6, radial: 4, radius: (t) => 0.04 * (1 - t * 0.75), seed: 40 + i, color: boneColor }),
  );
  const claw = tint(placed(new THREE.ConeGeometry(0.05, 0.22, 4), W.clone().add(v(0.02, 0.14, 0)), quatFromUp(v(0.2, 1, 0.1))), BONE, 0.05, 50);
  claw.deleteAttribute('uv');
  return { membrane, bones: merge([arm, ...fingers, claw]) };
}
