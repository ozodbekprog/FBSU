"use client";

import { RoundedBox } from "@react-three/drei";
import type { ComponentType } from "react";
import { useMemo } from "react";
import {
  NAV3D_MATERIALS,
  nav3DCircle,
  nav3DGeometry,
  nav3DPolygon,
  type Nav3DMaterialKey,
  type Nav3DPart,
} from "./nav-3d-materials";

const PI = Math.PI;

function Cube({ a, m = "brand", p, r }: Nav3DPart & { a: [number, number, number] }) {
  return (
    <mesh position={p} rotation={r} material={NAV3D_MATERIALS[m]}>
      <boxGeometry args={a} />
    </mesh>
  );
}

function Tile({
  a,
  radius = 0.09,
  m = "brand",
  p,
  r,
}: Nav3DPart & { a: [number, number, number]; radius?: number }) {
  const safe = Math.min(radius, Math.min(a[0], a[1], a[2]) / 2 - 0.001);
  return (
    <RoundedBox
      args={a}
      radius={Math.max(safe, 0.001)}
      smoothness={3}
      position={p}
      rotation={r}
      material={NAV3D_MATERIALS[m]}
    />
  );
}

function Cyl({
  rt,
  rb,
  h = 0.4,
  seg = 28,
  m = "brand",
  p,
  r,
}: Nav3DPart & { rt: number; rb?: number; h?: number; seg?: number }) {
  return (
    <mesh position={p} rotation={r} material={NAV3D_MATERIALS[m]}>
      <cylinderGeometry args={[rt, rb ?? rt, h, seg]} />
    </mesh>
  );
}

function Ball({ rad = 0.3, m = "brand", p }: Nav3DPart & { rad?: number }) {
  return (
    <mesh position={p} material={NAV3D_MATERIALS[m]}>
      <sphereGeometry args={[rad, 24, 16]} />
    </mesh>
  );
}

function Ring({
  rad = 0.6,
  tube = 0.12,
  arc = PI * 2,
  m = "brand",
  p,
  r,
}: Nav3DPart & { rad?: number; tube?: number; arc?: number }) {
  return (
    <mesh position={p} rotation={r} material={NAV3D_MATERIALS[m]}>
      <torusGeometry args={[rad, tube, 12, 44, arc]} />
    </mesh>
  );
}

function Gear({ m = "gold" }: { m?: Nav3DMaterialKey }) {
  const geometry = useMemo(() => {
    const teeth = 8;
    const outer = 0.98;
    const inner = 0.74;
    const step = (PI * 2) / teeth;
    const points: [number, number][] = [];
    for (let i = 0; i < teeth; i += 1) {
      const a = i * step;
      points.push([Math.cos(a) * inner, Math.sin(a) * inner]);
      points.push([Math.cos(a + step * 0.14) * outer, Math.sin(a + step * 0.14) * outer]);
      points.push([Math.cos(a + step * 0.44) * outer, Math.sin(a + step * 0.44) * outer]);
      points.push([Math.cos(a + step * 0.58) * inner, Math.sin(a + step * 0.58) * inner]);
    }
    return nav3DGeometry(() => nav3DPolygon(points, [nav3DCircle(0.3, 26)]), 0.34, 0.055);
  }, []);
  return (
    <mesh geometry={geometry} position={[0, 0, -0.17]} material={NAV3D_MATERIALS[m]} />
  );
}

function Shield({ m = "brand" }: { m?: Nav3DMaterialKey }) {
  const geometry = useMemo(
    () =>
      nav3DGeometry(
        () =>
          nav3DPolygon([
            [-0.82, 0.86],
            [0.82, 0.86],
            [0.82, -0.08],
            [0, -0.98],
            [-0.82, -0.08],
          ]),
        0.3,
        0.07,
      ),
    [],
  );
  return (
    <mesh geometry={geometry} position={[0, 0, -0.15]} material={NAV3D_MATERIALS[m]} />
  );
}

function Gauge() {
  return (
    <group>
      <Ring rad={0.78} tube={0.15} arc={PI} m="brand" r={[0, 0, 0]} />
      <Cube a={[0.1, 0.26, 0.12]} m="goldLight" p={[0, 0.72, 0.04]} />
      <Cube a={[0.1, 0.26, 0.12]} m="goldLight" p={[0.66, 0.38, 0.04]} r={[0, 0, -0.66]} />
      <Cube a={[0.1, 0.26, 0.12]} m="goldLight" p={[-0.66, 0.38, 0.04]} r={[0, 0, 0.66]} />
      <Cube a={[0.09, 0.62, 0.09]} m="gold" p={[-0.18, 0.28, 0.16]} r={[0, 0, 0.62]} />
      <Cyl rt={0.17} h={0.3} m="paper" p={[0, 0, 0.14]} r={[PI / 2, 0, 0]} />
      <Cube a={[1.7, 0.12, 0.42]} m="brandDeep" p={[0, -0.12, -0.14]} />
    </group>
  );
}

function Courses() {
  return (
    <group>
      <Tile a={[1.66, 0.26, 1.06]} m="brand" p={[0.06, 0.44, 0.02]} radius={0.08} />
      <Tile a={[1.66, 0.26, 1.06]} m="brandDeep" p={[-0.02, 0.02, 0.06]} radius={0.08} />
      <Tile a={[1.66, 0.26, 1.06]} m="brandLight" p={[0.04, -0.4, 0.02]} radius={0.08} />
      <Cube a={[0.16, 0.9, 1.08]} m="gold" p={[-0.86, 0.03, 0.03]} />
      <Cube a={[1.5, 0.08, 0.1]} m="goldLight" p={[0.08, 0.5, 0.5]} />
    </group>
  );
}

function Catalog() {
  return (
    <group>
      <Tile a={[1.56, 1.56, 0.16]} m="brandDeep" p={[-0.02, -0.08, -0.2]} radius={0.12} />
      <Tile a={[1.2, 0.92, 0.12]} m="paper" p={[0.04, 0.2, 0]} radius={0.06} />
      <Tile a={[1.0, 0.8, 0.12]} m="goldLight" p={[0, 0.16, 0.08]} radius={0.05} />
      <Tile a={[1.62, 0.78, 0.4]} m="brand" p={[0, -0.38, 0.16]} radius={0.14} />
      <Tile a={[1.66, 0.2, 0.5]} m="brandLight" p={[0, -0.86, 0.18]} radius={0.08} />
      <Cube a={[0.56, 0.2, 0.3]} m="brand" p={[-0.46, 0.66, -0.16]} />
      <Cube a={[0.44, 0.1, 0.1]} m="gold" p={[-0.08, -0.34, 0.38]} />
      <Cube a={[0.3, 0.09, 0.1]} m="goldLight" p={[0.02, -0.56, 0.38]} />
    </group>
  );
}

