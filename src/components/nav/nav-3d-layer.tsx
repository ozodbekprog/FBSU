"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ComponentType, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import { nav3DIsSpinning, resolveNav3DIcon } from "./nav-3d-icons";
import { NAV3D_MATERIALS } from "./nav-3d-materials";
import { useMediaQuery, usePageVisible, useWebGLSupport } from "./nav-3d-env";

type Slot = {
  key: string;
  href: string;
  Icon: ComponentType;
  order: number;
  x: number;
  y: number;
  active: boolean;
  visible: boolean;
};

const ICON_SCALE = 9.4;
const ICON_SCALE_HOVER = 12.4;
const ICON_SCALE_ACTIVE = 10.6;
const INTRO_DURATION = 0.55;
const INTRO_STAGGER = 0.035;

function hashPhase(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100003;
  }
  return (hash / 100003) * Math.PI * 2;
}

function sameSlots(a: Slot[], b: Slot[]) {
  if (a.length !== b.length) return false;
  return a.every((slot, i) => {
    const other = b[i];
    return (
      slot.key === other.key &&
      Math.abs(slot.x - other.x) < 0.5 &&
      Math.abs(slot.y - other.y) < 0.5 &&
      slot.active === other.active &&
      slot.visible === other.visible
    );
  });
}

function Nav3DItem({
  slot,
  hovered,
  reduced,
  centerX,
  centerY,
}: {
  slot: Slot;
  hovered: boolean;
  reduced: boolean;
  centerX: number;
  centerY: number;
}) {
  const anchor = useRef<THREE.Group>(null);
  const anim = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const { Icon } = slot;
  const spinning = nav3DIsSpinning(slot.href);
  const phase = useMemo(() => hashPhase(slot.key), [slot.key]);

  useFrame((state) => {
    const base = anchor.current;
    const node = anim.current;
    if (!base || !node) return;
    const time = state.clock.elapsedTime;
    if (born.current === null) born.current = time + slot.order * INTRO_STAGGER;
    const intro = reduced ? 1 : Math.min(Math.max((time - born.current) / INTRO_DURATION, 0), 1);
    const eased = 1 - (1 - intro) ** 3;

    base.position.x += (slot.x - centerX - base.position.x) * 0.3;
    base.position.y += (centerY - slot.y - base.position.y) * 0.3;
    base.position.z = hovered ? 14 : 0;

    const wanted =
      (hovered ? ICON_SCALE_HOVER : slot.active ? ICON_SCALE_ACTIVE : ICON_SCALE) *
      (slot.visible ? 1 : 0);
    const current = node.scale.x / ICON_SCALE;
    node.scale.setScalar(
      ICON_SCALE * (current + (wanted / ICON_SCALE - current) * 0.14) * eased,
    );

    if (reduced) {
      node.rotation.set(0, 0, 0);
      node.position.set(0, 0, 0);
      return;
    }

    const strength = eased * (hovered ? 1 : slot.active ? 0.85 : 1);
    node.position.set(
      Math.cos(time * 0.9 + phase) * 1.1 * strength,
      Math.sin(time * 1.5 + phase) * 2.2 * strength,
      0,
    );
    node.rotation.x = Math.cos(time * 0.85 + phase) * 0.2 * strength;
    node.rotation.y =
      Math.sin(time * 1.15 + phase) * (hovered ? 0.95 : slot.active ? 0.6 : 0.46) * strength;
    node.rotation.z = spinning ? time * 0.95 + phase : Math.sin(time * 0.55 + phase) * 0.08;
  });

  return (
    <group ref={anchor} position={[slot.x - centerX, centerY - slot.y, 0]}>
      <group ref={anim} scale={0.0001}>
        <Icon />
        {slot.active ? (
          <mesh position={[0, 0, -1]} material={NAV3D_MATERIALS.halo}>
            <circleGeometry args={[1.7, 32]} />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}

function Scene({
  slots,
  hovered,
  reduced,
}: {
  slots: Slot[];
  hovered: string | null;
  reduced: boolean;
}) {
  const size = useThree((state) => state.size);
  const centerX = size.width / 2;
  const centerY = size.height / 2;

  return (
    <>
      <ambientLight intensity={1.35} />
      <hemisphereLight args={["#e8f0ff", "#16254a", 1.25]} />
      <directionalLight position={[-5, 7, 14]} intensity={2.6} color="#ffffff" />
      <directionalLight position={[8, -3, 10]} intensity={1.35} color="#b6c7e8" />
      <directionalLight position={[-2, -6, 9]} intensity={0.7} color="#8fa8d8" />
      <directionalLight position={[0, 5, -6]} intensity={0.9} color="#f0d684" />
      {slots.map((slot) => (
        <Nav3DItem
          key={slot.key}
          slot={slot}
          hovered={hovered === slot.key}
          reduced={reduced}
          centerX={centerX}
          centerY={centerY}
        />
      ))}
    </>
  );
}

export function Nav3DLayer({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const supported = useWebGLSupport();
  const desktop = useMediaQuery("(min-width: 768px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const pageVisible = usePageVisible();
  const keyRef = useRef<string | null>(null);

  const measure = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const next: Slot[] = [];
    root.querySelectorAll<HTMLElement>("[data-nav3d-href]").forEach((node) => {
      const href = node.dataset.nav3dHref ?? "";
      const Icon = resolveNav3DIcon(href);
      if (!Icon) return;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      next.push({
        key: `${href}::${node.dataset.nav3dKey ?? ""}`,
        href,
        Icon,
        order: next.length,
        x: rect.left - rootRect.left + rect.width / 2,
        y: rect.top - rootRect.top + rect.height / 2,
        active: node.dataset.nav3dActive === "true",
        visible: rect.bottom > rootRect.top - 32 && rect.top < rootRect.bottom + 32,
      });
    });
    setSlots((prev) => (sameSlots(prev, next) ? prev : next));
  }, [containerRef]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    root.querySelectorAll<HTMLElement>("[data-nav3d-href]").forEach((node) => observer.observe(node));

    const mutations = new MutationObserver(() => measure());
    mutations.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-nav3d-active", "data-nav3d-key", "aria-current"],
    });

    const onPointerOver = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const node = target.closest<HTMLElement>("[data-nav3d-href]");
      const key = node?.dataset.nav3dKey;
      if (key !== keyRef.current) {
        keyRef.current = key ?? null;
        setHovered(key ? `${node?.dataset.nav3dHref ?? ""}::${key}` : null);
      }
    };

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    root.addEventListener("pointerover", onPointerOver);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      root.removeEventListener("pointerover", onPointerOver);
    };
  }, [containerRef, measure]);

  if (!supported || !desktop) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      <Canvas
        orthographic
        dpr={[1, 1.5]}
        frameloop={reduced || !pageVisible ? "demand" : "always"}
        camera={{ position: [0, 0, 60], zoom: 1, near: 0.1, far: 400 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power", stencil: false }}
        onCreated={({ gl }) => gl.setClearAlpha(0)}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <Scene slots={slots} hovered={hovered} reduced={reduced} />
      </Canvas>
    </div>
  );
}