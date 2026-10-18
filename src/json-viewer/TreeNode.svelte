<!--
  One node of the JSON tree, and its children when it is open.

  Children are rendered only while their container is open, and a container
  shows PAGE_SIZE of them at a time, so a large response costs what is on
  screen rather than what is in the document.
-->
<script lang="ts">
  import { t } from "@/lib/i18n";
  import {
    PAGE_SIZE,
    childCount,
    children,
    copyText,
    displayText,
    formatPath,
    isContainer,
    pathKey,
    splitMatches,
    type JsonValue,
    type Segment,
  } from "@/lib/json-view";
  import type { ViewerState } from "./state.svelte";
  import TreeNode from "./TreeNode.svelte";

  interface Props {
    viewer: ViewerState;
    value: JsonValue;
    path: Segment[];
    segment?: Segment;
    comma?: boolean;
  }

  let { viewer, value, path, segment, comma = false }: Props = $props();

  const key = $derived(pathKey(path));
  const container = $derived(isContainer(value));
  const isArray = $derived(Array.isArray(value));
  const open = $derived(container && viewer.isOpen(key));
  const count = $derived(childCount(value));
  const shown = $derived(open ? children(value).slice(0, viewer.limit(key)) : []);
  const hidden = $derived(count - shown.length);
  const match = $derived(viewer.query.trim() !== "" && viewer.isMatch(key));
  const brackets = $derived(isArray ? ["[", "]"] : ["{", "}"]);

  function summary(): string {
    if (isArray) {
      return count === 1 ? t("jsonItem") : t("jsonItems", String(count));
    }

    return count === 1 ? t("jsonKey") : t("jsonKeys", String(count));
  }

  function parts(text: string) {
    return match ? splitMatches(text, viewer.query.trim()) : [{ text, match: false }];
  }

  const primitiveClass = $derived.by(() => {
    if (typeof value === "string") {
      return "text-emerald-700 dark:text-emerald-400";
    }

    if (typeof value === "number") {
      return "text-amber-700 dark:text-amber-300";
    }

    return "text-violet-700 dark:text-violet-300";
  });

  const isUrl = $derived(typeof value === "string" && /^https?:\/\/\S+$/.test(value));
</script>

{#snippet highlighted(text: string)}
  {#each parts(text) as part, index (index)}
    {#if part.match}<mark class="rounded-sm bg-warn/35 text-ink">{part.text}</mark
      >{:else}{part.text}{/if}
  {/each}
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="group relative flex items-start rounded py-px pr-20 pl-1 hover:bg-surface-raised
         {viewer.isSelected(key) ? 'bg-accent/10 hover:bg-accent/15' : ''}"
  data-path={key}
  role="treeitem"
  aria-selected={viewer.isSelected(key)}
  aria-expanded={container ? open : undefined}
  tabindex="-1"
  onclick={() => viewer.select(path)}
>
  {#if container && count > 0}
    <button
      type="button"
      class="-ml-4 w-4 shrink-0 text-center text-ink-muted hover:text-ink"
      aria-label={open ? t("collapseAll") : t("expandAll")}
      onclick={(event) => {
        event.stopPropagation();
        viewer.toggle(key);
      }}>{open ? "▾" : "▸"}</button
    >
  {/if}

  <span class="min-w-0 break-words whitespace-pre-wrap">
    {#if segment !== undefined}
      {#if typeof segment === "number"}
        <span class="text-ink-muted">{segment}</span>
      {:else}
        <span class="text-sky-700 dark:text-sky-300">"{@render highlighted(segment)}"</span>
      {/if}<span class="text-ink-muted">: </span>
    {/if}

    {#if container}
      <span class="text-ink-muted">{brackets[0]}</span>
      {#if !open || count === 0}
        {#if count > 0}
          <button
            type="button"
            class="rounded px-1 text-xs text-ink-muted hover:bg-surface-sunken hover:text-ink"
            onclick={(event) => {
              event.stopPropagation();
              viewer.toggle(key);
            }}>{summary()}</button
          >
        {/if}<span class="text-ink-muted">{brackets[1]}{comma ? "," : ""}</span>
      {/if}
    {:else if isUrl}
      <a
        class="{primitiveClass} underline decoration-dotted underline-offset-2"
        href={value as string}
        target="_blank"
        rel="noreferrer noopener"
        onclick={(event) => event.stopPropagation()}>"{@render highlighted(value as string)}"</a
      ><span class="text-ink-muted">{comma ? "," : ""}</span>
    {:else}
      <span class={primitiveClass}
        >{typeof value === "string" ? '"' : ""}{@render highlighted(displayText(value))}{typeof value ===
        "string"
          ? '"'
          : ""}</span
      ><span class="text-ink-muted">{comma ? "," : ""}</span>
    {/if}
  </span>

  <span
    class="absolute top-0 right-1 gap-1 font-sans
           {viewer.isSelected(key) ? 'flex' : 'hidden group-hover:flex'}"
  >
    <button
      type="button"
      class="rounded border border-line bg-surface px-1.5 text-[11px] text-ink-muted hover:text-ink"
      onclick={(event) => {
        event.stopPropagation();
        void viewer.copy(copyText(value), t("jsonCopied"));
      }}>{t("jsonCopyValue")}</button
    >
    <button
      type="button"
      class="rounded border border-line bg-surface px-1.5 text-[11px] text-ink-muted hover:text-ink"
      onclick={(event) => {
        event.stopPropagation();
        void viewer.copy(formatPath(path), t("jsonCopied"));
      }}>{t("jsonCopyPath")}</button
    >
  </span>
</div>

{#if open && count > 0}
  <div class="ml-1.5 border-l border-line pl-4" role="group">
    {#each shown as [childSegment, child], index (childSegment)}
      <TreeNode
        {viewer}
        value={child}
        path={[...path, childSegment]}
        segment={childSegment}
        comma={index < count - 1}
      />
    {/each}

    {#if hidden > 0}
      <button
        type="button"
        class="my-0.5 ml-1 rounded border border-line px-2 font-sans text-xs text-ink-muted
               hover:bg-surface-raised hover:text-ink"
        onclick={() => viewer.showMore(key)}
      >
        {t("jsonShowMore", String(Math.min(hidden, PAGE_SIZE)))}
      </button>
    {/if}
  </div>
  <div class="pl-1 text-ink-muted">{brackets[1]}{comma ? "," : ""}</div>
{/if}