function Electives() {
  return (
    <group>
      <Cyl rt={0.42} rb={0.42} h={0.62} m="brandDeep" p={[0, -0.5, 0]} r={[0, 0, 0]} />
      <Tile a={[1.94, 0.14, 1.24]} m="brand" p={[0, -0.12, 0]} r={[0.12, 0.62, 0]} radius={0.06} />
      <Tile a={[1.5, 0.1, 1.0]} m="brandDeep" p={[0.04, -0.3, 0.02]} r={[0.12, 0.62, 0]} radius={0.05} />
      <Cyl rt={0.055} h={0.72} m="gold" p={[0.72, -0.42, 0.34]} r={[0, 0, 0.12]} />
      <Ball rad={0.13} m="goldLight" p={[0.78, -0.82, 0.34]} />
      <Cyl rt={0.05} h={0.62} m="gold" p={[0, 0.02, 0.72]} r={[PI / 2, 0, 0]} />
    </group>
  );
}

function Schedule() {
  return (
    <group>
      <Tile a={[1.66, 1.52, 0.52]} m="brandDeep" p={[0, -0.1, 0]} radius={0.12} />
      <Cube a={[1.7, 0.42, 0.56]} m="brandLight" p={[0, 0.5, 0.02]} />
      <Cyl rt={0.09} h={0.56} m="gold" p={[-0.5, 0.82, 0]} />
      <Cyl rt={0.09} h={0.56} m="gold" p={[0.5, 0.82, 0]} />
      {[-0.42, 0, 0.42].map((x) =>
        [-0.3, 0.06].map((y) => (
          <Cube key={`${x}-${y}`} a={[0.2, 0.2, 0.1]} m="paper" p={[x, y, 0.28]} />
        )),
      )}
    </group>
  );
}

function Calendar() {
  return (
    <group>
      <Tile a={[1.7, 0.26, 0.52]} m="brandDeep" p={[0, 0.84, 0]} radius={0.12} />
      {[-0.44, 0, 0.44].map((x) => (
        <Ring key={x} rad={0.15} tube={0.055} m="gold" p={[x, 1.0, 0.12]} />
      ))}
      <Tile a={[1.66, 1.48, 0.16]} m="brand" p={[0, -0.02, -0.06]} radius={0.1} />
      <Tile a={[1.4, 1.24, 0.14]} m="paper" p={[0, -0.1, 0.08]} radius={0.08} />
      <Cube a={[1.06, 0.16, 0.1]} m="brand" p={[0, 0.4, 0.18]} />
      {[-0.4, 0.08, 0.5].map((x) =>
        [0.06, -0.46].map((y) => (
          <Cube key={`${x}-${y}`} a={[0.26, 0.26, 0.1]} m="brandLight" p={[x, y, 0.18]} />
        )),
      )}
      <Tile a={[0.46, 0.46, 0.12]} m="gold" p={[-0.4, 0.06, 0.24]} radius={0.1} />
    </group>
  );
}

function Academic() {
  return (
    <group>
      <Cube a={[1.44, 1.0, 0.86]} m="brand" p={[0, -0.36, 0]} />
      <Cyl rt={0.05} rb={1.12} h={0.78} seg={4} m="brandDeep" p={[0, 0.52, 0]} r={[0, PI / 4, 0]} />
      <Cube a={[0.42, 0.56, 0.1]} m="gold" p={[0, -0.34, 0.47]} />
      <Cube a={[0.5, 0.16, 0.1]} m="brandLight" p={[-0.42, 0.06, 0.47]} />
      <Cube a={[0.5, 0.16, 0.1]} m="brandLight" p={[0.42, 0.06, 0.47]} />
      <Cyl rt={0.05} h={0.8} m="gold" p={[0.42, 1.14, 0]} />
      <Cube a={[0.34, 0.24, 0.08]} m="goldLight" p={[0.6, 1.34, 0]} />
    </group>
  );
}

function Exams() {
  return (
    <group>
      <Tile a={[1.3, 1.72, 0.18]} m="paper" p={[-0.14, 0, 0]} radius={0.08} />
      {[0.46, 0.16, -0.14].map((y, i) => (
        <Cube key={y} a={[i === 2 ? 0.6 : 0.92, 0.09, 0.08]} m="brandDeep" p={[-0.2, y, 0.11]} />
      ))}
      <Tile a={[0.78, 0.78, 0.24]} m="brand" p={[0.58, -0.56, 0.2]} radius={0.18} />
      <Cube a={[0.3, 0.11, 0.12]} m="goldLight" p={[0.44, -0.6, 0.36]} r={[0, 0, -0.78]} />
      <Cube a={[0.56, 0.11, 0.12]} m="goldLight" p={[0.7, -0.46, 0.36]} r={[0, 0, 0.78]} />
    </group>
  );
}

function SecureExams() {
  const shield = useMemo(
    () =>
      nav3DGeometry(
        () =>
          nav3DPolygon([
            [-0.45, 0.52],
            [0.45, 0.52],
            [0.45, -0.04],
            [0, -0.56],
            [-0.45, -0.04],
          ]),
        0.18,
        0.055,
      ),
    [],
  );
  return (
    <group>
      <Tile a={[1.24, 1.7, 0.18]} m="paper" p={[-0.16, 0, 0]} radius={0.08} />
      {[0.46, 0.16, -0.14].map((y, i) => (
        <Cube key={y} a={[i === 2 ? 0.5 : 0.86, 0.085, 0.08]} m="brandDeep" p={[-0.22, y, 0.11]} />
      ))}
      <mesh geometry={shield} position={[0.54, -0.5, 0.2]} material={NAV3D_MATERIALS.brand} />
      <Ball rad={0.085} m="goldLight" p={[0.54, -0.38, 0.44]} />
      <Cube a={[0.06, 0.14, 0.06]} m="goldLight" p={[0.54, -0.51, 0.43]} />
    </group>
  );
}

function Nazorat() {
  return (
    <group>
      <Tile a={[1.3, 1.7, 0.18]} m="paper" p={[0, 0, 0]} radius={0.08} />
      <Ring rad={0.6} tube={0.1} m="brand" p={[0, 0.06, 0.14]} />
      <Ball rad={0.25} m="brandDeep" p={[0, 0.06, 0.2]} />
      <Ball rad={0.09} m="goldLight" p={[0.07, 0.15, 0.36]} />
      <Cube a={[0.52, 0.075, 0.07]} m="gold" p={[0, -0.66, 0.12]} />
    </group>
  );
}

