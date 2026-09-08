import { describe, it, expect } from "vitest";
import {
  createCourse,
  listCourses,
  createModule,
  createLesson,
  reviewCardAction,
  slugifyTitle,
  learningSystemHandler,
} from "./learning-system";

function fakeDb() {
  const courses: any[] = [];
  const modules: any[] = [];
  const lessons: any[] = [];
  let seq = 0;
  return {
    learningCourse: {
      findUnique: async ({ where }: any) => courses.find((c) => c.id === where.id || c.slug === where.slug) ?? null,
      findMany: async ({ where }: any = {}) => {
        let out = courses;
        if (where?.category) out = out.filter((c) => c.category === where.category);
        return out;
      },
      create: async ({ data }: any) => {
        const row = { id: `c${++seq}`, order: 0, isPublished: true, createdAt: new Date(), updatedAt: new Date(), ...data };
        courses.push(row);
        return row;
      },
    },
    learningModule: {
      findUnique: async ({ where }: any) => modules.find((m) => m.id === where.id) ?? null,
      create: async ({ data }: any) => {
        const row = { id: `m${++seq}`, order: 0, isPublished: true, createdAt: new Date(), updatedAt: new Date(), ...data };
        modules.push(row);
        return row;
      },
    },
    learningLesson: {
      create: async ({ data }: any) => {
        const row = { id: `l${++seq}`, order: 0, createdAt: new Date(), updatedAt: new Date(), ...data };
        lessons.push(row);
        return row;
      },
    },
    _courses: courses,
    _modules: modules,
    _lessons: lessons,
  };
}

describe("learning-system slugify", () => {
  it("slugifyTitle normalizes", () => {
    expect(slugifyTitle("React Basics!")).toBe("react-basics");
    expect(slugifyTitle("  Hola Mundo  ")).toBe("hola-mundo");
  });
});

describe("learning-system createCourse", () => {
  it("creates course ok", async () => {
    const db = fakeDb();
    const r = await createCourse(db as any, { slug: "react-basics", title: "React Basics", category: "react" });
    expect(r.ok).toBe(true);
  });
  it("rejects duplicate slug", async () => {
    const db = fakeDb();
    await createCourse(db as any, { slug: "dup", title: "A", category: "react" });
    const r2 = await createCourse(db as any, { slug: "dup", title: "B", category: "react" });
    expect(r2.ok).toBe(false);
  });
  it("rejects invalid slug", async () => {
    const db = fakeDb();
    const r = await createCourse(db as any, { slug: "AB", title: "A", category: "react" });
    expect(r.ok).toBe(false);
  });
  it("fail-soft without db", async () => {
    const r = await createCourse(null as any, { slug: "x", title: "X", category: "react" });
    expect(r.ok).toBe(false);
  });
});

describe("learning-system listCourses", () => {
  it("lists courses", async () => {
    const db = fakeDb();
    await createCourse(db as any, { slug: "course-one", title: "C1", category: "react" });
    await createCourse(db as any, { slug: "course-two", title: "C2", category: "ai" });
    const r = await listCourses(db as any, {});
    expect(r.ok).toBe(true);
    expect(r.courses.length).toBe(2);
  });
  it("filters by category", async () => {
    const db = fakeDb();
    await createCourse(db as any, { slug: "course-one", title: "C1", category: "react" });
    await createCourse(db as any, { slug: "course-two", title: "C2", category: "ai" });
    const r = await listCourses(db as any, { category: "react" });
    expect(r.courses.length).toBe(1);
  });
  it("fail-soft without db", async () => {
    const r = await listCourses(null as any, {});
    expect(r.ok).toBe(false);
  });
});

describe("learning-system createModule", () => {
  it("creates module ok", async () => {
    const db = fakeDb();
    const c = await createCourse(db as any, { slug: "course-one", title: "C1", category: "react" });
    const r = await createModule(db as any, { courseId: (c as any).course.id, slug: "module-one", title: "M1" });
    expect(r.ok).toBe(true);
  });
  it("fails if course not found", async () => {
    const db = fakeDb();
    const r = await createModule(db as any, { courseId: "nope", slug: "module-one", title: "M1" });
    expect(r.ok).toBe(false);
  });
  it("fail-soft without db", async () => {
    const r = await createModule(null as any, { courseId: "x", slug: "module-one", title: "M1" });
    expect(r.ok).toBe(false);
  });
});

describe("learning-system createLesson", () => {
  it("creates lesson ok", async () => {
    const db = fakeDb();
    const c = await createCourse(db as any, { slug: "course-one", title: "C1", category: "react" });
    const m = await createModule(db as any, { courseId: (c as any).course.id, slug: "module-one", title: "M1" });
    const r = await createLesson(db as any, { moduleId: (m as any).module.id, slug: "lesson-one", title: "L1", content: "contenido largo suficiente para pasar validacion" });
    expect(r.ok).toBe(true);
  });
  it("fails if module not found", async () => {
    const db = fakeDb();
    const r = await createLesson(db as any, { moduleId: "nope", slug: "lesson-one", title: "L1", content: "contenido largo suficiente para pasar validacion" });
    expect(r.ok).toBe(false);
  });
  it("fail-soft without db", async () => {
    const r = await createLesson(null as any, { moduleId: "x", slug: "lesson-one", title: "L1", content: "contenido largo" });
    expect(r.ok).toBe(false);
  });
});

describe("learning-system reviewCard", () => {
  it("review quality 5", async () => {
    const r = await reviewCardAction({ cardId: "card1", quality: 5 });
    expect(r.ok).toBe(true);
    expect((r as any).next.intervalDays).toBeGreaterThanOrEqual(1);
  });
  it("review quality 0 resets", async () => {
    const r = await reviewCardAction({ cardId: "card1", quality: 0, easeFactor: 2.5, intervalDays: 6, repetitions: 2 });
    expect(r.ok).toBe(true);
    expect((r as any).next.repetitions).toBe(0);
  });
  it("review invalid quality", async () => {
    const r = await reviewCardAction({ cardId: "card1", quality: 10 } as any);
    // zod will clamp? Actually quality max 5, so 10 fails validation
    expect(r.ok).toBe(false);
  });
});

describe("learning-system handler", () => {
  it("handler create_course", async () => {
    const db = fakeDb();
    const r = await learningSystemHandler({ action: "create_course", course: { slug: "handler-one", title: "H1", category: "ai" } }, { db: db as any });
    expect(r.ok).toBe(true);
  });
  it("handler unknown action", async () => {
    const r = await learningSystemHandler({ action: "unknown" as any }, {});
    expect(r.ok).toBe(false);
  });
  it("handler review_card via handler", async () => {
    const r = await learningSystemHandler({ action: "review_card", review: { cardId: "course-one", quality: 4 } }, {});
    expect(r.ok).toBe(true);
  });
});
