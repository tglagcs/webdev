/**
 * Time travel: the state a tab's fake clock runs from, and the arithmetic.
 *
 * The state lives in the page's own `sessionStorage` under one key. That
 * scopes it the way the feature means it -- this tab, this origin, until the
 * tab closes -- and, unlike extension storage, it can be read synchronously
 * by the MAIN-world script at `document_start`, before any page script has
 * asked the time. The popup writes it from the isolated world, which shares
 * the storage but not the page's bindings, then fires an event on the
 * document so the running page picks the change up without a reload.
 */

import { fromWall, isTimeZone, toWall } from "./time-zone";

export const TIME_TRAVEL_KEY = "web-developer-time-travel";

export interface TimeTravelState {
  /** The fake time, as epoch milliseconds, at the moment it was set. */
  fake: number;

  /** The real time at that same moment, so the clock can run on from it. */
  real: number;

  /** A stopped clock always reads `fake`. */
  stopped: boolean;

  /** The IANA zone the page sees, when it is not the browser's own. */
  zone?: string;
}

/** What the page's clock reads, given the state and the real time now. */
export function fakeNow(state: TimeTravelState, realNow: number): number {
  return state.stopped ? state.fake : state.fake + (realNow - state.real);
}

/**
 * Reads the stored state, or null for a tab running on the real clock. Anything
 * malformed is treated as no state rather than as a time: a page that wrote
 * junk under our key should not end up in 1970.
 */
export function parseState(text: string | null | undefined): TimeTravelState | null {
  if (!text) {
    return null;
  }

  try {
    const value = JSON.parse(text) as Partial<TimeTravelState>;

    if (
      typeof value.fake === "number" &&
      Number.isFinite(value.fake) &&
      typeof value.real === "number" &&
      Number.isFinite(value.real)
    ) {
      const state: TimeTravelState = {
        fake: value.fake,
        real: value.real,
        stopped: value.stopped === true,
      };

      // An unknown zone is dropped, not the state: the time is still good.
      if (isTimeZone(value.zone)) {
        state.zone = value.zone;
      }

      return state;
    }
  } catch {
    // Fall through: not ours, or not finished writing.
  }

  return null;
}

const pad = (value: number, width = 2) => String(value).padStart(width, "0");

/**
 * The value of a `datetime-local` input for an instant: local time in `zone`,
 * or in the browser's zone without one.
 */
export function toLocalInput(epoch: number, zone?: string): string {
  if (zone === undefined) {
    const date = new Date(epoch);

    return (
      `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }

  const wall = new Date(toWall(zone, epoch));

  return (
    `${pad(wall.getUTCFullYear(), 4)}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}` +
    `T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}`
  );
}

/**
 * The instant a `datetime-local` value names, read in `zone` or the browser's
 * zone, or NaN if it names none. A time a zone skips or repeats resolves the
 * way the page's own Date would resolve it.
 */
export function fromLocalInput(value: string, zone?: string): number {
  if (!/^\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) {
    return Number.NaN;
  }

  return zone === undefined ? new Date(value).getTime() : fromWall(zone, Date.parse(`${value}Z`));
}

export type Shift = "-1d" | "+1d" | "+1w" | "+1M" | "+1y";

/**
 * Moves an instant by a calendar step in local time -- in `zone` if given. A
 * month or a year is a calendar step, not a fixed number of milliseconds --
 * Jan 31 plus a month is whatever Date makes of Feb 31, which is how every
 * date library behaves too.
 */
export function shift(epoch: number, by: Shift, zone?: string): number {
  // With a zone, the step is taken on the wall time with the UTC methods and
  // mapped back, so a step across a DST change keeps the clock reading.
  const date = new Date(zone === undefined ? epoch : toWall(zone, epoch));
  const local = zone === undefined;
  const get = (field: "Date" | "Month" | "FullYear") =>
    local ? date[`get${field}`]() : date[`getUTC${field}`]();
  const set = (field: "Date" | "Month" | "FullYear", value: number) =>
    local ? date[`set${field}`](value) : date[`setUTC${field}`](value);

  switch (by) {
    case "-1d":
      set("Date", get("Date") - 1);
      break;
    case "+1d":
      set("Date", get("Date") + 1);
      break;
    case "+1w":
      set("Date", get("Date") + 7);
      break;
    case "+1M":
      set("Month", get("Month") + 1);
      break;
    case "+1y":
      set("FullYear", get("FullYear") + 1);
      break;
  }

  return local ? date.getTime() : fromWall(zone, date.getTime());
}
