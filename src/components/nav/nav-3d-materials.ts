import * as THREE from "three";

const make = (color: number, roughness: number, metalness: number, emissive = 0) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: new THREE.Color(emissive),
    emissiveIntensity: 0.28,
  });

export const NAV3D_MATERIALS = {
  brand: make(0x6d8ccb, 0.28, 0.34, 0x16254a),
  brandDeep: make(0x44609e, 0.36, 0.3, 0x101c36),
  brandLight: make(0xb6c7e8, 0.24, 0.4, 0x3f5a9d),
  gold: make(0xe0bb45, 0.16, 0.76, 0xa9871f),
  goldLight: make(0xf0d684, 0.18, 0.64, 0xc9a227),
  paper: make(0xf2f6fd, 0.55, 0.05, 0x8fa8d8),
  slate: make(0x7b8cb4, 0.42, 0.2, 0x2b3c68),
  shadow: make(0x0b1428, 0.72, 0.05),
  halo: new THREE.MeshBasicMaterial({
    color: 0xf0d684,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  }),
} as const;

export type Nav3DMaterialKey = keyof typeof NAV3D_MATERIALS;

export type Nav3DPart = {
  m?: Nav3DMaterialKey;
  p?: [number, number, number];
  r?: [number, number, number];
};

export function nav3DGeometry(shape: () => THREE.Shape, depth: number, bevel = 0.05) {
  return new THREE.ExtrudeGeometry(shape(), {
    depth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 24,
  });
}

export function nav3DPolygon(
  points: [number, number][],
  holes: [number, number][][] = [],
) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  for (const ring of holes) {
    const path = new THREE.Path();
    ring.forEach(([x, y], index) => {
      if (index === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

export function nav3DCircle(radius: number, segments: number, cx = 0, cy = 0) {
  const points: [number, number][] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}