function Grades() {
  return (
    <group>
      <Tile a={[1.34, 1.76, 0.22]} m="brand" p={[0, -0.02, 0]} radius={0.14} />
      <Tile a={[1.04, 1.3, 0.12]} m="paper" p={[0, -0.1, 0.15]} radius={0.06} />
      <Tile a={[0.66, 0.3, 0.32]} m="gold" p={[0, 0.8, 0.06]} radius={0.08} />
      {[0.24, -0.02].map((y) => (
        <Cube key={y} a={[0.74, 0.08, 0.08]} m="brandDeep" p={[-0.06, y, 0.22]} />
      ))}
      <Cube a={[0.4, 0.12, 0.1]} m="brand" p={[0.06, -0.36, 0.24]} r={[0, 0, 0.76]} />
      <Cube a={[0.4, 0.12, 0.1]} m="brand" p={[0.3, -0.44, 0.24]} r={[0, 0, -0.76]} />
    </group>
  );
}

function Gpa() {
  const bars: { h: number; x: number; m: Nav3DMaterialKey }[] = [
    { h: 0.62, x: -0.52, m: "brandLight" },
    { h: 1.06, x: 0, m: "brand" },
    { h: 1.5, x: 0.52, m: "gold" },
  ];
  return (
    <group>
      {bars.map((bar) => (
        <Tile key={bar.x} a={[0.36, bar.h, 0.56]} m={bar.m} p={[bar.x, bar.h / 2 - 0.62, 0]} radius={0.06} />
      ))}
      <Cube a={[1.76, 0.14, 0.72]} m="brandDeep" p={[0, -0.66, 0]} />
      <Ball rad={0.16} m="goldLight" p={[0.52, 1.02, 0.16]} />
    </group>
  );
}

function Transcript() {
  return (
    <group>
      <Tile a={[1.3, 1.76, 0.18]} m="paper" p={[-0.16, 0.02, 0]} radius={0.08} />
      {[0.52, 0.24, -0.04].map((y) => (
        <Cube key={y} a={[0.88, 0.08, 0.08]} m="brandDeep" p={[-0.22, y, 0.11]} />
      ))}
      <Cube a={[0.6, 0.08, 0.08]} m="brandLight" p={[-0.34, -0.34, 0.11]} />
      <Cyl rt={0.3} h={0.22} m="gold" p={[0.54, -0.52, 0.24]} r={[PI / 2, 0, 0]} />
      <Ring rad={0.3} tube={0.07} m="goldLight" p={[0.54, -0.52, 0.28]} />
      <Cube a={[0.12, 0.34, 0.1]} m="gold" p={[0.54, -0.24, 0.2]} />
    </group>
  );
}

function Attendance() {
  return (
    <group>
      <Tile a={[1.5, 1.34, 0.5]} m="brandDeep" p={[0, 0.1, -0.1]} radius={0.12} />
      <Cube a={[1.54, 0.38, 0.54]} m="brandLight" p={[0, 0.62, -0.08]} />
      <Cyl rt={0.08} h={0.46} m="gold" p={[-0.42, 0.86, -0.08]} />
      <Cyl rt={0.08} h={0.46} m="gold" p={[0.42, 0.86, -0.08]} />
      <Cyl rt={0.52} rb={0.52} h={0.26} m="gold" p={[0, -0.02, 0.24]} r={[PI / 2, 0, 0]} />
      <Cube a={[0.3, 0.13, 0.12]} m="brandDeep" p={[-0.18, -0.14, 0.4]} r={[0, 0, -0.78]} />
      <Cube a={[0.58, 0.13, 0.12]} m="brandDeep" p={[0.14, -0.02, 0.4]} r={[0, 0, 0.78]} />
    </group>
  );
}

function Journal() {
  return (
    <group>
      <Tile a={[1.4, 1.74, 0.56]} m="brand" p={[0.06, 0, 0]} radius={0.1} />
      <Cube a={[0.2, 1.78, 0.6]} m="brandDeep" p={[-0.72, 0, 0.02]} />
      <Cube a={[1.0, 0.08, 0.1]} m="goldLight" p={[0.12, 0.62, 0.3]} />
      <Cube a={[1.0, 0.08, 0.1]} m="goldLight" p={[0.12, 0.24, 0.3]} />
      <Cube a={[0.7, 0.08, 0.1]} m="brandLight" p={[0.06, -0.14, 0.3]} />
      {[-0.5, 0, 0.5].map((y) => (
        <Ring key={y} rad={0.13} tube={0.05} arc={PI} m="gold" p={[-0.86, y, 0]} r={[0, PI / 2, -PI / 2]} />
      ))}
    </group>
  );
}

function Certificates() {
  return (
    <group>
      <Cube a={[0.26, 0.76, 0.14]} m="gold" p={[-0.34, 0.72, 0]} r={[0, 0, 0.26]} />
      <Cube a={[0.26, 0.76, 0.14]} m="goldLight" p={[0.34, 0.72, 0]} r={[0, 0, -0.26]} />
      <Cyl rt={0.54} rb={0.54} h={0.26} m="gold" p={[0, -0.28, 0]} r={[PI / 2, 0, 0]} />
      <Cyl rt={0.36} h={0.3} m="brandDeep" p={[0, -0.28, 0.04]} r={[PI / 2, 0, 0]} />
      <Ring rad={0.5} tube={0.07} m="goldLight" p={[0, -0.28, 0.16]} />
      <Ball rad={0.14} m="goldLight" p={[0, -0.28, 0.2]} />
    </group>
  );
}

function Bounty() {
  return (
    <group>
      <Cyl rt={0.5} rb={0.3} h={0.6} m="gold" p={[0, 0.34, 0]} />
      <Ring rad={0.5} tube={0.07} m="goldLight" p={[0, 0.62, 0]} r={[PI / 2, 0, 0]} />
      <Ring rad={0.24} tube={0.055} arc={PI} m="goldLight" p={[-0.54, 0.4, 0]} r={[0, 0, -PI / 2.2]} />
      <Ring rad={0.24} tube={0.055} arc={PI} m="goldLight" p={[0.54, 0.4, 0]} r={[0, 0, PI / 2.2]} />
      <Cyl rt={0.09} h={0.26} m="gold" p={[0, -0.06, 0]} />
      <Tile a={[0.66, 0.16, 0.3]} m="brandDeep" p={[0, -0.24, 0]} radius={0.05} />
      <Ball rad={0.1} m="paper" p={[0, 0.34, 0.28]} />
    </group>
  );
}

