/**
 * The fake clock: replacements for everything in a page that reads "now",
 * and, when a zone is set, everything that reads the time zone.
 *
 * The clock: `Date` (called, constructed with no arguments, and `Date.now`),
 * `Intl.DateTimeFormat`'s `format` and `formatToParts` given no date, and
 * `Temporal.Now` where the browser has it. A Date built from an instant is
 * the same Date, and `performance.now` and timers run on real time.
 *
 * The zone: every local-time method of `Date` -- the getters, the setters,
 * the `Date(y, m, d, ...)` constructor, parsing a string with no offset, the
 * string forms and `getTimezoneOffset` -- answers as if the browser were set
 * to that zone, and `Intl.DateTimeFormat`, `toLocale*String` and
 * `Temporal.Now` default to it. The UTC methods, `getTime`/`setTime` and a
 * string carrying `Z` or an offset are untouched; the time value is the truth
 * and only its reading changes.
 *
 * Installed only once a tab has a fake time -- the zone half only once it has
 * a zone -- and from then on asks `now()` and `zone()` on every read, so
 * switching either off in the popup puts the real one back without a reload.
 * Written against a window passed in, so the tests can install it on their
 * own.
 */

import { formatOffset, fromWall, parseInZone, toWall, zoneName, zoneOffset } from "@/lib/time-zone";

type DateConstructor = typeof Date;

/** The zone the page should see, or undefined for the browser's own. */
export type ZoneSource = () => string | undefined;

const noZone: ZoneSource = () => undefined;

/** Marks a window the clock is already in, shared across bundles by Symbol.for. */
const INSTALLED = Symbol.for("web-developer-time-travel");
const ZONE_INSTALLED = Symbol.for("web-developer-time-travel-zone");

/** Makes a replacement Date that reads `now()` wherever Date reads the clock. */
export function createFakeDate(
  Original: DateConstructor,
  now: () => number,
  zone: ZoneSource = noZone,
): DateConstructor {
  // A function rather than a class: Date called without `new` returns a
  // string, which a class constructor cannot do. Reflect.construct keeps
  // `new.target`, so `class MyDate extends Date` still builds a MyDate.
  function FakeDate(this: unknown, ...args: unknown[]): unknown {
    if (new.target === undefined) {
      // Through the prototype, which the zone half has replaced if it is in.
      return new Original(now()).toString();
    }

    const id = zone();

    if (args.length === 0) {
      args = [now()];
    } else if (id !== undefined && args.length === 1 && typeof args[0] === "string") {
      args = [parseInZone(args[0], id)];
    } else if (id !== undefined && args.length >= 2) {
      // Date.UTC does the constructor's own conversions, 0-99 as 19xx
      // included, and gives the wall time the arguments spell.
      args = [fromWall(id, Original.UTC(...(args as Parameters<typeof Date.UTC>)))];
    }

    return Reflect.construct(Original, args, new.target);
  }

  const parse = (text: string) => {
    const id = zone();

    return id === undefined ? Original.parse(text) : parseInZone(String(text), id);
  };

  Object.defineProperties(FakeDate, {
    length: { value: 7 },
    name: { value: "Date" },
    now: { value: () => Math.floor(now()), writable: true, configurable: true },
    parse: { value: parse, writable: true, configurable: true },
    UTC: { value: Original.UTC, writable: true, configurable: true },
    // Shared, so `instanceof` agrees with dates made before the swap and in
    // other code that kept a reference to the original.
    prototype: { value: Original.prototype, writable: false },
    toString: { value: () => "function Date() { [native code] }", configurable: true },
  });

  return FakeDate as unknown as DateConstructor;
}

/**
 * Makes `Intl.DateTimeFormat` format the fake now when it is given no date.
 * Returns what undoes it.
 */
export function patchDateTimeFormat(
  DateTimeFormat: typeof Intl.DateTimeFormat,
  now: () => number,
): () => void {
  const prototype = DateTimeFormat.prototype;
  const format = Object.getOwnPropertyDescriptor(prototype, "format")!;
  const formatToParts = prototype.formatToParts;

  Object.defineProperty(prototype, "format", {
    ...format,
    get(this: Intl.DateTimeFormat) {
      // The real getter returns a function bound to this formatter.
      const bound = format.get!.call(this) as (date?: Date | number) => string;

      return (date?: Date | number) => bound(date === undefined ? now() : date);
    },
  });

  prototype.formatToParts = function (this: Intl.DateTimeFormat, date?: Date | number) {
    return formatToParts.call(this, date === undefined ? now() : date);
  };

  return () => {
    Object.defineProperty(prototype, "format", format);
    prototype.formatToParts = formatToParts;
  };
}

interface TemporalLike {
  Instant: { fromEpochMilliseconds(epoch: number): TemporalInstant };
  Now: Record<string, unknown> & { timeZoneId(): string };
}

interface TemporalInstant {
  toZonedDateTimeISO(timeZone: string): {
    toPlainDateTime(): unknown;
    toPlainDate(): unknown;
    toPlainTime(): unknown;
  };
}

