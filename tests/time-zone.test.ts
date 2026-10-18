/**
 * Time travel's fake time zone: the offset arithmetic, and Date and Intl as a
 * page sees them once the zone is installed.
 *
 * The failures worth pinning are at the DST transitions, where a reading
 * happens twice or not at all and a naive conversion is off by an hour, and
 * in the methods that must not move -- UTC, getTime, a string with an offset.
 *
 * Each test installs into a fresh realm from node:vm, which has its own Date
 * and Intl, so replacing methods on Date.prototype cannot leak into the
 * other tests -- or into this file's own expectations, which use the host's.
 */

import vm from "node:vm";
import { describe, expect, it } from "vitest";

import { installFakeClock, installFakeZone, patchTemporal } from "@/features/fake-clock";
import { fromLocalInput, parseState, shift, toLocalInput } from "@/lib/time-travel";
import {
  formatOffset,
  fromWall,
  hasOffset,
  isTimeZone,
  timeZones,
  toWall,
  zoneOffset,
} from "@/lib/time-zone";

const HOUR = 3_600_000;
const FAKE = Date.UTC(2025, 6, 15, 12);

function realm(zone: string | undefined) {
  const source = { zone };
  const global = vm.runInNewContext("globalThis") as typeof globalThis;

  installFakeClock(
    global,
    () => FAKE,
    () => source.zone,
  );
  installFakeZone(global, () => source.zone);

  return { source, global, D: global.Date };
}

describe("zone offsets", () => {
  it("follow DST in London and New York", () => {
    expect(zoneOffset("Europe/London", Date.UTC(2025, 0, 1))).toBe(0);
    expect(zoneOffset("Europe/London", Date.UTC(2025, 6, 1))).toBe(HOUR);
    expect(zoneOffset("America/New_York", Date.UTC(2025, 0, 1))).toBe(-5 * HOUR);
    expect(zoneOffset("America/New_York", Date.UTC(2025, 6, 1))).toBe(-4 * HOUR);
  });

  it("keep half hours", () => {
    expect(zoneOffset("Asia/Kolkata", Date.UTC(2025, 6, 1))).toBe(5.5 * HOUR);
    expect(zoneOffset("Australia/Adelaide", Date.UTC(2025, 0, 1))).toBe(10.5 * HOUR);
    expect(zoneOffset("Australia/Adelaide", Date.UTC(2025, 6, 1))).toBe(9.5 * HOUR);
  });

  it("change at the instant of the transition", () => {
    const spring = Date.UTC(2025, 2, 30, 1);

    expect(zoneOffset("Europe/London", spring - 1000)).toBe(0);
    expect(zoneOffset("Europe/London", spring)).toBe(HOUR);
  });

  it("read years before the common era", () => {
    const wall = Date.UTC(2025, 0, 1) - 2525 * 365.2425 * 24 * HOUR;

    expect(toWall("UTC", wall)).toBe(wall);
  });

  it("format as the dialog and Date.toString show them", () => {
    expect(formatOffset(5.5 * HOUR)).toBe("+05:30");
    expect(formatOffset(-9.5 * HOUR, "")).toBe("-0930");
    expect(formatOffset(0)).toBe("+00:00");
  });
});

describe("a wall time", () => {
  const cases: [string, string, number, number][] = [
    // zone, what, wall time, expected instant
    ["Europe/London", "skipped", Date.UTC(2025, 2, 30, 1, 30), Date.UTC(2025, 2, 30, 1, 30)],
    ["Europe/London", "repeated", Date.UTC(2025, 9, 26, 1, 30), Date.UTC(2025, 9, 26, 0, 30)],
    ["America/New_York", "skipped", Date.UTC(2025, 2, 9, 2, 30), Date.UTC(2025, 2, 9, 7, 30)],
    ["America/New_York", "repeated", Date.UTC(2025, 10, 2, 1, 30), Date.UTC(2025, 10, 2, 5, 30)],
    ["Australia/Adelaide", "skipped", Date.UTC(2025, 9, 5, 2, 30), Date.UTC(2025, 9, 4, 17)],
    ["Australia/Adelaide", "repeated", Date.UTC(2025, 3, 6, 2, 30), Date.UTC(2025, 3, 5, 16)],
    ["Asia/Kolkata", "ordinary", Date.UTC(2025, 0, 1), Date.UTC(2024, 11, 31, 18, 30)],
  ];

  it.each(cases)("in %s, %s, resolves as browsers do", (zone, _what, wall, expected) => {
    expect(fromWall(zone, wall)).toBe(expected);
  });

  it("round-trips away from a transition", () => {
    const epoch = Date.UTC(2025, 6, 4, 9, 8, 7, 6);

    for (const zone of ["Europe/London", "America/New_York", "Australia/Adelaide", "UTC"]) {
      expect(fromWall(zone, toWall(zone, epoch))).toBe(epoch);
    }
  });

  it("is NaN for an invalid one", () => {
    expect(fromWall("UTC", Number.NaN)).toBeNaN();
  });
});