function Journals() {
  return (
    <group>
      <Tile a={[0.86, 1.44, 0.18]} m="paper" p={[-0.34, -0.06, 0]} r={[0, 0.38, 0.1]} radius={0.06} />
      <Tile a={[0.86, 1.44, 0.18]} m="brandLight" p={[0.34, -0.06, 0.02]} r={[0, -0.38, -0.1]} radius={0.06} />
      <Cyl rt={0.09} h={1.1} m="brand" p={[0.62, 0.42, 0.34]} r={[0, 0, 0.52]} />
      <Cyl rt={0.05} rb={0.12} h={0.24} m="gold" p={[1.06, 0.9, 0.34]} r={[0, 0, 0.52]} />
      <Cube a={[0.06, 0.5, 0.06]} m="goldLight" p={[0.66, 0.42, 0.46]} />
      {[0.42, 0.16, -0.1].map((y) => (
        <Cube key={y} a={[0.5, 0.06, 0.06]} m="brandDeep" p={[-0.4, y, 0.12]} r={[0, 0.38, 0]} />
      ))}
    </group>
  );
}

function Questions() {
  return (
    <group>
      <Tile a={[1.76, 1.4, 0.24]} m="brand" p={[0, 0.06, 0]} radius={0.2} />
      <Ring rad={0.3} tube={0.13} arc={PI * 0.78} m="goldLight" p={[-0.04, 0.34, 0.2]} r={[0, 0, PI * 0.16]} />
      <Cube a={[0.13, 0.34, 0.13]} m="goldLight" p={[0.24, -0.1, 0.2]} r={[0, 0, 0.2]} />
      <Ball rad={0.11} m="goldLight" p={[0.31, -0.42, 0.2]} />
    </group>
  );
}

function Research() {
  return (
    <group>
      <Ring rad={0.78} tube={0.05} m="brandLight" p={[0, 0, 0]} r={[PI / 2, 0, 0]} />
      <Ring rad={0.78} tube={0.05} m="brandLight" p={[0, 0, 0]} r={[PI / 2, PI / 3, 0]} />
      <Ring rad={0.78} tube={0.05} m="brandLight" p={[0, 0, 0]} r={[PI / 2, -PI / 3, 0]} />
      <Ball rad={0.2} m="gold" p={[0, 0, 0]} />
      <Ball rad={0.09} m="goldLight" p={[0.5, 0.34, 0.3]} />
    </group>
  );
}

function Messages() {
  return (
    <group>
      <Tile a={[1.5, 1.04, 0.28]} m="brandLight" p={[-0.16, 0.28, 0]} radius={0.24} />
      <Cube a={[0.26, 0.26, 0.2]} m="brandLight" p={[-0.66, -0.28, 0]} r={[0, 0, PI / 4]} />
      <Tile a={[0.92, 0.68, 0.26]} m="gold" p={[0.42, -0.5, 0.24]} radius={0.2} />
      <Cube a={[0.2, 0.2, 0.18]} m="gold" p={[0.9, -0.86, 0.24]} r={[0, 0, PI / 4]} />
      {[-0.44, -0.16, 0.12].map((x) => (
        <Ball key={x} rad={0.075} m="brandDeep" p={[x + 0.02, 0.3, 0.16]} />
      ))}
    </group>
  );
}

function Orders() {
  return (
    <group>
      <Tile a={[1.34, 1.74, 0.18]} m="paper" p={[0, 0, 0]} radius={0.08} />
      <Cube a={[0.44, 0.44, 0.18]} m="brandLight" p={[0.5, 0.66, 0.02]} />
      {[0.3, 0.02, -0.26].map((y) => (
        <Cube key={y} a={[0.92, 0.08, 0.08]} m="brandDeep" p={[-0.08, y, 0.11]} />
      ))}
      <Tile a={[0.56, 0.56, 0.2]} m="gold" p={[0.46, -0.62, 0.2]} radius={0.16} />
      <Cube a={[0.28, 0.1, 0.1]} m="paper" p={[0.4, -0.62, 0.32]} r={[0, 0, 0.78]} />
      <Cube a={[0.28, 0.1, 0.1]} m="paper" p={[0.56, -0.68, 0.32]} r={[0, 0, -0.78]} />
    </group>
  );
}

function Bookings() {
  return (
    <group>
      <Cyl rt={0.76} rb={0.76} h={0.32} m="brand" r={[PI / 2, 0, 0]} />
      <Ring rad={0.76} tube={0.1} m="gold" />
      <Ball rad={0.19} m="goldLight" p={[-0.5, 0.76, 0.08]} />
      <Ball rad={0.19} m="goldLight" p={[0.5, 0.76, 0.08]} />
      <Cube a={[0.14, 0.3, 0.14]} m="brandDeep" p={[-0.5, 0.58, 0.08]} r={[0, 0, 0.5]} />
      <Cube a={[0.14, 0.3, 0.14]} m="brandDeep" p={[0.5, 0.58, 0.08]} r={[0, 0, -0.5]} />
      <Cube a={[0.1, 0.4, 0.1]} m="paper" p={[-0.02, 0.18, 0.22]} r={[0, 0, PI]} />
      <Cube a={[0.3, 0.1, 0.1]} m="paper" p={[0.11, 0.02, 0.22]} />
      <Cyl rt={0.11} h={0.36} m="gold" p={[0, 0, 0.26]} r={[PI / 2, 0, 0]} />
    </group>
  );
}

function Rooms() {
  return (
    <group>
      <Cube a={[1.54, 1.94, 0.4]} m="brandDeep" p={[0, 0, -0.06]} />
      <Cube a={[1.66, 0.18, 0.52]} m="gold" p={[0, 1.02, -0.02]} />
      <Tile a={[1.02, 1.56, 0.18]} m="brandLight" p={[0, -0.06, 0.18]} radius={0.06} />
      <Cube a={[0.62, 0.62, 0.12]} m="brand" p={[0, 0.34, 0.28]} />
      <Cube a={[0.62, 0.62, 0.12]} m="brand" p={[0, -0.42, 0.28]} />
      <Ball rad={0.1} m="goldLight" p={[0.38, -0.06, 0.32]} />
    </group>
  );
}

function Search() {
  return (
    <group>
      <Ring rad={0.58} tube={0.14} m="brand" p={[-0.14, 0.2, 0]} />
      <Cyl rt={0.2} h={0.1} m="brandLight" p={[-0.14, 0.2, 0.06]} r={[PI / 2, 0, 0]} />
      <Cyl rt={0.12} rb={0.12} h={0.78} m="gold" p={[0.5, -0.5, 0]} r={[0, 0, -PI / 4]} />
      <Ring rad={0.13} tube={0.05} m="goldLight" p={[0.5, -0.5, 0.02]} r={[0, 0, -PI / 4]} />
    </group>
  );
}

