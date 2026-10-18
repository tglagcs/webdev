/**
 * What the JSON viewer is showing: which containers are open, how far each
 * pages, what is selected and what the search found.
 *
 * One instance per document, handed down the tree rather than held in a
 * module, so the paste page can throw it away and start again.
 */

import { SvelteMap, SvelteSet } from "svelte/reactivity";

import {
  PAGE_SIZE,
  maxDepth,
  pathKey,
  pathsToDepth,
  search,
  type JsonValue,
  type Segment,
} from "@/lib/json-view";

export type JsonView = "tree" | "pretty" | "raw";

export class ViewerState {
  readonly value: JsonValue;
  readonly depth: number;

  view = $state<JsonView>("tree");
  open = new SvelteSet<string>();
  limits = new SvelteMap<string, number>();
  selected = $state<Segment[]>([]);

  query = $state("");
  matches = $state<Segment[][]>([]);
  matchKeys = $state(new Set<string>());
  current = $state(-1);

  constructor(value: JsonValue) {
    this.value = value;
    this.depth = maxDepth(value);

    // Two levels: the shape of a typical API response at a glance, without
    // unfolding a large one into thousands of rows.
    this.expandTo(2);
  }

  isOpen(key: string): boolean {
    return this.open.has(key);
  }

  toggle(key: string): void {
    if (this.open.has(key)) {
      this.open.delete(key);
    } else {
      this.open.add(key);
    }
  }

  limit(key: string): number {
    return this.limits.get(key) ?? PAGE_SIZE;
  }

  showMore(key: string): void {
    this.limits.set(key, this.limit(key) + PAGE_SIZE);
  }

  expandTo(level: number): void {
    this.replaceOpen(pathsToDepth(this.value, level));
  }

  expandAll(): void {
    this.expandTo(Infinity);
  }

  collapseAll(): void {
    // The root stays open: a single collapsed line says nothing.
    this.replaceOpen(new Set([pathKey([])]));
  }

  select(path: Segment[]): void {
    this.selected = path;
  }

  isSelected(key: string): boolean {
    return pathKey(this.selected) === key;
  }

  /** Runs a search and opens the tree down to every match. */
  find(query: string): void {
    this.query = query;

    const result = search(this.value, query.trim());

    this.matches = result.matches;
    this.matchKeys = new Set(result.matches.map(pathKey));
    this.current = -1;

    if (query.trim() === "") {
      return;
    }

    for (const key of result.open) {
      this.open.add(key);
    }

    for (const [key, limit] of result.limits) {
      if (limit > this.limit(key)) {
        this.limits.set(key, limit);
      }
    }
  }

  isMatch(key: string): boolean {
    return this.matchKeys.has(key);
  }

  /** Moves to the next or previous match and selects it. */
  step(by: 1 | -1): Segment[] | undefined {
    if (this.matches.length === 0) {
      return undefined;
    }

    this.current = (this.current + by + this.matches.length) % this.matches.length;
    this.selected = this.matches[this.current]!;

    return this.selected;
  }

  /** A short confirmation, such as "Copied", shown and then cleared. */
  notice = $state<string | null>(null);
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;

  flash(message: string): void {
    this.notice = message;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => (this.notice = null), 1500);
  }

  /**
   * Copies text, falling back to execCommand where the async clipboard is
   * refused -- which it is inside a frame without `clipboard-write`, and on
   * some Firefox builds outside a secure context.
   */
  async copy(text: string, message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");

      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    this.flash(message);
  }

  private replaceOpen(keys: Set<string>): void {
    this.open.clear();

    for (const key of keys) {
      this.open.add(key);
    }
  }
}