describe("Date in a fake zone", () => {
  it("builds from local fields in the zone, across DST", () => {
    const { D } = realm("America/New_York");

    expect(new D(2025, 2, 9, 2, 30).getTime()).toBe(Date.UTC(2025, 2, 9, 7, 30));
    expect(new D(2025, 2, 9, 2, 30).getHours()).toBe(3);
    expect(new D(2025, 10, 2, 1, 30).getTimezoneOffset()).toBe(240);
    expect(new D(2025, 10, 2, 1, 30).getTime()).toBe(Date.UTC(2025, 10, 2, 5, 30));
  });

  it("reads the second of a repeated hour by its own offset", () => {
    const { D } = realm("Europe/London");
    const first = new D(2025, 9, 26, 1, 30);
    const second = new D(first.getTime() + HOUR);

    expect(first.getTimezoneOffset()).toBe(-60);
    expect(second.getHours()).toBe(1);
    expect(second.getMinutes()).toBe(30);
    expect(second.getTimezoneOffset()).toBe(0);
  });

  it("gives half-hour offsets and the local fields of a half-hour zone", () => {
    const { D } = realm("Asia/Kolkata");
    const date = new D(Date.UTC(2025, 0, 1, 20, 0));

    expect(date.getTimezoneOffset()).toBe(-330);
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2025, 0, 2]);
    expect([date.getDay(), date.getHours(), date.getMinutes()]).toEqual([4, 1, 30]);
    expect(date.getYear()).toBe(125);
  });

  it("leaves the UTC methods and the time value alone", () => {
    const { D } = realm("Australia/Adelaide");
    const epoch = Date.UTC(2025, 3, 5, 16);
    const date = new D(epoch);

    expect(date.getTime()).toBe(epoch);
    expect(date.getUTCHours()).toBe(16);
    expect(date.toISOString()).toBe("2025-04-05T16:00:00.000Z");
    expect(new D(2025, 0, 1).getTime()).toBe(Date.UTC(2024, 11, 31, 13, 30));
    expect(D.UTC(2025, 0, 1)).toBe(Date.UTC(2025, 0, 1));
  });

  it("reads 0-99 as 19xx and keeps years before the common era", () => {
    const { D } = realm("Europe/London");

    expect(new D(99, 0).getFullYear()).toBe(1999);
    expect(new D(-500, 0, 1).getFullYear()).toBe(-500);
    expect(new D(-500, 0, 1).getDate()).toBe(1);
  });

  it("reads the fake now in the zone", () => {
    const { D } = realm("Asia/Kolkata");

    expect(new D().getHours()).toBe(17);
    expect(new D().getMinutes()).toBe(30);
    expect((D as unknown as () => string)()).toMatch(/^Tue Jul 15 2025 17:30:00 GMT\+0530 \(/);
  });
});

describe("the setters in a fake zone", () => {
  it("land on the far side of a skipped hour", () => {
    const { D } = realm("America/New_York");
    const date = new D(2025, 2, 8, 2, 30);

    expect(date.setDate(9)).toBe(Date.UTC(2025, 2, 9, 7, 30));
    expect([date.getDate(), date.getHours(), date.getMinutes()]).toEqual([9, 3, 30]);
  });

  it("take the earlier instant of a repeated hour", () => {
    const { D } = realm("Europe/London");
    const date = new D(2025, 9, 26, 0, 30);

    date.setHours(1);
    expect(date.getTime()).toBe(Date.UTC(2025, 9, 26, 0, 30));
  });

  it("overflow, and keep the fields they were not given", () => {
    const { D } = realm("Australia/Adelaide");
    const date = new D(2025, 0, 31, 10, 20, 30, 400);

    date.setHours(25);
    expect([date.getMonth(), date.getDate(), date.getHours()]).toEqual([1, 1, 1]);
    expect([date.getMinutes(), date.getSeconds(), date.getMilliseconds()]).toEqual([20, 30, 400]);

    date.setMonth(5, 15);
    expect([date.getMonth(), date.getDate(), date.getHours()]).toEqual([5, 15, 1]);

    date.setMinutes(0);
    expect([date.getMinutes(), date.getSeconds()]).toEqual([0, 30]);

    date.setSeconds(5, 6);
    date.setMilliseconds(7);
    expect([date.getSeconds(), date.getMilliseconds()]).toEqual([5, 7]);
  });

  it("start setFullYear on an invalid date from local midnight, 1970", () => {
    const { D } = realm("America/New_York");
    const date = new D(Number.NaN);

    expect(date.setHours(1)).toBeNaN();
    expect(date.setFullYear(2020)).toBe(Date.UTC(2020, 0, 1, 5));
    expect(new D(Number.NaN).getHours()).toBeNaN();
  });

  it("keep setFullYear's year as given, and setYear's 0-99 as 19xx", () => {
    const { D } = realm("Europe/London");
    const date = new D(2025, 5, 1);

    date.setFullYear(50);
    expect(date.getFullYear()).toBe(50);

    (date as Date & { setYear(year: number): number }).setYear(99);
    expect(date.getFullYear()).toBe(1999);
  });
});

