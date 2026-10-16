import type { Capability } from "./registry";
import {
  COURSE_RELATION_CAPABILITIES,
  ROLE_CAPABILITIES,
  ROLES,
  type CourseRelation,
  type RoleName,
} from "./presets";

const ROLE_SET: ReadonlySet<string> = new Set(ROLES);

export function isRoleName(value: string): value is RoleName {
  return ROLE_SET.has(value);
}

export function normalizeRole(role: string): RoleName | null {
  return isRoleName(role) ? role : null;
}

export function capabilitiesFor(role: string): readonly Capability[] {
  const normalized = normalizeRole(role);
  return normalized ? ROLE_CAPABILITIES[normalized] : [];
}

export function hasCapability(role: string, capability: Capability): boolean {
  return capabilitiesFor(role).includes(capability);
}

export function hasAnyCapability(role: string, capabilities: readonly Capability[]): boolean {
  const granted = capabilitiesFor(role);
  return capabilities.some((capability) => granted.includes(capability));
}

export function hasAllCapabilities(role: string, capabilities: readonly Capability[]): boolean {
  const granted = capabilitiesFor(role);
  return capabilities.every((capability) => granted.includes(capability));
}

export function hasCourseCapability(relation: CourseRelation, capability: Capability): boolean {
  return COURSE_RELATION_CAPABILITIES[relation].includes(capability);
}
