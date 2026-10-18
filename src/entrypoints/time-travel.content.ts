/**
 * The fake clock's place in the page.
 *
 * Runs in the MAIN world, the page's own, because that is where the page's
 * `Date` is -- the isolated world has a separate one. And at
 * `document_start`, in every frame, so it is in place before any page script
 * asks the time. On a tab with no fake time it reads one sessionStorage key
 * and touches nothing else.
 *
 * There are no extension APIs here; the popup reaches this script only
 * through the storage key and the event of the same name, which it fires on
 * the document after writing. See lib/time-travel.ts.
 */

import { installFakeClock, installFakeZone } from "@/features/fake-clock";
import { TIME_TRAVEL_KEY, fakeNow, parseState, type TimeTravelState } from "@/lib/time-travel";

export default defineContentScript({
  matches: ["<all_urls>"],
  world: "MAIN",
  runAt: "document_start",
  allFrames: true,
  matchAboutBlank: true,
  main() {
    // Taken before anything is replaced, and before a page script could
    // replace them itself.
    const realNow = Date.now;
    let read: () => string | null = () => null;

    try {
      const storage = window.sessionStorage;
      const getItem = Storage.prototype.getItem;

      read = () => getItem.call(storage, TIME_TRAVEL_KEY);
    } catch {
      // A sandboxed frame or an opaque origin has no sessionStorage, so it
      // can have no fake time either.
    }

    let state: TimeTravelState | null = null;
    const now = () => (state ? fakeNow(state, realNow()) : realNow());
    const zone = () => state?.zone;

    const sync = (): void => {
      state = parseState(read());

      if (state) {
        installFakeClock(window, now, zone);
      }

      // Separately, and only once there is a zone: it replaces every
      // local-time method on Date.prototype, which a tab that only moves
      // the clock has no reason to carry.
      if (state?.zone) {
        installFakeZone(window, zone);
      }
    };

    sync();
    document.addEventListener(TIME_TRAVEL_KEY, sync);
  },
});
