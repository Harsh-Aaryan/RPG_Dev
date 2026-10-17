import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Deterministic PRNG so every render of the arena carves the same stone. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type TubeOptions = {
  tubular: number;
  radial: number;
  radius: (t: number) => number;
  /** Direction the dorsal side (theta = 0) should face at t. */
  dorsal?: (t: number) => THREE.Vector3;
  /** Multiplier applied to the ventral half of the cross-section. */
  bellyScale?: number;
  jitter?: number;
  seed?: number;
  /** Per-face colour. `around` is +1 on the dorsal ridge, −1 on the belly. */
  color: (t: number, around: number, rand: number) => THREE.Color;
};

export type Frame = { point: THREE.Vector3; tangent: THREE.Vector3; normal: THREE.Vector3; binormal: THREE.Vector3 };

/** Frame along the curve whose normal tracks the requested dorsal direction. */
export function frameAt(curve: THREE.Curve<THREE.Vector3>, t: number, dorsal: (t: number) => THREE.Vector3): Frame {
  const point = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t).normalize();
  const want = dorsal(t).clone().normalize();
  const normal = want.sub(tangent.clone().multiplyScalar(want.dot(tangent))).normalize();
  if (normal.lengthSq() < 1e-6) normal.set(0, 0, -1);
  const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
  return { point, tangent, normal, binormal };
}

/**
 * A tube whose radius varies along its length, flat-coloured per face.
 * Returned non-indexed so each facet keeps one tone (the low-poly look).
 */
export function taperedTube(curve: THREE.Curve<THREE.Vector3>, o: TubeOptions): THREE.BufferGeometry {
  const dorsal = o.dorsal ?? (() => new THREE.Vector3(0, 1, 0));
  const rand = seeded(o.seed ?? 7);
  const jitter = Array.from({ length: (o.tubular + 1) * o.radial }, () => (rand() - 0.5) * 2 * (o.jitter ?? 0));
  const positions: number[] = [];
  const meta: [number, number][] = [];

  for (let i = 0; i <= o.tubular; i++) {
    const t = i / o.tubular;
    const f = frameAt(curve, t, dorsal);
    const r = o.radius(t);
    for (let j = 0; j <= o.radial; j++) {
      const theta = (j / o.radial) * Math.PI * 2;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const k = 1 + jitter[i * o.radial + (j % o.radial)];
      const n = c < 0 ? c * (o.bellyScale ?? 1) : c;
      const p = f.point
        .clone()
        .addScaledVector(f.normal, n * r * k)
        .addScaledVector(f.binormal, s * r * k);
      positions.push(p.x, p.y, p.z);
      meta.push([t, c]);
    }
  }

  const indices: number[] = [];
  const row = o.radial + 1;
  for (let i = 0; i < o.tubular; i++) {
    for (let j = 0; j < o.radial; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      // Counter-clockwise seen from outside, so face normals point away from the spine.
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('meta', new THREE.Float32BufferAttribute(meta.flat(), 2));
  g.setIndex(indices);
  const flat = g.toNonIndexed();
  g.dispose();

  const m = flat.getAttribute('meta');
  const colors = new Float32Array(m.count * 3);
  for (let v = 0; v < m.count; v += 3) {
    const t = (m.getX(v) + m.getX(v + 1) + m.getX(v + 2)) / 3;
    const around = (m.getY(v) + m.getY(v + 1) + m.getY(v + 2)) / 3;
    const col = o.color(t, around, rand());
    for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (v + k) * 3);
  }
  flat.deleteAttribute('meta');
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  flat.computeVertexNormals();
  return flat;
}

/** Bake a transform into a clone of `g` so many parts can share one draw call. */
export function placed(g: THREE.BufferGeometry, pos: THREE.Vector3, quat: THREE.Quaternion, scale = new THREE.Vector3(1, 1, 1)) {
  const m = new THREE.Matrix4().compose(pos, quat, scale);
  const out = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
  out.deleteAttribute('uv');
  return out;
}

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!merged) throw new Error('Could not merge arena geometry');
  merged.computeVertexNormals();
  return merged;
}

/** Paint every vertex of a (non-indexed) geometry one colour, face by face with slight variation. */
export function tint(g: THREE.BufferGeometry, base: THREE.ColorRepresentation, vary = 0.06, seed = 3) {
  const rand = seeded(seed);
  const c = new THREE.Color(base);
  const n = g.getAttribute('position').count;
  const colors = new Float32Array(n * 3);
  for (let v = 0; v < n; v += 3) {
    const k = 1 + (rand() - 0.5) * 2 * vary;
    for (let i = 0; i < 3; i++) colors.set([c.r * k, c.g * k, c.b * k], (v + i) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

const UP = new THREE.Vector3(0, 1, 0);
export const quatFromUp = (dir: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());

/** Soft round sprite used by embers, sparks and smoke. */
export function softDotTexture(size = 64, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)'): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.55)'));
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
