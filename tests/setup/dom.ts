/**
 * Fills in the standard DOM that happy-dom is missing.
 *
 * `document.images` is not implemented, though `document.links` and
 * `document.forms` are. Several image features iterate it, so without this
 * they throw on `images.length` and cannot be tested at all.
 *
 * Defined exactly as the spec does -- every `img` element in tree order, and
 * nothing else, so an `input[type=image]` is not included. The only departure
 * is that this returns a static list rather than a live HTMLCollection; that
 * is safe for the features using it, which change attributes on the elements
 * they visit and never add or remove one mid-loop. A feature that did would
 * need this revisited rather than trusted.
 */

// Defined on the instance rather than Document.prototype: happy-dom's global
// Document is not the constructor of the `document` the tests run against, so
// a prototype definition is never consulted.
if (!("images" in document)) {
  Object.defineProperty(document, "images", {
    configurable: true,
    get: () => document.querySelectorAll("img"),
  });
}
