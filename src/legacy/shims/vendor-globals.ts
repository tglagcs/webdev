/**
 * The two library globals the legacy popup code still expects.
 *
 * Upstream loaded Mustache and DOMPurify with <script> tags in the markup, so
 * the overlay files reach for them by bare name -- `Mustache.render(...)`,
 * `DOMPurify.sanitize(...)`. The Svelte popup has no such tags, and a bundled
 * import is a module binding the bundler renames, so the names have to be put
 * back on globalThis explicitly.
 *
 * Both go with the two dynamic lists and the notification rendering that use
 * them.
 */

import DOMPurify from "dompurify";
import Mustache from "mustache";

Object.assign(globalThis, { DOMPurify, Mustache });
