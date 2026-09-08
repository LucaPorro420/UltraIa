import { describe, it, expect } from "vitest";
import {
  validateSlug,
  calculateNextReview,
  parseJsonArray,
  stringifyJsonArray,
  validateBilingual,
  bilingualHash,
  buildSearchIndex,
  isCourseCategory,
} from "./learning";

describe("learning domain", () => {
  it("validateSlug ok/fail", () => {
    expect(validateSlug("react-basics").ok).toBe(true);
    expect(validateSlug("React_Basics").ok).toBe(false);
    expect(validateSlug("ab").ok).toBe(false);
  });

  it("SM-2 quality 5 increases", () => {
    const card = { easeFactor: 2.5, intervalDays: 0, repetitions: 0, nextReview: new Date("2026-09-08T00:00:00Z") };
    const next = calculateNextReview(card, { quality: 5, now: new Date("2026-09-08T00:00:00Z") });
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.easeFactor).toBeGreaterThanOrEqual(2.5);
  });

  it("SM-2 quality 0 resets", () => {
    const card = { easeFactor: 2.5, intervalDays: 6, repetitions: 2, nextReview: new Date() };
    const next = calculateNextReview(card, { quality: 0 });
    expect(next.repetitions).toBe(0);
    expect(next.intervalDays).toBe(0);
    expect(next.easeFactor).toBeLessThan(2.5);
  });

  it("SM-2 progression 1->6->ease", () => {
    const now = new Date("2026-09-08T00:00:00Z");
    let card = { easeFactor: 2.5, intervalDays: 0, repetitions: 0, nextReview: now };
    card = { ...card, ...calculateNextReview(card, { quality: 5, now }) };
    expect(card.intervalDays).toBe(1);
    const second = calculateNextReview(card, { quality: 5, now });
    expect(second.intervalDays).toBe(6);
  });

  it("parse/stringify JsonArray", () => {
    expect(parseJsonArray(null)).toEqual([]);
    expect(parseJsonArray("[]")).toEqual([]);
    expect(parseJsonArray(JSON.stringify(["a","b"]))).toEqual(["a","b"]);
    expect(stringifyJsonArray(["x"])).toBe(JSON.stringify(["x"]));
    expect(parseJsonArray("invalid")).toEqual([]);
  });

  it("bilingual validate/hash", () => {
    expect(validateBilingual({ es: "hola" }).ok).toBe(true);
    expect(validateBilingual({ es: "" }).ok).toBe(false);
    expect(bilingualHash("hello")).toBe(bilingualHash("hello"));
    expect(bilingualHash("hello")).not.toBe(bilingualHash("world"));
  });

  it("buildSearchIndex truncates", () => {
    const doc = buildSearchIndex({ type: "lesson", sourceId: "l1", title: "t".repeat(300), content: "c".repeat(5000) });
    expect(doc.title.length).toBe(200);
    expect(doc.content.length).toBe(4000);
    expect(doc.language).toBe("es");
  });

  it("course category", () => {
    expect(isCourseCategory("react")).toBe(true);
    expect(isCourseCategory("unknown")).toBe(false);
  });
});
