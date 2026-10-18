/**
 * Time-zone arithmetic for time travel: what a named zone's clock reads at an
 * instant, and which instant a reading on that clock names.
 *
 * Everything is derived from `Intl.DateTimeFormat`, the one place a browser
 * exposes its zone database. A "wall" time below is a local reading encoded
 * as if it were UTC -- `Date.UTC(y, m, d, h, ...)` of what the clock shows --
 * so that ordinary millisecond arithmetic works on it.
 *
 * `Date` and `Intl.DateTimeFormat` are captured when this module evaluates.
 * In the page that is at `document_start`, before the fake clock replaces
 * them and before any page script could.
 */

const NativeDate = Date;
const NativeDateTimeFormat = Intl.DateTimeFormat;
const nativeParse = Date.parse;

// The browser-zone getters, which the fake zone replaces on the shared
// prototype -- so the fallback in parseInZone calls these, not the methods.
const native = {
  year: Date.prototype.getFullYear,
  month: Date.prototype.getMonth,
  day: Date.prototype.getDate,
  hours: Date.prototype.getHours,
  minutes: Date.prototype.getMinutes,
  seconds: Date.prototype.getSeconds,
  milliseconds: Date.prototype.getMilliseconds,
};

const DAY = 86_400_000;

/** The largest time value a Date can hold, either side of 1970. */
const LIMIT = 8.64e15;

interface Formatters {
  parts: Intl.DateTimeFormat;
  name: Intl.DateTimeFormat;
}

const formatters = new Map<string, Formatters>();

function formattersFor(zone: string): Formatters {
  let found = formatters.get(zone);

  if (!found) {
    found = {
      // en-US for the era names it gives; h23 so midnight is 0 and not 24.
      parts: new NativeDateTimeFormat("en-US", {
        timeZone: zone,
        hourCycle: "h23",
        era: "short",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      }),
      name: new NativeDateTimeFormat("en-US", { timeZone: zone, timeZoneName: "long" }),
    };
    formatters.set(zone, found);
  }

  return found;
}

/** Days since 1970-01-01 for a proleptic Gregorian date; month is 1-12. */
function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;

  return era * 146_097 + dayOfEra - 719_468;
}

// Asked for every getter call on every Date, so remembered. Keyed by the
// whole second, the finest an offset is ever given to.
const offsets = new Map<string, number>();

/** How far the zone's clock is ahead of UTC at an instant, in milliseconds. */
export function zoneOffset(zone: string, epoch: number): number {
  const second = Math.floor(Math.min(Math.max(epoch, -LIMIT), LIMIT) / 1000) * 1000;
  const key = `${zone} ${second}`;
  const cached = offsets.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const field: Record<string, string> = {};

  for (const part of formattersFor(zone).parts.formatToParts(second)) {
    field[part.type] = part.value;
  }

  const year = Number(field.year);
  const wall =
    daysFromCivil(field.era === "BC" ? 1 - year : year, Number(field.month), Number(field.day)) *
      DAY +
    Number(field.hour) * 3_600_000 +
    Number(field.minute) * 60_000 +
    Number(field.second) * 1000;
  const offset = wall - second;

  if (offsets.size >= 2048) {
    offsets.clear();
  }

  offsets.set(key, offset);

  return offset;
}

/** The zone's clock reading at an instant, as a wall time. */
export function toWall(zone: string, epoch: number): number {
  return epoch + zoneOffset(zone, epoch);
}

/**
 * The instant a wall time names in a zone, resolved as the spec and every
 * browser resolve it: a reading that happens twice, in the hour a clock goes
 * back, is the earlier instant; one that never happens, in the hour it goes
 * forward, is read with the offset from before the change -- so 02:30 on a
 * spring-forward night is 03:30 by the new offset.
 */
export function fromWall(zone: string, wall: number): number {
  if (!Number.isFinite(wall)) {
    return Number.NaN;
  }

  // A wall time is within a day of its instant, and no zone changes offset
  // twice in two days, so the offsets either side are all the candidates.
  const before = zoneOffset(zone, wall - DAY);
  const after = zoneOffset(zone, wall + DAY);
  const valid = [before, after]
    .map((offset) => wall - offset)
    .filter((epoch) => toWall(zone, epoch) === wall);

  return valid.length > 0 ? Math.min(...valid) : wall - before;
}