function Help() {
  return (
    <group>
      <Ring rad={0.72} tube={0.2} m="brandLight" />
      <Ring rad={0.4} tube={0.09} m="gold" />
      {[0, 1, 2, 3].map((i) => (
        <Cube key={i} a={[0.2, 0.34, 0.42]} m="gold" p={[0, 0, 0]} r={[0, 0, (i * PI) / 2 + PI / 4]} />
      ))}
    </group>
  );
}

/**
 * Fariza — AI yordamchi ikonkasi.
 *
 * Shakl: "Negativ F" monogrammasi — oltin plitka ustida siyoh rangli «F».
 * Plitka chuqur / yaqqol ko'rinadi, harf esa o'yilgan kabi o'qiladi.
 */
function Assistant() {
  return (
    <group>
      {/* Oltin plitka */}
      <Tile a={[1.1, 1.1, 0.14]} m="gold" p={[0, 0, 0]} radius={0.14} />
      {/* «F» — vertikal tayanch */}
      <Tile a={[0.16, 0.6, 0.1]} m="brand" p={[-0.2, 0, 0.12]} radius={0.04} />
      {/* «F» — yuqori chiziq */}
      <Tile a={[0.44, 0.14, 0.1]} m="brand" p={[-0.04, 0.23, 0.12]} radius={0.04} />
      {/* «F» — o'rta chiziq */}
      <Tile a={[0.32, 0.14, 0.1]} m="brand" p={[-0.1, 0, 0.12]} radius={0.04} />
    </group>
  );
}

function Settings() {
  return (
    <group>
      <Gear m="gold" />
      <Cyl rt={0.3} h={0.44} m="brand" p={[0, 0, 0.02]} r={[PI / 2, 0, 0]} />
      <Ball rad={0.12} m="goldLight" p={[0, 0, 0.28]} />
    </group>
  );
}

function Curator() {
  return (
    <group>
      <Ball rad={0.34} m="brandLight" p={[-0.1, 0.36, 0.04]} />
      <Cyl rt={0.52} rb={0.4} h={0.72} m="brand" p={[-0.1, -0.52, 0]} />
      <Cyl rt={0.62} rb={0.62} h={0.12} m="brandDeep" p={[-0.1, -0.16, 0]} />
      <Tile a={[0.44, 0.44, 0.16]} m="gold" p={[0.62, 0.12, 0.3]} radius={0.14} />
      <Ball rad={0.1} m="goldLight" p={[0.62, 0.12, 0.42]} />
    </group>
  );
}

function Reports() {
  return (
    <group>
      <Tile a={[1.86, 1.46, 0.26]} m="brandDeep" p={[0, 0, -0.08]} radius={0.14} />
      {[
        { h: 0.44, x: -0.5, m: "brandLight" as Nav3DMaterialKey },
        { h: 0.7, x: 0, m: "brand" as Nav3DMaterialKey },
        { h: 0.96, x: 0.5, m: "gold" as Nav3DMaterialKey },
      ].map((bar) => (
        <Tile key={bar.x} a={[0.3, bar.h, 0.2]} m={bar.m} p={[bar.x, -0.42 + bar.h / 2, 0.18]} radius={0.05} />
      ))}
      <Cube a={[1.42, 0.07, 0.08]} m="goldLight" p={[0, -0.46, 0.26]} />
    </group>
  );
}

function Workload() {
  return (
    <group>
      <Cyl rt={0.09} h={1.3} m="slate" p={[0, 0, 0]} r={[0, 0, PI / 2]} />
      {[-0.58, 0.58].map((x) => (
        <Cyl key={x} rt={0.3} h={0.22} m="brand" p={[x, 0, 0]} r={[0, 0, PI / 2]} />
      ))}
      {[-0.82, 0.82].map((x) => (
        <Cyl key={x} rt={0.4} h={0.24} m="gold" p={[x, 0, 0]} r={[0, 0, PI / 2]} />
      ))}
      <Ball rad={0.16} m="goldLight" p={[0, 0, 0.14]} />
    </group>
  );
}

function Admin() {
  return (
    <group>
      <Shield m="brand" />
      <Cyl rt={0.26} h={0.5} m="gold" p={[0, 0.16, 0.1]} r={[PI / 2, 0, 0]} />
      <Ring rad={0.18} tube={0.06} m="brandDeep" p={[0, 0.16, 0.3]} />
      <Cube a={[0.12, 0.26, 0.12]} m="goldLight" p={[0, -0.14, 0.3]} />
      <Cube a={[0.34, 0.1, 0.12]} m="goldLight" p={[0, -0.32, 0.3]} />
    </group>
  );
}

function AdminUsers() {
  return (
    <group>
      <Tile a={[1.9, 1.8, 0.2]} m="brandDeep" p={[0, 0, -0.06]} radius={0.12} />
      <Ball rad={0.16} m="goldLight" p={[-0.44, 0.52, 0.12]} />
      <Cube a={[0.72, 0.1, 0.08]} m="gold" p={[0.26, 0.52, 0.12]} />
      <Ball rad={0.15} m="brandLight" p={[-0.44, 0.02, 0.12]} />
      <Cube a={[0.6, 0.09, 0.08]} m="brandLight" p={[0.2, 0.02, 0.12]} />
      <Ball rad={0.14} m="brandLight" p={[-0.44, -0.48, 0.12]} />
      <Cube a={[0.48, 0.08, 0.08]} m="brandLight" p={[0.14, -0.48, 0.12]} />
    </group>
  );
}

function AdminGroups() {
  return (
    <group>
      <Tile a={[1.5, 0.4, 0.42]} m="gold" p={[0, 0.52, 0.12]} radius={0.12} />
      <Tile a={[1.85, 0.4, 0.42]} m="brandLight" p={[0, 0, 0]} radius={0.12} />
      <Tile a={[2.2, 0.4, 0.42]} m="brand" p={[0, -0.52, -0.12]} radius={0.12} />
    </group>
  );
}

