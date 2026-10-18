/**
 * Time travel: the clock arithmetic and the replacements it installs.
 *
 * The failure worth pinning is the quiet one -- a page that asks the time some
 * way the replacement missed and gets the real one, or a Date built from
 * arguments that the replacement bent when it should have left it alone.
 */

import { afterEach, describe, expect, it } from "vitest";

import { createFakeDate, patchDateTimeFormat, patchTemporal } from "@/features/fake-clock";
import {
  fakeNow,
  fromLocalInput,
  parseState,
  shift,
  toLocalInput,
  type TimeTravelState,
} from "@/lib/time-travel";

const FAKE = Date.UTC(2001, 8, 9, 1, 46, 40);

describe("the clock", () => {
  const state: TimeTravelState = { fake: FAKE, real: 1_000_000, stopped: false };

  it("runs on from the fake time at the real rate", () => {
    expect(fakeNow(state, 1_000_000)).toBe(FAKE);
    expect(fakeNow(state, 1_060_000)).toBe(FAKE + 60_000);
  });

  it("stands still when stopped", () => {
    expect(fakeNow({ ...state, stopped: true }, 9_999_999)).toBe(FAKE);
  });

  it("reads back what it stored, and nothing malformed", () => {
    expect(parseState(JSON.stringify(state))).toEqual(state);
    expect(parseState(null)).toBeNull();
    expect(parseState("not json")).toBeNull();
    expect(parseState('{"fake": "yesterday", "real": 1}')).toBeNull();
    expect(parseState('{"fake": 1, "real": 2}')).toEqual({ fake: 1, real: 2, stopped: false });
  });
});

describe("the input", () => {
  it("round-trips a datetime-local value", () => {
    const value = "2030-02-03T04:05:06";

    expect(toLocalInput(fromLocalInput(value))).toBe(value);
  });

  it("names no instant for an unfinished value", () => {
    expect(fromLocalInput("")).toBeNaN();
    expect(fromLocalInput("2030-02-03")).toBeNaN();
  });

  it("steps by calendar units in local time", () => {
    const start = new Date(2024, 0, 31, 12).getTime();

    expect(new Date(shift(start, "+1d")).getDate()).toBe(1);
    expect(new Date(shift(start, "-1d")).getDate()).toBe(30);
    expect(new Date(shift(start, "+1w")).getDate()).toBe(7);
    expect(new Date(shift(start, "+1y")).getFullYear()).toBe(2025);
    // Jan 31 + 1 month is "Feb 31", which Date rolls into March.
    expect(new Date(shift(start, "+1M")).getMonth()).toBe(2);
  });
});

describe("Date", () => {
  const FakeDate = createFakeDate(Date, () => FAKE);

  it("reads the fake now when built, called or asked", () => {
    expect(new FakeDate().getTime()).toBe(FAKE);
    expect(FakeDate.now()).toBe(FAKE);
    expect((FakeDate as unknown as () => string)()).toBe(new Date(FAKE).toString());
  });

  it("leaves a Date built from arguments alone", () => {
    expect(new FakeDate(0).getTime()).toBe(0);
    expect(new FakeDate(2020, 0, 1).getTime()).toBe(new Date(2020, 0, 1).getTime());
    expect(new FakeDate("2020-01-01T00:00:00Z").getTime()).toBe(Date.UTC(2020, 0, 1));
    expect(FakeDate.UTC(2020, 0, 1)).toBe(Date.UTC(2020, 0, 1));
    expect(FakeDate.parse("2020-01-01T00:00:00Z")).toBe(Date.UTC(2020, 0, 1));
  });

  it("is still Date to instanceof, to subclasses and to its own name", () => {
    class Sub extends FakeDate {}

    expect(new FakeDate()).toBeInstanceOf(Date);
    expect(new Date()).toBeInstanceOf(FakeDate);
    expect(new Sub()).toBeInstanceOf(Sub);
    expect(new Sub().getTime()).toBe(FAKE);
    expect(FakeDate.name).toBe("Date");
    expect(String(FakeDate)).toContain("[native code]");
  });
});

describe("Intl.DateTimeFormat", () => {
  let restore: (() => void) | undefined;

  afterEach(() => restore?.());

  it("formats the fake now when given no date, and a given date as given", () => {
    restore = patchDateTimeFormat(Intl.DateTimeFormat, () => FAKE);

    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric" });

    expect(formatter.format()).toBe("2001");
    expect(formatter.format(Date.UTC(1999, 0, 1))).toBe("1999");
    expect(formatter.formatToParts().find((part) => part.type === "year")?.value).toBe("2001");
  });

  it("goes back to the real clock when undone", () => {
    patchDateTimeFormat(Intl.DateTimeFormat, () => FAKE)();

    const year = new Intl.DateTimeFormat("en-US", { year: "numeric" }).format();

    expect(year).toBe(String(new Date().getFullYear()));
  });
});

describe("Temporal.Now", () => {
  it("answers from the fake now", () => {
    const calls: number[] = [];
    const zoned = {
      toPlainDateTime: () => "pdt",
      toPlainDate: () => "pd",
      toPlainTime: () => "pt",
    };
    const Temporal = {
      Instant: {
        fromEpochMilliseconds: (epoch: number) => {
          calls.push(epoch);

          return { toZonedDateTimeISO: () => zoned };
        },
      },
      Now: {
        timeZoneId: () => "UTC",
        instant: () => "real",
        plainDateISO: () => "real",
      } as Record<string, unknown> & { timeZoneId(): string },
    };

    patchTemporal(Temporal, () => FAKE);

    expect((Temporal.Now.plainDateISO as () => unknown)()).toBe("pd");
    expect(calls).toEqual([FAKE]);
    // Only what the browser has is replaced; nothing is added.
    expect(Temporal.Now.plainTimeISO).toBeUndefined();
  });

  it("does nothing where there is no Temporal", () => {
    expect(() => patchTemporal(undefined, () => FAKE)).not.toThrow();
  });
});
