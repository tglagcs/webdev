/**
 * The upstream namespace, kept alive on globalThis.
 *
 * Every legacy file opened with:
 *
 *     var WebDeveloper = WebDeveloper || {};
 *
 * Under gulp-concat that was a no-op after the first file and the namespace
 * was a script global. Under ES modules `var` is module-scoped, so each file
 * would get its own empty namespace and nothing would resolve.
 *
 * This matters beyond tidiness: the embedded widgets are injected into a host
 * page as separate files and rely on WebDeveloper.Common already being there,
 * put in place by the always-on content script. That contract only survives if
 * the namespace really is global, so it is anchored to globalThis rather than
 * passed around as a module export.
 *
 * Shrinks to nothing as the legacy files are ported; delete when src/legacy is
 * empty.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const scope = globalThis as any;

scope.WebDeveloper ??= {};

export const WebDeveloper = scope.WebDeveloper;