describe("parsing in a fake zone", () => {
  const { D } = realm("America/New_York");

  it("reads a string with no offset in the zone", () => {
    expect(D.parse("2025-08-01T00:00")).toBe(Date.UTC(2025, 7, 1, 4));
    expect(D.parse("2025-08-01 00:00")).toBe(Date.UTC(2025, 7, 1, 4));
    expect(D.parse("Aug 1, 2025 10:00")).toBe(Date.UTC(2025, 7, 1, 14));
    expect(D.parse("2025/08/01")).toBe(Date.UTC(2025, 7, 1, 4));
    expect(new D("January 15, 2025").getTime()).toBe(Date.UTC(2025, 0, 15, 5));
  });

  it("resolves skipped and repeated times as the constructor does", () => {
    expect(D.parse("2025-03-09T02:30")).toBe(Date.UTC(2025, 2, 9, 7, 30));
    expect(D.parse("2025-11-02T01:30")).toBe(Date.UTC(2025, 10, 2, 5, 30));
  });

  it("leaves a string with Z or an offset, and an ISO date, alone", () => {
    expect(D.parse("2025-08-01")).toBe(Date.UTC(2025, 7, 1));
    expect(D.parse("2025-08")).toBe(Date.UTC(2025, 7, 1));
    expect(D.parse("2025-08-01T00:00Z")).toBe(Date.UTC(2025, 7, 1));
    expect(D.parse("2025-08-01T00:00+02:00")).toBe(Date.UTC(2025, 6, 31, 22));
    expect(D.parse("2025-11-02T01:30:00-05:00")).toBe(Date.UTC(2025, 10, 2, 6, 30));
    expect(D.parse("Fri, 01 Aug 2025 00:00:00 GMT")).toBe(Date.UTC(2025, 7, 1));
  });

  it("reads back its own toString", () => {
    const date = new D(Date.UTC(2025, 10, 2, 6, 30));

    expect(D.parse(date.toString())).toBe(date.getTime());
    expect(new D(date.toString()).getHours()).toBe(1);
  });

  it("gives NaN for nonsense", () => {
    expect(D.parse("not a date")).toBeNaN();
    expect(new D("not a date").getTime()).toBeNaN();
  });

  it("tells an offset from a date's own hyphens", () => {
    expect(hasOffset("2025-08-01")).toBe(false);
    expect(hasOffset("2025-08-01T10:00")).toBe(false);
    expect(hasOffset("2025-08-01T10:00-05")).toBe(true);
    expect(hasOffset("Mon Aug 04 2025 14:00:00 GMT+0200 (Central European Summer Time)")).toBe(
      true,
    );
    expect(hasOffset("Aug 4 2025 10:00 PM EDT")).toBe(true);
    expect(hasOffset("Aug 4 2025 10:00 PM")).toBe(false);
  });
});