/**
 * Makes `Temporal.Now` read the fake now, and default to the fake zone, where
 * there is a Temporal.
 */
export function patchTemporal(
  Temporal: TemporalLike | undefined,
  now: () => number,
  zone: ZoneSource = noZone,
): void {
  if (!Temporal?.Now || !Temporal.Instant) {
    return;
  }

  const realTimeZoneId = Temporal.Now.timeZoneId.bind(Temporal.Now);
  const timeZoneId = () => zone() ?? realTimeZoneId();
  const instant = () => Temporal.Instant.fromEpochMilliseconds(Math.floor(now()));
  const zoned = (timeZone?: string) => instant().toZonedDateTimeISO(timeZone ?? timeZoneId());

  const replacements: Record<string, (timeZone?: string) => unknown> = {
    timeZoneId,
    instant,
    zonedDateTimeISO: zoned,
    plainDateTimeISO: (timeZone) => zoned(timeZone).toPlainDateTime(),
    plainDateISO: (timeZone) => zoned(timeZone).toPlainDate(),
    plainTimeISO: (timeZone) => zoned(timeZone).toPlainTime(),
  };

  for (const [name, replacement] of Object.entries(replacements)) {
    if (typeof Temporal.Now[name] === "function") {
      Object.defineProperty(Temporal.Now, name, {
        value: replacement,
        writable: true,
        configurable: true,
      });
    }
  }
}