/** Onlayn daftar — doska + chizilgan chiziq + kalit. */
function Board() {
  return (
    <group>
      <Tile a={[1.98, 1.44, 0.22]} m="brandDeep" p={[0, 0, -0.1]} radius={0.12} />
      <Tile a={[1.76, 1.22, 0.1]} m="paper" p={[0, 0, 0.04]} radius={0.05} />
      {/* doska ustidagi chizilgan chiziqlar */}
      <Cube a={[0.86, 0.09, 0.06]} m="brand" p={[-0.24, 0.3, 0.11]} r={[0, 0, 0.16]} />
      <Cube a={[0.62, 0.08, 0.06]} m="brandLight" p={[-0.36, 0.02, 0.11]} r={[0, 0, -0.1]} />
      <Cube a={[0.34, 0.07, 0.06]} m="gold" p={[0.52, 0.26, 0.11]} r={[0, 0, 0.5]} />
      {/* chizilgan doira */}
      <Ring rad={0.19} tube={0.045} m="gold" p={[0.42, -0.22, 0.11]} />
      {/* yozuv kaliti — burchakka qiyiq */}
      <Cyl rt={0.075} h={0.72} m="gold" p={[0.76, 0.52, 0.3]} r={[0, 0, PI / 5]} />
      <Cyl rt={0.075} rb={0.015} h={0.2} m="paper" p={[0.98, 0.36, 0.3]} r={[0, 0, PI / 5]} />
    </group>
  );
}

/** Laboratoriya — shisha stakan, suyuq va ko'tarilayotgan pufakchalar. */
function Labs() {
  return (
    <group>
      {/* stakan tanasi va bo'yin */}
      <Cyl rt={0.66} rb={0.5} h={0.82} seg={26} m="brand" p={[0, -0.32, 0]} />
      <Cyl rt={0.28} rb={0.36} h={0.6} seg={22} m="brand" p={[0, 0.34, 0]} />
      <Ring rad={0.3} tube={0.075} m="brandLight" p={[0, 0.62, 0]} r={[PI / 2, 0, 0]} />
      {/* oltin suyuq */}
      <Cyl rt={0.55} h={0.3} seg={24} m="gold" p={[0, -0.5, 0]} />
      <Cyl rt={0.58} h={0.06} seg={24} m="goldLight" p={[0, -0.35, 0]} />
      {/* pufakchalar */}
      <Ball rad={0.14} m="goldLight" p={[-0.2, 0.02, 0.16]} />
      <Ball rad={0.1} m="paper" p={[0.18, 0.24, 0.1]} />
      {/* asos */}
      <Cyl rt={0.58} rb={0.62} h={0.14} seg={24} m="brandDeep" p={[0, -0.78, 0]} />
      {/* o'lchov chizig'i */}
      <Cube a={[0.5, 0.05, 0.05]} m="paper" p={[0.74, -0.2, 0.42]} />
      <Cube a={[0.34, 0.05, 0.05]} m="paper" p={[0.8, -0.44, 0.42]} />
    </group>
  );
}

/** Tasdiqlash — hujjat va oltin muhr. */
function Approvals() {
  return (    <group>
      <Tile a={[1.36, 1.72, 0.2]} m="paper" p={[-0.12, 0, 0]} radius={0.08} />
      {[0.5, 0.2, -0.1].map((y, i) => (
        <Cube key={y} a={[i === 2 ? 0.56 : 0.88, 0.08, 0.07]} m="brandDeep" p={[-0.18, y, 0.12]} />
      ))}
      {/* oltin muhr */}
      <Cyl rt={0.46} rb={0.46} h={0.16} seg={26} m="gold" p={[0.5, -0.62, 0.3]} />
      <Cyl rt={0.34} rb={0.34} h={0.06} seg={26} m="goldLight" p={[0.5, -0.54, 0.3]} />
      {/* muhr ustidagi tekshiruv belgisi */}
      <Cube a={[0.5, 0.11, 0.08]} m="brandDeep" p={[0.46, -0.62, 0.4]} r={[0, 0, 0.78]} />
      <Cube a={[0.26, 0.1, 0.08]} m="brandDeep" p={[0.62, -0.74, 0.4]} r={[0, 0, -0.78]} />
      {/* qalam */}
      <Cyl rt={0.07} h={0.6} m="brandLight" p={[-0.78, 0.66, 0.2]} r={[0, 0, PI / 3.4]} />
      <Cyl rt={0.07} rb={0.01} h={0.16} m="gold" p={[-0.46, 1.02, 0.2]} r={[0, 0, PI / 3.4]} />
    </group>
  );
}

/** Monitoring — signal pulsatsiyasi va o'lchash nuqtalari. */
function Monitoring() {
  return (
    <group>
      <Cyl rt={0.86} rb={0.86} h={0.3} seg={30} m="brandDeep" r={[PI / 2, 0, 0]} />
      <Ring rad={0.86} tube={0.1} m="gold" />
      {/* pulsatsiya egri chizig'i */}
      <Ring rad={0.56} tube={0.075} arc={PI * 0.62} m="goldLight" p={[0, 0, 0.18]} r={[0, 0, PI * 0.82]} />
      <Cube a={[0.12, 0.42, 0.09]} m="brand" p={[0.16, 0.2, 0.2]} r={[0, 0, 0.34]} />
      <Cube a={[0.12, 0.3, 0.09]} m="brand" p={[-0.12, 0.12, 0.2]} r={[0, 0, -0.34]} />
      {/* markaziy nuqta */}
      <Ball rad={0.17} m="gold" p={[0, 0, 0.24]} />
      {/* o'lchash chapquni */}
      <Cyl rt={0.09} h={0.5} m="brandLight" p={[0, 0, -0.3]} r={[PI / 2, 0, 0]} />
    </group>
  );
}

/** Xodimlar davomati — xodim siluetlari va barmoq izi. */
function Staff() {
  return (
    <group>
      <Tile a={[1.92, 1.5, 0.2]} m="brandDeep" p={[0, -0.04, -0.08]} radius={0.14} />
      {/* orqa xodim */}
      <Ball rad={0.2} m="brandLight" p={[-0.44, 0.28, 0.14]} />
      <Tile a={[0.62, 0.56, 0.12]} m="brandLight" p={[-0.44, -0.28, 0.14]} radius={0.16} />
      {/* old xodim */}
      <Ball rad={0.25} m="goldLight" p={[0.3, 0.32, 0.26]} />
      <Tile a={[0.78, 0.7, 0.14]} m="gold" p={[0.3, -0.3, 0.26]} radius={0.18} />
      {/* barmoq izi halqasi */}
      <Ring rad={0.46} tube={0.055} arc={PI * 0.42} m="paper" p={[0, 0, 0.34]} r={[0, 0, -0.5]} />
    </group>
  );
}

