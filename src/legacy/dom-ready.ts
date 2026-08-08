/**
 * Restores the load timing the legacy page scripts were written against.
 *
 * Fifteen of them end with:
 *
 *     if (document.readyState === "loading") {
 *       document.addEventListener("DOMContentLoaded", initialize);
 *     } else {
 *       initialize();
 *     }
 *
 * Upstream concatenated them into one classic script at the end of <body>,
 * which runs while the document is still parsing. readyState was "loading",
 * so every initialise deferred to DOMContentLoaded and therefore ran after
 * all of the files had been evaluated.
 *
 * A module script is deferred and runs after parsing, so readyState is
 * "interactive" and each file initialises the moment it is imported --
 * overlay/cookies.js calls WebDeveloper.Overlay.updateContentSettingMenu
 * before overlay/overlay.js, which defines it, has been imported.
 *
 * So: report "loading" and collect the DOMContentLoaded registrations while
 * the legacy modules evaluate, then run them in registration order once the
 * imports are done. Registrations are captured rather than a synthetic event
 * being dispatched, because Bootstrap has already handled the real one and
 * would re-initialise its data-api components.
 *
 * Import this before the legacy modules and call flushDomReady() after them.
 * Delete it when the last readyState tail is gone.
 */

type Listener = EventListenerOrEventListenerObject;

const pending: Listener[] = [];
const addEventListener = document.addEventListener.bind(document);

const needed = document.readyState !== "loading";

if (needed) {
  Object.defineProperty(document, "readyState", {
    configurable: true,
    get: () => "loading",
  });

  document.addEventListener = function (type: string, listener: Listener, options?: unknown) {
    if (type === "DOMContentLoaded" && listener) {
      pending.push(listener);
      return;
    }

    return addEventListener(type, listener, options as AddEventListenerOptions);
  } as typeof document.addEventListener;
}

export function flushDomReady(): void {
  if (!needed) {
    // The document really was still parsing, so the real event is still
    // coming and the legacy handlers are registered against it.
    return;
  }

  document.addEventListener = addEventListener;
  // Removes the own property added above, restoring the prototype getter.
  Reflect.deleteProperty(document, "readyState");

  const event = new Event("DOMContentLoaded");

  for (const listener of pending.splice(0)) {
    if (typeof listener === "function") {
      listener.call(document, event);
    } else {
      listener.handleEvent(event);
    }
  }
}
