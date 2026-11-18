import { describe, it, expect } from "vitest";
import {
  germanDateKey,
  todayGermanDateKey,
  mondayOfGermanWeek,
  germanWeekday,
  germanTime,
  wallClockAtOrAfter,
  subtractMinutesFromWallClock,
  addDaysToDateKey,
  daysBetweenDateKeys,
} from "@/lib/german-time";

describe("germanDateKey", () => {
  it("rolls over to the next day in winter (CET, UTC+1) before it does in UTC", () => {
    // 23:30 UTC in January is already 00:30 the next day in Berlin.
    expect(germanDateKey(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
    expect(germanDateKey(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
  });

  it("rolls over an hour earlier in summer (CEST, UTC+2) than in winter", () => {
    // 21:30 UTC in July is 23:30 Berlin (no rollover yet).
    expect(germanDateKey(new Date("2026-07-15T21:30:00Z"))).toBe("2026-07-15");
    // 22:30 UTC in July is 00:30 the next day in Berlin - this would stay
    // the same day if the code used a fixed +1h offset instead of the
    // real (DST-aware) Europe/Berlin timezone.
    expect(germanDateKey(new Date("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
  });

  it("handles the spring-forward transition (2026-03-29, 01:00 UTC: CET -> CEST)", () => {
    expect(germanTime(new Date("2026-03-29T00:59:00Z"))).toBe("01:59");
    // Two minutes later in UTC, the wall clock jumped 62 minutes forward
    // (01:59 -> 03:01) because 02:00-03:00 local time doesn't exist that day.
    expect(germanTime(new Date("2026-03-29T01:01:00Z"))).toBe("03:01");
    expect(germanDateKey(new Date("2026-03-29T01:01:00Z"))).toBe("2026-03-29");
  });

  it("handles the fall-back transition (2026-10-25, 01:00 UTC: CEST -> CET)", () => {
    expect(germanTime(new Date("2026-10-25T00:59:00Z"))).toBe("02:59");
    // Two minutes later in UTC, the wall clock appears to go *backward*
    // (02:59 -> 02:01) because the 02:00-03:00 hour repeats that day.
    expect(germanTime(new Date("2026-10-25T01:01:00Z"))).toBe("02:01");
    expect(germanDateKey(new Date("2026-10-25T01:01:00Z"))).toBe("2026-10-25");
  });

  it("todayGermanDateKey matches germanDateKey(new Date())", () => {
    expect(todayGermanDateKey()).toBe(germanDateKey(new Date()));
  });
});

describe("germanWeekday", () => {
  it("indexes Monday as 0 through Sunday as 6", () => {
    // 2026-01-19 is a Monday, 2026-01-25 is the following Sunday.
    expect(germanWeekday(new Date("2026-01-19T12:00:00Z"))).toBe(0);
    expect(germanWeekday(new Date("2026-01-20T12:00:00Z"))).toBe(1);
    expect(germanWeekday(new Date("2026-01-25T12:00:00Z"))).toBe(6);
  });
});

describe("mondayOfGermanWeek", () => {
  it("returns the Monday of the containing week for any weekday", () => {
    const monday = mondayOfGermanWeek(new Date("2026-01-22T12:00:00Z")); // Thursday
    expect(germanDateKey(monday)).toBe("2026-01-19");
  });

  it("returns the same day when given a Monday", () => {
    const monday = mondayOfGermanWeek(new Date("2026-01-19T12:00:00Z"));
    expect(germanDateKey(monday)).toBe("2026-01-19");
  });
});

describe("wallClockAtOrAfter", () => {
  it("compares by date first, then by time", () => {
    expect(wallClockAtOrAfter("2026-01-20", "09:00", "2026-01-19", "23:59")).toBe(true);
    expect(wallClockAtOrAfter("2026-01-19", "09:00", "2026-01-20", "00:01")).toBe(false);
    expect(wallClockAtOrAfter("2026-01-20", "09:00", "2026-01-20", "09:00")).toBe(true);
    expect(wallClockAtOrAfter("2026-01-20", "08:59", "2026-01-20", "09:00")).toBe(false);
  });
});

describe("subtractMinutesFromWallClock", () => {
  it("subtracts within the same day", () => {
    expect(subtractMinutesFromWallClock("2026-01-20", "09:30", 15)).toEqual({ dateKey: "2026-01-20", time: "09:15" });
  });

  it("rolls the calendar day back when crossing midnight", () => {
    expect(subtractMinutesFromWallClock("2026-01-20", "00:10", 20)).toEqual({ dateKey: "2026-01-19", time: "23:50" });
  });

  it("rolls back across a month boundary", () => {
    expect(subtractMinutesFromWallClock("2026-02-01", "00:00", 1)).toEqual({ dateKey: "2026-01-31", time: "23:59" });
  });

  it("rolls back across multiple days for a large minute count", () => {
    // 25 hours before 2026-01-20 00:30 is 2026-01-18 23:30.
    expect(subtractMinutesFromWallClock("2026-01-20", "00:30", 25 * 60)).toEqual({ dateKey: "2026-01-18", time: "23:30" });
  });
});

describe("addDaysToDateKey", () => {
  it("adds and subtracts days across month/year boundaries", () => {
    expect(addDaysToDateKey("2026-01-20", 5)).toBe("2026-01-25");
    expect(addDaysToDateKey("2026-01-30", 3)).toBe("2026-02-02");
    expect(addDaysToDateKey("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysToDateKey("2026-01-20", -25)).toBe("2025-12-26");
  });

  it("is a no-op for +0 days", () => {
    expect(addDaysToDateKey("2026-01-20", 0)).toBe("2026-01-20");
  });
});

describe("daysBetweenDateKeys", () => {
  it("counts whole days forward and backward", () => {
    expect(daysBetweenDateKeys("2026-01-20", "2026-01-25")).toBe(5);
    expect(daysBetweenDateKeys("2026-01-25", "2026-01-20")).toBe(-5);
    expect(daysBetweenDateKeys("2026-01-20", "2026-01-20")).toBe(0);
  });

  it("is consistent with addDaysToDateKey across the DST transition", () => {
    const from = "2026-03-20";
    const to = addDaysToDateKey(from, 14); // crosses the 2026-03-29 spring-forward
    expect(daysBetweenDateKeys(from, to)).toBe(14);
  });
});
