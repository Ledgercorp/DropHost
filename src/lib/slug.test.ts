import { describe, expect, it } from "vitest";
import { buildSlugCandidate, slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["My Portfolio", "my-portfolio"],
    ["  Demo___Site  ", "demo-site"],
    ["Café + Audio!", "cafe-audio"],
    ["---", "site"],
  ])("maps %s to %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("adds a collision suffix after the first candidate", () => {
    expect(buildSlugCandidate("Demo", 1)).toBe("demo");
    expect(buildSlugCandidate("Demo", 2)).toBe("demo-2");
  });
});