/** Options with the zone filled in, unless the caller named one. */
function withZone(options: unknown, id: string): unknown {
  if (options === undefined) {
    return { timeZone: id };
  }

  if (options === null) {
    // The original throws for null; let it.
    return options;
  }

  const object = Object(options) as { timeZone?: unknown };

  // Inheriting rather than copying keeps getters and inherited options.
  return object.timeZone === undefined
    ? Object.create(object, { timeZone: { value: id, enumerable: true } })
    : options;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const LOCAL_GETTERS = {
  getFullYear: "getUTCFullYear",
  getMonth: "getUTCMonth",
  getDate: "getUTCDate",
  getDay: "getUTCDay",
  getHours: "getUTCHours",
  getMinutes: "getUTCMinutes",
  getSeconds: "getUTCSeconds",
  getMilliseconds: "getUTCMilliseconds",
} as const;

const LOCAL_SETTERS = {
  setFullYear: "setUTCFullYear",
  setMonth: "setUTCMonth",
  setDate: "setUTCDate",
  setHours: "setUTCHours",
  setMinutes: "setUTCMinutes",
  setSeconds: "setUTCSeconds",
  setMilliseconds: "setUTCMilliseconds",
} as const;

type Method = (this: Date, ...args: unknown[]) => unknown;

/**
 * Makes every local-time reading of Date, and Intl's default zone, follow
 * `zone()`. Idempotent. While `zone()` is undefined every replacement calls
 * straight through to the original.
 *
 * Each local reading is the UTC reading of the instant moved by the zone's
 * offset -- a "wall" Date -- and each local write is the UTC write on a wall
 * Date, mapped back to an instant by `fromWall`, which is where skipped and
 * repeated times are resolved.
 */
export function installFakeZone(target: typeof globalThis, zone: ZoneSource): void {
  const marked = target as typeof globalThis & { [ZONE_INSTALLED]?: true };

  if (marked[ZONE_INSTALLED]) {
    return;
  }

  marked[ZONE_INSTALLED] = true;

  const Original = target.Date;
  const proto = Original.prototype as unknown as Record<string, Method | undefined>;
  const utc = (name: string) => proto[name]!;
  const getTime = utc("getTime");
  const setTime = utc("setTime");

  /** Replaces a prototype method by one that applies only while a zone is set. */
  const replace = (name: string, zoned: (date: Date, id: string, args: unknown[]) => unknown) => {
    const original = utc(name);
    const replacement = {
      // A method, so it has the right name and is not a constructor.
      [name](this: Date, ...args: unknown[]): unknown {
        const id = zone();

        return id === undefined ? Reflect.apply(original, this, args) : zoned(this, id, args);
      },
    }[name];

    Object.defineProperty(replacement, "length", { value: original.length });
    Object.defineProperty(proto, name, {
      value: replacement,
      writable: true,
      configurable: true,
    });
  };

  /** The wall Date for a Date's instant, or null for an invalid one. */
  const wallOf = (date: Date, id: string): Date | null => {
    const time = getTime.call(date) as number;

    return Number.isNaN(time) ? null : new Original(toWall(id, time));
  };

  for (const [name, utcName] of Object.entries(LOCAL_GETTERS)) {
    const getter = utc(utcName);

    replace(name, (date, id) => {
      const wall = wallOf(date, id);

      return wall ? getter.call(wall) : Number.NaN;
    });
  }

  replace("getYear", (date, id) => {
    const wall = wallOf(date, id);

    return wall ? (utc("getUTCFullYear").call(wall) as number) - 1900 : Number.NaN;
  });

  replace("getTimezoneOffset", (date, id) => {
    const time = getTime.call(date) as number;

    // Plus zero, so no offset is +0 as natively rather than -0.
    return Number.isNaN(time) ? Number.NaN : -zoneOffset(id, time) / 60_000 + 0;
  });

  const write = (date: Date, id: string, wall: number) =>
    setTime.call(date, Number.isNaN(wall) ? Number.NaN : fromWall(id, wall));

  for (const [name, utcName] of Object.entries(LOCAL_SETTERS)) {
    const setter = utc(utcName);

    replace(name, (date, id, args) => {
      // The spec's one exception: setFullYear on an invalid date starts from
      // local midnight, 1 January 1970, rather than staying invalid.
      const wall = wallOf(date, id) ?? new Original(name === "setFullYear" ? 0 : Number.NaN);

      // The UTC setter does the argument conversions, in the spec's order,
      // and the overflow -- setHours(25) -- on the wall time.
      return write(date, id, setter.apply(wall, args) as number);
    });
  }

  replace("setYear", (date, id, args) => {
    const wall = wallOf(date, id) ?? new Original(0);
    const year = Number(args[0]);

    if (Number.isNaN(year)) {
      return setTime.call(date, Number.NaN);
    }

    const whole = Math.trunc(year);

    return write(
      date,
      id,
      utc("setUTCFullYear").call(wall, whole >= 0 && whole <= 99 ? 1900 + whole : year) as number,
    );
  });

  const pad = (value: number, width = 2) => String(value).padStart(width, "0");

  const dateString = (wall: Date) => {
    const year = wall.getUTCFullYear();

    return (
      `${WEEKDAYS[wall.getUTCDay()]} ${MONTHS[wall.getUTCMonth()]} ${pad(wall.getUTCDate())} ` +
      `${year < 0 ? "-" : ""}${pad(Math.abs(year), 4)}`
    );
  };

  const timeString = (wall: Date, id: string, time: number) =>
    `${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())} ` +
    `GMT${formatOffset(zoneOffset(id, time), "")} (${zoneName(id, time)})`;

  // Pairs, not an object: a key named toString confuses the contextual types.
  const strings: [string, (wall: Date, id: string, time: number) => string][] = [
    ["toString", (wall, id, time) => `${dateString(wall)} ${timeString(wall, id, time)}`],
    ["toDateString", (wall) => dateString(wall)],
    ["toTimeString", (wall, id, time) => timeString(wall, id, time)],
  ];

  for (const [name, format] of strings) {
    replace(name, (date, id) => {
      const wall = wallOf(date, id);

      return wall ? format(wall, id, getTime.call(date) as number) : "Invalid Date";
    });
  }

  for (const name of ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]) {
    const original = utc(name);

    replace(name, (date, id, [locales, options]) =>
      original.call(date, locales, withZone(options, id)),
    );
  }

  const DateTimeFormat = target.Intl.DateTimeFormat;

  function FakeDateTimeFormat(this: unknown, locales?: unknown, options?: unknown): unknown {
    const id = zone();
    const args = [locales, id === undefined ? options : withZone(options, id)];

    return new.target === undefined
      ? Reflect.apply(DateTimeFormat, undefined, args)
      : Reflect.construct(DateTimeFormat, args, new.target);
  }

  Object.defineProperties(FakeDateTimeFormat, {
    length: { value: 0 },
    name: { value: "DateTimeFormat" },
    supportedLocalesOf: {
      value: DateTimeFormat.supportedLocalesOf,
      writable: true,
      configurable: true,
    },
    prototype: { value: DateTimeFormat.prototype, writable: false },
    toString: {
      value: () => "function DateTimeFormat() { [native code] }",
      configurable: true,
    },
  });

  Object.defineProperty(DateTimeFormat.prototype, "constructor", {
    value: FakeDateTimeFormat,
    writable: true,
    configurable: true,
  });

  target.Intl.DateTimeFormat = FakeDateTimeFormat as unknown as typeof Intl.DateTimeFormat;
}

/** Puts the fake clock into a window. Idempotent: a second call does nothing. */
export function installFakeClock(
  target: typeof globalThis,
  now: () => number,
  zone: ZoneSource = noZone,
): void {
  const marked = target as typeof globalThis & { [INSTALLED]?: true };

  if (marked[INSTALLED]) {
    return;
  }

  marked[INSTALLED] = true;

  const FakeDate = createFakeDate(target.Date, now, zone);

  // So `new Date().constructor === Date` still holds for the page.
  Object.defineProperty(target.Date.prototype, "constructor", {
    value: FakeDate,
    writable: true,
    configurable: true,
  });

  target.Date = FakeDate;
  patchDateTimeFormat(target.Intl.DateTimeFormat, now);
  patchTemporal((target as { Temporal?: TemporalLike }).Temporal, now, zone);
}
