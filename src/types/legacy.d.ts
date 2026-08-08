/**
 * The upstream JavaScript under src/legacy/js is imported for its side effects
 * only -- each file attaches to the global WebDeveloper namespace and exports
 * nothing. It is excluded from type-checking (see tsconfig.json), so declare
 * it here to keep the imports resolvable.
 *
 * Delete along with src/legacy/js.
 */
declare module "@/legacy/js/*";
