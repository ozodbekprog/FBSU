import { describe, expect, it } from "vitest";
import { resolveNav3DIcon } from "./nav-3d-icons";
import { drawerIcon } from "./nav-drawer-icons";

const LINKS = [
  "/research",
  "/admissions",
  "/turniket",
  "/admin/users",
  "/admin/groups",
  "/bounty",
  "/assistant",
];

describe("nav ikonkalari", () => {
  it("har bir havola uchun 3D ikonka topiladi", () => {
    for (const href of LINKS) expect(resolveNav3DIcon(href), href).not.toBeNull();
  });

  it("har bir havola uchun drawer ikonkasi topiladi", () => {
    for (const href of LINKS) expect(drawerIcon(href), href).not.toBeNull();
  });

  it("noma'lum havola uchun ikonka yo'q", () => {
    expect(resolveNav3DIcon("/mavjud-emas")).toBeNull();
    expect(drawerIcon("/mavjud-emas")).toBeNull();
  });
});
