import { describe, expect, it } from "vitest";
import { DATASETS, NEW_DATASETS } from "./registry";
import { REQUIRED_TOPICS } from "./required";
import { uncoveredTopics, validateDataset, validateRegistry } from "./validate";

describe("dataset library", () => {
  it("registry is consistent (unique ids, related ids exist, relations match as intended)", () => {
    expect(validateRegistry().filter((f) => f.level === "error")).toEqual([]);
  });
  it("every brief topic is covered by at least one dataset", () => {
    expect(uncoveredTopics()).toEqual([]);
  });
  it("every category in the brief has datasets", () => {
    for (const cat of Object.keys(REQUIRED_TOPICS)) expect(DATASETS.some((d) => d.category === cat), cat).toBe(true);
  });
  for (const d of NEW_DATASETS) {
    it(`${d.id} is valid`, () => {
      expect(validateDataset(d).filter((f) => f.level === "error"), d.rows().length + " rows").toEqual([]);
    });
  }
  it("generation is deterministic", () => {
    const d = DATASETS.find((x) => x.id === "DS-SAL-TXN")!;
    expect(JSON.stringify(d.rows().slice(0, 50))).toBe(JSON.stringify(d.rows().slice(0, 50)));
  });
});
