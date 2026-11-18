import { describe, expect, it } from "vitest";
import { cronMatchesAt, isValidFiveFieldCron } from "./agents.cron-match";

describe("agents.cron-match", () => {
  it("valida 5 campos", () => {
    expect(isValidFiveFieldCron("*/15 * * * *")).toBe(true);
    expect(isValidFiveFieldCron("0 9 * * 1-5")).toBe(true);
    expect(isValidFiveFieldCron("* * * *")).toBe(false);
    expect(isValidFiveFieldCron("60 * * * *")).toBe(false);
  });

  it("casa minuto/hora UTC", () => {
    const at = new Date(Date.UTC(2026, 0, 15, 9, 0, 0)); // Thu
    expect(cronMatchesAt("0 9 * * *", at)).toBe(true);
    expect(cronMatchesAt("1 9 * * *", at)).toBe(false);
    expect(cronMatchesAt("0 9 * * 4", at)).toBe(true); // Thursday
    expect(cronMatchesAt("0 9 * * 1", at)).toBe(false);
  });

  it("suporta step */n", () => {
    const at = new Date(Date.UTC(2026, 0, 15, 10, 30, 0));
    expect(cronMatchesAt("*/15 * * * *", at)).toBe(true);
    expect(cronMatchesAt("*/15 * * * *", new Date(Date.UTC(2026, 0, 15, 10, 31, 0)))).toBe(
      false,
    );
  });
});