/** Topshiriqlar — vazifa ro'yxati va belgi. */
function Tasks() {
  return (
    <group>
      <Tile a={[1.6, 1.76, 0.22]} m="brand" p={[0, -0.02, 0]} radius={0.12} />
      <Tile a={[1.28, 1.44, 0.1]} m="paper" p={[0, -0.06, 0.14]} radius={0.05} />
      {[0.48, 0.16, -0.16].map((y, i) => (
        <group key={y}>
          <Cube a={[0.2, 0.2, 0.08]} m="brandDeep" p={[-0.36, y, 0.2]} />
          <Cube a={[0.62, 0.07, 0.06]} m={i === 2 ? "brandLight" : "brandDeep"} p={[0.16, y, 0.2]} />
        </group>
      ))}
      {/* ustidan chizilgan chiziq — bajarilgan */}
      <Cube a={[0.86, 0.1, 0.09]} m="gold" p={[0.06, 0.48, 0.24]} r={[0, 0, 0.26]} />
      <Cyl rt={0.055} h={0.72} m="gold" p={[0.72, 0.3, 0.3]} r={[0, 0, PI / 3.2]} />
    </group>
  );
}

/** Mening QR kodim — QR katak va ramkalar. */
function MyQr() {
  return (
    <group>
      <Tile a={[1.76, 1.76, 0.16]} m="paper" p={[0, 0, 0]} radius={0.1} />
      <Tile a={[1.9, 1.9, 0.1]} m="brand" p={[0, 0, -0.08]} radius={0.12} />
      {/* uchta burchak ramkasi */}
      {([[-1, 1], [1, 1], [-1, -1]] as [number, number][]).map(([sx, sy]) => (
        <group key={`${sx}${sy}`}>
          <Cube a={[0.56, 0.11, 0.07]} m="brandDeep" p={[sx * 0.56, sy * 0.62, 0.12]} />
          <Cube a={[0.11, 0.56, 0.07]} m="brandDeep" p={[sx * 0.78, sy * 0.4, 0.12]} />
        </group>
      ))}
      {/* kataklar */}
      {([[-0.36, 0.34], [0.06, 0.34], [0.44, 0.06], [-0.2, -0.16], [0.3, -0.42], [-0.44, -0.5]] as [number, number][]).map(
        ([x, y], i) => (
          <Cube key={i} a={[0.18, 0.18, 0.07]} m={i % 2 === 0 ? "brand" : "brandLight"} p={[x, y, 0.12]} />
        ),
      )}
      {/* skaner chizig'i */}
      <Cube a={[1.5, 0.09, 0.09]} m="gold" p={[0, 0, 0.2]} />
    </group>
  );
}

/** Turniket — aylanuvchi blagaminga o'tkazuvchi turniket. */
function Access() {
  return (
    <group>
      {/* asos */}
      <Cyl rt={0.82} rb={0.86} h={0.16} seg={28} m="brandDeep" p={[0, -0.78, 0]} />
      <Cyl rt={0.2} rb={0.24} h={0.72} seg={18} m="brand" p={[0, -0.36, 0]} />
      {/* turniket blagami — uchta tarmoq */}
      {[0, (PI * 2) / 3, (PI * 4) / 3].map((a) => (
        <group key={a} rotation={[0, 0, a]}>
          <Cyl rt={0.07} h={0.78} m="gold" p={[0, 0.5, 0]} r={[0, 0, PI / 2]} />
          <Ball rad={0.11} m="goldLight" p={[0.82, 0.5, 0]} />
          <Cyl rt={0.05} h={0.3} m="brandLight" p={[0.38, 0.72, 0]} r={[0, 0, -0.5]} />
        </group>
      ))}
      {/* markaz */}
      <Cyl rt={0.16} h={0.26} seg={18} m="brandLight" p={[0, 0.5, 0]} />
      <Ball rad={0.13} m="gold" p={[0, 0.66, 0]} />
    </group>
  );
}

/** Ota-ona — ikki katta figura va kichik bola. */
function Parent() {
  return (
    <group>
      <Ball rad={0.34} m="brandLight" p={[-0.5, 0.44, 0.1]} />
      <Cyl rt={0.42} rb={0.5} h={0.62} m="brand" p={[-0.5, -0.32, 0.1]} />
      <Ball rad={0.34} m="goldLight" p={[0.5, 0.44, 0.1]} />
      <Cyl rt={0.42} rb={0.5} h={0.62} m="gold" p={[0.5, -0.32, 0.1]} />
      <Ball rad={0.24} m="paper" p={[0, -0.08, 0.26]} />
      <Cyl rt={0.3} rb={0.36} h={0.44} m="brandDeep" p={[0, -0.68, 0.26]} />
    </group>
  );
}

/** Qabul — bitiruvchi qopqog'i (mortarboard) va osilgan tilla. */
function Admissions() {
  return (
    <group>
      {/* qopqoq — keng yassi plita, biroz orqaga egilgan */}
      <Tile a={[1.94, 1.94, 0.13]} m="brandDeep" p={[0, 0.16, 0]} radius={0.05} r={[0, 0, PI / 4]} />
      {/* bosh qalpoq — silindr ostdan ko'rinadi */}
      <Cyl rt={0.5} rb={0.54} h={0.42} seg={26} m="brand" p={[0, -0.16, 0]} />
      <Cyl rt={0.55} rb={0.55} h={0.07} seg={26} m="brandLight" p={[0, -0.38, 0]} />
      {/* tilla — o'ng burchakdan osilgan ip va uchi */}
      <Cyl rt={0.035} h={0.94} m="gold" p={[0.88, -0.28, 0.06]} />
      <Ball rad={0.14} m="goldLight" p={[0.88, -0.78, 0.06]} />
      {/* qabul belgisi — oldindagi oltin halqa (cheklangan kvadrat) */}
      <Ring rad={0.34} tube={0.06} arc={PI * 1.5} m="gold" p={[-0.66, 0.42, 0.2]} r={[0, 0, PI * 0.25]} />
    </group>
  );
}

/** Hujjatlar — varaqlar to'plami va oltin muhr. */
function Documents() {
  return (
    <group>
      <Tile a={[1.5, 1.9, 0.16]} m="paper" p={[-0.12, 0.06, -0.08]} radius={0.1} r={[0, 0, 0.14]} />
      <Tile a={[1.5, 1.9, 0.16]} m="paper" p={[0.06, 0, 0.02]} radius={0.1} />
      {[0.5, 0.18, -0.14].map((y, i) => (
        <Cube key={y} a={[i === 2 ? 0.5 : 0.92, 0.07, 0.06]} m="brandDeep" p={[-0.16, y, 0.12]} />
      ))}
      <Cyl rt={0.3} rb={0.3} h={0.12} seg={24} m="gold" p={[0.56, -0.62, 0.24]} />
      <Cyl rt={0.22} rb={0.22} h={0.05} seg={24} m="goldLight" p={[0.56, -0.54, 0.24]} />
    </group>
  );
}

