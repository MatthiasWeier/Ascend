"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HEAT_COLORS, MUSCLE_BLOBS, SKIN, type Blob } from "@/lib/body-model";
import type { Muscle } from "@prisma/client";

export type MuscleVisual = { muscle: Muscle; level: number; wish: number; injured: boolean };

export type BodyViewerHandle = {
  view: (side: "front" | "back") => void;
  setAutoRotate: (on: boolean) => void;
};

function expand<T extends Blob>(list: T[]): T[] {
  return list.flatMap((b) => (b.mirror ? [b, { ...b, pos: [-b.pos[0], b.pos[1], b.pos[2]] as Blob["pos"] }] : [b]));
}

// Self-built 3D mannequin (see lib/body-model.ts): drag to rotate, scroll or
// pinch to zoom, tap a muscle to select it. Each muscle is coloured by its
// training level; wished muscles glow blue, injured ones amber.
export const BodyViewer = forwardRef<
  BodyViewerHandle,
  {
    visuals: MuscleVisual[];
    selected: Muscle | null;
    onSelect: (muscle: Muscle | null) => void;
    onUnavailable: () => void;
    onInteract?: () => void;
    className?: string;
  }
>(function BodyViewer({ visuals, selected, onSelect, onUnavailable, onInteract, className }, ref) {
  const mountRef = useRef<HTMLDivElement>(null);
  const materialsRef = useRef<Map<Muscle, THREE.MeshStandardMaterial>>(new Map());
  const meshesRef = useRef<Map<Muscle, THREE.Mesh[]>>(new Map());
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const onSelectRef = useRef(onSelect);
  const onInteractRef = useRef(onInteract);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onInteractRef.current = onInteract;
  });

  useImperativeHandle(ref, () => ({
    view(side) {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const dist = camera.position.distanceTo(controls.target);
      controls.autoRotate = false;
      camera.position.set(0, controls.target.y + 0.1, side === "front" ? dist : -dist);
      controls.update();
    },
    setAutoRotate(on) {
      if (controlsRef.current) controlsRef.current.autoRotate = on;
    },
  }));

  // Scene setup / teardown.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 1.1, 4.2);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2, 3, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.6);
    fill.position.set(-2, 2, -4);
    scene.add(fill);

    const sphere = new THREE.SphereGeometry(1, 32, 20);
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0x33333b, roughness: 0.9, metalness: 0 });
    const body = new THREE.Group();
    const pickable: THREE.Object3D[] = [];
    const materials = materialsRef.current;
    const meshes = meshesRef.current;
    materials.clear();
    meshes.clear();

    for (const b of expand(SKIN)) {
      const mesh = new THREE.Mesh(sphere, skinMaterial);
      mesh.position.set(...b.pos);
      mesh.scale.set(...b.radii);
      body.add(mesh);
      pickable.push(mesh);
    }
    for (const b of expand(MUSCLE_BLOBS)) {
      let material = materials.get(b.muscle);
      if (!material) {
        material = new THREE.MeshStandardMaterial({ color: HEAT_COLORS[0], roughness: 0.55, metalness: 0.05 });
        materials.set(b.muscle, material);
      }
      const mesh = new THREE.Mesh(sphere, material);
      mesh.position.set(...b.pos);
      mesh.scale.set(...b.radii);
      mesh.userData.muscle = b.muscle;
      mesh.userData.base = new THREE.Vector3(...b.radii);
      body.add(mesh);
      pickable.push(mesh);
      meshes.set(b.muscle, [...(meshes.get(b.muscle) ?? []), mesh]);
    }
    scene.add(body);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.95, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.8;
    controls.maxDistance = 6;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.6;
    controls.update();
    controlsRef.current = controls;
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      onInteractRef.current?.();
    });

    function resize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    // Tap (not drag) selects the muscle under the finger.
    const raycaster = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(pickable, false)[0];
      onSelectRef.current((hit?.object.userData.muscle as Muscle | undefined) ?? null);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      controls.dispose();
      sphere.dispose();
      skinMaterial.dispose();
      materials.forEach((m) => m.dispose());
      materials.clear();
      meshes.clear();
      renderer.dispose();
      mount.removeChild(el);
      controlsRef.current = null;
      cameraRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Colours / glow / selection follow the data.
  useEffect(() => {
    for (const v of visuals) {
      const material = materialsRef.current.get(v.muscle);
      if (!material) continue;
      material.color.set(HEAT_COLORS[Math.min(4, Math.max(0, v.level - 1))]);
      if (v.injured) {
        material.emissive.set(0xf59e0b);
        material.emissiveIntensity = 0.55;
      } else if (v.wish > 0) {
        material.emissive.set(0x2563eb);
        material.emissiveIntensity = v.wish >= 2 ? 0.7 : 0.4;
      } else {
        material.emissive.set(0x000000);
        material.emissiveIntensity = 0;
      }
    }
  }, [visuals]);

  useEffect(() => {
    meshesRef.current.forEach((list, muscle) => {
      const grow = muscle === selected ? 1.12 : 1;
      for (const mesh of list) {
        const base = mesh.userData.base as THREE.Vector3;
        mesh.scale.set(base.x * grow, base.y * (muscle === selected ? 1.02 : 1), base.z * grow);
      }
    });
  }, [selected]);

  return <div ref={mountRef} className={className} />;
});
