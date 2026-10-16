import { describe, expect, it } from "vitest";
import { displayValue } from "./format";

describe("number formats", () => {
  it("formats number, currency, percent and date", () => {
    expect(displayValue(1234.5, "number")).toBe("1,234.50");
    expect(displayValue(1234.5, "currency")).toBe("₹1,234.50");
    expect(displayValue(0.256, "percent")).toBe("25.60%");
    expect(displayValue(45047, "date")).toBe("01-May-2023");
  });
});
