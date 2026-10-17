import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import { Box3, Group, Mesh, Vector3 } from "three";
import { KENNEY } from "./assets";

interface KenneyModelProps {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  targetHeight?: number;
}

export function KenneyModel({ url, position, rotation = [0, 0, 0], targetHeight = 1 }: KenneyModelProps) {
  const { scene } = useGLTF(url);
  const ref = useRef<Group>(null);

  useLayoutEffect(() => {
    const parent = ref.current;
    if (!parent) return;
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const size = new Box3().setFromObject(clone).getSize(new Vector3());
    clone.scale.multiplyScalar(targetHeight / Math.max(size.y, 0.001));
    const fitted = new Box3().setFromObject(clone);
    const center = fitted.getCenter(new Vector3());
    clone.position.set(-center.x, -fitted.min.y, -center.z);
    parent.add(clone);
    return () => {
      parent.remove(clone);
    };
  }, [scene, targetHeight]);

  return <group ref={ref} position={position} rotation={rotation} />;
}

Object.values(KENNEY).forEach((url) => {
  useGLTF.preload(url);
});
