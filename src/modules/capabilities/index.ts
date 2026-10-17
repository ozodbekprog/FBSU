export { CAPABILITIES, ALL_CAPABILITIES } from "./registry";
export type { Capability, CapabilityDefinition, CapabilityScope } from "./registry";
export {
  COURSE_RELATION_CAPABILITIES,
  ROLE_CAPABILITIES,
  ROLES,
} from "./presets";
export type { CourseRelation, RoleName } from "./presets";
export {
  capabilitiesFor,
  hasAllCapabilities,
  hasAnyCapability,
  hasCapability,
  hasCourseCapability,
  isRoleName,
  normalizeRole,
} from "./has";