/** The zone's long name at an instant, e.g. "British Summer Time". */
export function zoneName(zone: string, epoch: number): string {
  const parts = formattersFor(zone).name.formatToParts(Math.min(Math.max(epoch, -LIMIT), LIMIT));

  return parts.find((part) => part.type === "timeZoneName")?.value ?? zone;
}

/** An offset as `+05:30`, or `+0530` without the separator. */
export function formatOffset(offset: number, separator = ":"): string {
  const minutes = Math.trunc(Math.abs(offset) / 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${offset < 0 ? "-" : "+"}${pad(Math.floor(minutes / 60))}${separator}${pad(minutes % 60)}`;
}

function supportedZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

/** Every zone the browser knows, sorted, with UTC first. */
export function timeZones(): string[] {
  return [
    "UTC",
    ...supportedZones()
      .filter((zone) => zone !== "UTC")
      .sort(),
  ];
}

/**
 * Whether the browser knows a zone by this id. The supported list holds only
 * canonical ids -- Node's has Asia/Calcutta where Chrome's has Asia/Kolkata,
 * and Chrome's has no UTC -- so an id outside it is checked by the formatter,
 * which accepts every alias.
 */
export function isTimeZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || zone === "") {
    return false;
  }

  if (zone === "UTC" || supportedZones().includes(zone)) {
    return true;
  }

  try {
    new NativeDateTimeFormat("en-US", { timeZone: zone });

    return true;
  } catch {
    return false;
  }
}

/** The browser's own zone. */
export function systemTimeZone(): string {
  return new NativeDateTimeFormat().resolvedOptions().timeZone;
}

/**
 * The only strings Date reads as UTC without saying so: an ISO date with no
 * time, `2025-08-01`, `2025-08` or `2025`. Any variation -- a slash, a space
 * either side -- is local time.
 */
const ISO_DATE_ONLY = /^(?:[+-]\d{6}|\d{4})(?:-\d{2}(?:-\d{2})?)?$/;

/** A trailing zone word: `Z` after a time, `UTC`, `GMT`, or a US abbreviation. */
const ZONE_WORD = /(?:\d\s*Z|\sZ|\bUTC?|\bGMT|\b[ECMP][SD]T)$/i;

/** A trailing numeric offset, after a time or after UTC/GMT. */
const NUMERIC_OFFSET = /(?:\d\s*(?:[ap]\.?m\.?)?|\bUTC?|\bGMT)\s*[+-]\d{1,2}(?::?\d{2})?$/i;

/** A string that names its own offset, and so an instant in any zone. */
export function hasOffset(text: string): boolean {
  const trimmed = text.replace(/\s*\([^)]*\)\s*$/, "").trim();

  // An ISO date's own hyphens are not an offset: "2025-08-01" ends in "-01".
  if (/^[+-]?\d+-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }

  return ZONE_WORD.test(trimmed) || (trimmed.includes(":") && NUMERIC_OFFSET.test(trimmed));
}

/**
 * `Date.parse` as it would read a string in a browser set to `zone`. A string
 * that names its offset, or an ISO date-only string, is unaffected.
 *
 * The rest is parsed as UTC to get its wall time, by appending a zone the
 * parser understands. Where that does not parse, the browser's own reading
 * is taken apart into its local fields instead -- which is the same wall time
 * except inside a gap in the browser's zone, the only place the two differ.
 */
export function parseInZone(text: string, zone: string): number {
  if (ISO_DATE_ONLY.test(text) || hasOffset(text)) {
    return nativeParse(text);
  }

  const trimmed = text.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const asUTC = /^\S+T\S+$/.test(trimmed)
    ? `${trimmed}Z`
    : trimmed.includes(":")
      ? `${trimmed} GMT`
      : `${trimmed} 00:00 GMT`;
  let wall = nativeParse(asUTC);

  if (Number.isNaN(wall)) {
    const local = nativeParse(text);

    if (Number.isNaN(local)) {
      return Number.NaN;
    }

    const date = new NativeDate(local);
    const get = (getter: (this: Date) => number) => getter.call(date);

    wall =
      daysFromCivil(get(native.year), get(native.month) + 1, get(native.day)) * DAY +
      get(native.hours) * 3_600_000 +
      get(native.minutes) * 60_000 +
      get(native.seconds) * 1000 +
      get(native.milliseconds);
  }

  return fromWall(zone, wall);
}
