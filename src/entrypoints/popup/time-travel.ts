/**
 * Reading and writing a tab's fake time from the popup.
 *
 * Both closures run in the isolated world and use nothing but their
 * arguments and the page's globals, since executeScript serialises them --
 * see the closure section of CLAUDE.md. The write goes to every frame, each
 * with its own origin and so its own sessionStorage, and fires the event the
 * MAIN-world script listens for, so the page switches clocks without a reload.
 */

import { TIME_TRAVEL_KEY, parseState, type TimeTravelState } from "@/lib/time-travel";

export async function readTimeTravel(tabId: number): Promise<TimeTravelState | null> {
  const [frame] = await browser.scripting.executeScript({
    target: { tabId },
    func: (key: string) => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    args: [TIME_TRAVEL_KEY],
  });

  return parseState(frame?.result as string | null | undefined);
}

/** Sets the tab's fake time, or puts it back on the real clock for null. */
export async function writeTimeTravel(tabId: number, state: TimeTravelState | null): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: (key: string, value: string | null) => {
      try {
        if (value === null) {
          sessionStorage.removeItem(key);
        } else {
          sessionStorage.setItem(key, value);
        }
      } catch {
        // No storage in this frame: it keeps the real clock.
      }

      document.dispatchEvent(new Event(key));
    },
    args: [TIME_TRAVEL_KEY, state ? JSON.stringify(state) : null],
  });
}
