import { describe, it, expect } from "vitest";
import { findCourseBySlug, listAllCourses } from "./learningRepo";

function fakeDb() {
  const courses = [{ id: "c1", slug: "react-basics", title: "React", category: "react", order: 0, isPublished: true, createdAt: new Date(), updatedAt: new Date() }];
  return {
    learningCourse: {
      findUnique: async ({ where }: any) => courses.find((c) => c.slug === where.slug) ?? null,
      findMany: async () => courses,
    },
  };
}

describe("learningRepo", () => {
  it("findCourseBySlug found", async () => {
    const db = fakeDb() as any;
    const r = await findCourseBySlug(db, "react-basics");
    expect(r?.slug).toBe("react-basics");
  });
  it("findCourseBySlug not found", async () => {
    const db = fakeDb() as any;
    const r = await findCourseBySlug(db, "nope");
    expect(r).toBeNull();
  });
  it("findCourseBySlug without db", async () => {
    const r = await findCourseBySlug(null as any, "x");
    expect(r).toBeNull();
  });
  it("listAllCourses ok", async () => {
    const db = fakeDb() as any;
    const r = await listAllCourses(db);
    expect(r.length).toBe(1);
  });
  it("listAllCourses without db", async () => {
    const r = await listAllCourses(null as any);
    expect(r).toEqual([]);
  });
  it("listAllCourses with take", async () => {
    const db = fakeDb() as any;
    const r = await listAllCourses(db, 5);
    expect(r.length).toBe(1);
  });
});