/** Diplom — o'ralgan dasta va oltin bog'lam. */
function Diplomas() {
  return (
    <group>
      <Cyl rt={0.5} rb={0.5} h={1.9} m="paper" p={[0, 0.06, 0]} r={[0, 0, PI / 2]} seg={28} />
      <Cyl rt={0.55} rb={0.55} h={0.32} m="gold" p={[-0.52, 0.06, 0]} r={[0, 0, PI / 2]} seg={28} />
      <Cyl rt={0.55} rb={0.55} h={0.32} m="gold" p={[0.52, 0.06, 0]} r={[0, 0, PI / 2]} seg={28} />
      <Ball rad={0.2} m="goldLight" p={[0, -0.72, 0.22]} />
      <Cube a={[0.14, 0.42, 0.1]} m="brand" p={[-0.15, -0.94, 0.22]} r={[0, 0, 0.35]} />
      <Cube a={[0.14, 0.42, 0.1]} m="brand" p={[0.15, -0.94, 0.22]} r={[0, 0, -0.35]} />
    </group>
  );
}

/** Moliya — oltin tangalar ustuni va hisob varaqasi. */
/** Fakultet summalari — ko'tarilgan ustunlar va tilla tanga. */
function FacultyRates() {
  return (
    <group>
      <Cube a={[1.5, 0.16, 0.5]} m="brandDeep" p={[-0.5, -0.5, 0]} />
      <Cube a={[1.2, 0.16, 0.5]} m="brand" p={[-0.35, -0.2, 0.07]} />
      <Cube a={[0.9, 0.16, 0.5]} m="brandLight" p={[-0.2, 0.1, 0.14]} />
      <Cyl rt={0.28} rb={0.28} h={0.12} seg={26} m="gold" p={[0.58, 0.5, 0.3]} />
      <Cyl rt={0.22} rb={0.22} h={0.12} seg={26} m="goldLight" p={[0.58, 0.66, 0.3]} />
    </group>
  );
}

function Finance() {
  return (
    <group>
      {[-0.55, -0.3, -0.05].map((y) => (
        <Cyl key={y} rt={0.62} rb={0.62} h={0.18} seg={28} m="gold" p={[0, y, 0]} />
      ))}
      <Cyl rt={0.62} rb={0.62} h={0.18} seg={28} m="goldLight" p={[0, 0.2, 0]} />
      <Ball rad={0.3} m="paper" p={[0.52, 0.64, 0.28]} />
      <Cube a={[0.42, 0.52, 0.09]} m="brand" p={[-0.6, 0.52, 0.22]} r={[0, 0, 0.2]} />
    </group>
  );
}

/** Oylik boshqaruvi — kalkulyator: korpus, ekran va tugmalar. */
function Payroll() {
  return (
    <group>
      {/* korpus — tik turgan kalkulyator */}
      <Tile a={[1.36, 1.9, 0.26]} m="brandDeep" p={[0, 0, 0]} radius={0.14} />
      {/* ekran */}
      <Tile a={[1.04, 0.5, 0.1]} m="paper" p={[0, 0.6, 0.18]} radius={0.05} />
      <Cube a={[0.68, 0.1, 0.06]} m="brandLight" p={[0, 0.62, 0.25]} />
      {/* tugmalar — 3x2 */}
      {[0.24, 0, -0.24].map((y, row) =>
        [-0.42, 0, 0.42].map((x, col) => (
          <Cube
            key={`${row}-${col}`}
            a={[0.26, 0.18, 0.08]}
            m={row === 0 && col === 2 ? "gold" : "brandLight"}
            p={[x, y, 0.2]}
          />
        )),
      )}
      {/* tasdiqlash belgisi — o'ng yuqoridagi oltin tugma ustidagi ring */}
      <Ring rad={0.3} tube={0.045} arc={PI * 1.35} m="goldLight" p={[0, 0.24, 0.34]} r={[0, 0, 0.6]} />
    </group>
  );
}

export const NAV3D_ICONS: Record<string, ComponentType> = {
  "/dashboard": Gauge,  "/courses": Courses,
  "/assistant": Assistant,
  "/catalog": Catalog,
  "/electives": Electives,
  "/schedule": Schedule,
  "/calendar": Calendar,
  "/academic-calendar": Academic,
  "/exams": Exams,
  "/secure-exams": SecureExams,
  "/nazorat": Nazorat,
  "/grades": Grades,
  "/gpa": Gpa,
  "/transcript": Transcript,
  "/attendance": Attendance,
  "/journal": Journal,
  "/certificates": Certificates,
  "/bounty": Bounty,
  "/journals": Journals,
  "/question-bank": Questions,
  "/research": Research,
  "/messages": Messages,
  "/orders": Orders,
  "/bookings": Bookings,
  "/rooms": Rooms,
  "/search": Search,
  "/help": Help,
  "/settings": Settings,
  "/curator": Curator,
  "/reports": Reports,
  "/workload": Workload,
  "/admin": Admin,
  "/admin/users": AdminUsers,
  "/admin/groups": AdminGroups,
  "/board": Board,
  "/labs": Labs,
  "/approvals": Approvals,
  "/monitoring": Monitoring,
  "/staff": Staff,
  "/tasks": Tasks,
  "/my-qr": MyQr,
  "/access": Access,
  "/turniket": Access,
  "/parent": Parent,
  "/admissions": Admissions,
  "/documents": Documents,
  "/diplomas": Diplomas,
  "/finance": Finance,
  "/finance/rates": FacultyRates,
  "/teacher-points": FacultyRates,
  "/payroll": Payroll,
  "/teacher-points": Curator,
};

export const NAV3D_SPINNING = new Set([
  "/calendar",
  "/certificates",
  "/bookings",
  "/help",
  "/settings",
]);

export function resolveNav3DIcon(href: string): ComponentType | null {
  const exact = NAV3D_ICONS[href];
  if (exact) return exact;
  let best: ComponentType | null = null;
  let bestLength = -1;
  for (const [key, component] of Object.entries(NAV3D_ICONS)) {
    if (href.startsWith(`${key}/`) && key.length > bestLength) {
      best = component;
      bestLength = key.length;
    }
  }
  return best;
}

export function nav3DIsSpinning(href: string): boolean {
  if (NAV3D_SPINNING.has(href)) return true;
  for (const key of NAV3D_SPINNING) {
    if (href.startsWith(`${key}/`)) return true;
  }
  return false;
}