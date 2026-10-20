import { describe, expect, it } from "vitest";
import {
  canGradeCourse,
  canManageCourse,
  canViewCourse,
  type AccessUser,
} from "./course-access";

const course = {
  teacherId: "lead",
  teacherIds: ["lead", "co", "assistant", "observer"],
  managerIds: ["lead", "co"],
  assistantIds: ["assistant"],
};

function teacher(id: string): AccessUser {
  return { id, role: "TEACHER" };
}

function student(id: string): AccessUser {
  return { id, role: "STUDENT" };
}

describe("kursor ruxsatlari", () => {
  it("asosiy o'qituvchi boshqaradi va baholaydi", () => {
    expect(canManageCourse(teacher("lead"), course)).toBe(true);
    expect(canGradeCourse(teacher("lead"), course)).toBe(true);
    expect(canViewCourse(teacher("lead"), course, false)).toBe(true);
  });

  it("hammuallif boshqaradi va baholaydi", () => {
    expect(canManageCourse(teacher("co"), course)).toBe(true);
    expect(canGradeCourse(teacher("co"), course)).toBe(true);
  });

  it("yordamchi baholaydi, lekin kursni boshqarmaydi", () => {
    expect(canManageCourse(teacher("assistant"), course)).toBe(false);
    expect(canGradeCourse(teacher("assistant"), course)).toBe(true);
    expect(canViewCourse(teacher("assistant"), course, false)).toBe(true);
  });

  it("kuzatuvchi faqat ko'radi", () => {
    expect(canManageCourse(teacher("observer"), course)).toBe(false);
    expect(canGradeCourse(teacher("observer"), course)).toBe(false);
    expect(canViewCourse(teacher("observer"), course, false)).toBe(true);
  });

  it("begona o'qituvchi kira olmaydi", () => {
    expect(canManageCourse(teacher("other"), course)).toBe(false);
    expect(canGradeCourse(teacher("other"), course)).toBe(false);
    expect(canViewCourse(teacher("other"), course, false)).toBe(false);
  });

  it("admin va owner cheklovsiz", () => {
    expect(canManageCourse({ id: "admin", role: "ADMIN" }, course)).toBe(true);
    expect(canGradeCourse({ id: "owner", role: "OWNER" }, course)).toBe(true);
  });

  it("yozilgan talaba ko'radi, lekin baholamaydi", () => {
    expect(canViewCourse(student("student"), course, true)).toBe(true);
    expect(canGradeCourse(student("student"), course)).toBe(false);
    expect(canManageCourse(student("student"), course)).toBe(false);
  });

  it("eski kursda array bo'lmasa ham lead ishlaydi", () => {
    const legacy = { teacherId: "lead" };
    expect(canManageCourse(teacher("lead"), legacy)).toBe(true);
    expect(canManageCourse(teacher("co"), legacy)).toBe(false);
    expect(canViewCourse(teacher("lead"), legacy, false)).toBe(true);
  });
});