describe("strings and Intl in a fake zone", () => {
  const instant = Date.UTC(2025, 7, 4, 12);

  it("are local to the zone, with its offset and name", () => {
    const { D } = realm("Europe/Berlin");
    const date = new D(instant);

    expect(date.toString()).toBe(
      "Mon Aug 04 2025 14:00:00 GMT+0200 (Central European Summer Time)",
    );
    expect(String(date)).toBe(date.toString());
    expect(date.toDateString()).toBe("Mon Aug 04 2025");
    expect(date.toTimeString()).toBe("14:00:00 GMT+0200 (Central European Summer Time)");
    expect(new D(Number.NaN).toString()).toBe("Invalid Date");
  });

  it("default toLocale* to the zone, unless one is given", () => {
    const { D } = realm("America/New_York");
    const date = new D(instant);

    expect(date.toLocaleString("en-US")).toBe("8/4/2025, 8:00:00 AM");
    expect(date.toLocaleDateString("en-US")).toBe("8/4/2025");
    expect(date.toLocaleTimeString("en-US", { timeZone: "UTC" })).toBe("12:00:00 PM");
    expect(date.toLocaleTimeString("en-US", { hour: "numeric" })).toBe("8 AM");
  });

  it("make the zone Intl's default, and keep Intl what it was", () => {
    const { global } = realm("Australia/Adelaide");
    const { DateTimeFormat } = global.Intl;

    expect(new DateTimeFormat().resolvedOptions().timeZone).toBe("Australia/Adelaide");
    expect(DateTimeFormat("en-US").resolvedOptions().timeZone).toBe("Australia/Adelaide");
    expect(new DateTimeFormat("en-US", { timeZone: "UTC" }).resolvedOptions().timeZone).toBe("UTC");
    expect(new DateTimeFormat()).toBeInstanceOf(DateTimeFormat);
    expect(new DateTimeFormat().constructor).toBe(DateTimeFormat);
    expect(DateTimeFormat.supportedLocalesOf(["en-US"])).toEqual(["en-US"]);
    expect(
      new DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23",
      }).format(),
    ).toBe("21:30");
  });

  it("go back to the browser's zone when the zone is unset", () => {
    const { source, global, D } = realm("Asia/Kolkata");
    const date = new D(instant);
    const host = new Date(instant);

    source.zone = undefined;

    expect(date.getTimezoneOffset()).toBe(host.getTimezoneOffset());
    expect(date.getHours()).toBe(host.getHours());
    expect(date.toString()).toBe(host.toString());
    expect(D.parse("2025-08-01T00:00")).toBe(Date.parse("2025-08-01T00:00"));
    expect(new global.Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
      new Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });
});

describe("Temporal.Now in a fake zone", () => {
  it("names the zone and defaults to it", () => {
    const zones: string[] = [];
    const Temporal = {
      Instant: {
        fromEpochMilliseconds: () => ({
          toZonedDateTimeISO: (zone: string) => {
            zones.push(zone);

            return { toPlainDateTime: () => 0, toPlainDate: () => 0, toPlainTime: () => 0 };
          },
        }),
      },
      Now: {
        timeZoneId: () => "UTC",
        plainDateISO: () => "real",
      } as Record<string, unknown> & { timeZoneId(): string },
    };
    let zone: string | undefined = "Asia/Kolkata";

    patchTemporal(
      Temporal,
      () => FAKE,
      () => zone,
    );

    expect(Temporal.Now.timeZoneId()).toBe("Asia/Kolkata");
    (Temporal.Now.plainDateISO as (zone?: string) => unknown)();
    (Temporal.Now.plainDateISO as (zone?: string) => unknown)("Europe/London");
    zone = undefined;
    expect(Temporal.Now.timeZoneId()).toBe("UTC");
    expect(zones).toEqual(["Asia/Kolkata", "Europe/London"]);
  });
});

describe("the dialog's helpers with a zone", () => {
  it("read and write the input as a reading in the zone", () => {
    expect(fromLocalInput("2025-08-01T00:00", "America/New_York")).toBe(Date.UTC(2025, 7, 1, 4));
    expect(fromLocalInput("2025-03-09T02:30:00", "America/New_York")).toBe(
      Date.UTC(2025, 2, 9, 7, 30),
    );
    expect(toLocalInput(Date.UTC(2025, 7, 1, 4), "America/New_York")).toBe("2025-08-01T00:00:00");
    expect(toLocalInput(Date.UTC(2025, 0, 1), "Asia/Kolkata")).toBe("2025-01-01T05:30:00");
    expect(fromLocalInput("2025-08-01", "UTC")).toBeNaN();
  });

  it("step by calendar days in the zone, keeping the clock reading across DST", () => {
    const before = Date.UTC(2025, 2, 8, 17);
    const after = shift(before, "+1d", "America/New_York");

    expect(after - before).toBe(23 * HOUR);
    expect(toLocalInput(after, "America/New_York")).toBe("2025-03-09T12:00:00");
  });

  it("keep a known zone in the state and drop an unknown one", () => {
    const state = { fake: 1, real: 2, stopped: false };

    expect(parseState(JSON.stringify({ ...state, zone: "Asia/Kolkata" }))).toEqual({
      ...state,
      zone: "Asia/Kolkata",
    });
    expect(parseState(JSON.stringify({ ...state, zone: "Mars/Olympus" }))).toEqual(state);
    expect(parseState(JSON.stringify({ ...state, zone: 5 }))).toEqual(state);
  });

  it("list and recognise the browser's zones", () => {
    const zones = timeZones();

    expect(zones[0]).toBe("UTC");
    expect(zones).toContain("Europe/London");
    expect(isTimeZone("UTC")).toBe(true);
    expect(isTimeZone("Asia/Kolkata")).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
    expect(isTimeZone("")).toBe(false);
  });
});
