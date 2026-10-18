<!--
  The JSON viewer: a toolbar, the document as a tree, pretty-printed or raw,
  and a status bar with the selected path.

  The same component runs in three places -- over a JSON response in the
  page's own tab, in a tab of its own opened from the popup, and on the paste
  page -- and does not know which.
-->
<script lang="ts">
  import { tick } from "svelte";

  import { t } from "@/lib/i18n";
  import {
    downloadName,
    formatBytes,
    formatPath,
    pathKey,
    tokenize,
    type JsonValue,
    type Segment,
  } from "@/lib/json-view";
  import { ViewerState, type JsonView } from "./state.svelte";
  import TreeNode from "./TreeNode.svelte";

  interface Props {
    value: JsonValue;
    text: string;
    url?: string;
    prefix?: string;
    onEdit?: () => void;
  }

  let { value, text, url, prefix = "", onEdit }: Props = $props();

  // svelte-ignore state_referenced_locally
  const viewer = new ViewerState(value);

  /** Above this the pretty view is plain text: tens of thousands of spans stall the tab. */
  const COLOUR_LIMIT = 1_500_000;

  const pretty = $derived(viewer.view === "pretty" ? JSON.stringify(value, null, 2) : "");
  const tokens = $derived(pretty.length <= COLOUR_LIMIT ? tokenize(pretty) : null);
  const levels = $derived(Array.from({ length: Math.min(viewer.depth, 5) }, (_v, index) => index + 1));

  let searchInput: HTMLInputElement | undefined = $state();
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const VIEWS: { id: JsonView; label: string }[] = [
    { id: "tree", label: t("jsonTree") },
    { id: "pretty", label: t("jsonPretty") },
    { id: "raw", label: t("jsonRaw") },
  ];

  function onSearch(event: Event): void {
    const query = (event.currentTarget as HTMLInputElement).value;

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => viewer.find(query), 150);
  }

  async function reveal(path: Segment[] | undefined): Promise<void> {
    if (!path) {
      return;
    }

    await tick();

    document
      .querySelector(`[data-path="${CSS.escape(pathKey(path))}"]`)
      ?.scrollIntoView({ block: "center" });
  }

  function onSearchKey(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      clearTimeout(searchTimer);

      if (viewer.query !== searchInput?.value) {
        viewer.find(searchInput?.value ?? "");
      }

      void reveal(viewer.step(event.shiftKey ? -1 : 1));
    } else if (event.key === "Escape") {
      searchInput!.value = "";
      viewer.find("");
    }
  }

  function onWindowKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    if (event.key === "/" && !/^(INPUT|TEXTAREA)$/.test(target.tagName)) {
      event.preventDefault();
      viewer.view = "tree";
      searchInput?.focus();
    }
  }

  function download(): void {
    const link = document.createElement("a");

    link.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    link.download = downloadName(url);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /** The selected path, one link per step, so an ancestor is one click away. */
  const crumbs = $derived(
    viewer.selected.map((_segment, index) => viewer.selected.slice(0, index + 1)),
  );

  const buttonClass =
    "rounded-md border border-line px-2 py-1 text-xs text-ink hover:bg-surface-raised";
</script>

<svelte:window onkeydown={onWindowKey} />

<div class="flex h-screen flex-col bg-surface text-ink">
  <header
    class="flex flex-wrap items-center gap-2 border-b border-line bg-surface-raised px-3 py-2 text-xs"
  >
    <img src="/svg/logos/color/logo.svg" width="18" height="18" alt="" />

    <div class="flex rounded-md border border-line bg-surface p-0.5" role="tablist">
      {#each VIEWS as view (view.id)}
        <button
          type="button"
          role="tab"
          aria-selected={viewer.view === view.id}
          class="rounded px-2.5 py-0.5 text-ink-muted hover:text-ink
                 aria-selected:bg-surface-raised aria-selected:text-ink aria-selected:shadow-sm"
          onclick={() => (viewer.view = view.id)}>{view.label}</button
        >
      {/each}
    </div>

    {#if viewer.view === "tree"}
      <div class="flex items-center gap-1">
        <input
          bind:this={searchInput}
          type="search"
          placeholder={t("jsonSearch")}
          class="w-56 rounded-md border border-line bg-surface-sunken px-2 py-1 text-xs text-ink
                 outline-none focus:border-accent"
          oninput={onSearch}
          onkeydown={onSearchKey}
        />
        {#if viewer.query.trim() !== ""}
          <span class="min-w-14 text-ink-muted tabular-nums">
            {viewer.matches.length === 0
              ? t("jsonNoMatches")
              : `${viewer.current + 1 || "–"} / ${viewer.matches.length}`}
          </span>
          <button
            type="button"
            class={buttonClass}
            aria-label="↑"
            disabled={viewer.matches.length === 0}
            onclick={() => reveal(viewer.step(-1))}>↑</button
          >
          <button
            type="button"
            class={buttonClass}
            aria-label="↓"
            disabled={viewer.matches.length === 0}
            onclick={() => reveal(viewer.step(1))}>↓</button
          >
        {/if}
      </div>

      <div class="flex items-center gap-1">
        <span class="text-ink-muted">{t("jsonLevel")}</span>
        {#each levels as level (level)}
          <button type="button" class={buttonClass} onclick={() => viewer.expandTo(level)}
            >{level}</button
          >
        {/each}
        <button type="button" class={buttonClass} onclick={() => viewer.expandAll()}
          >{t("expandAll")}</button
        >
        <button type="button" class={buttonClass} onclick={() => viewer.collapseAll()}
          >{t("collapseAll")}</button
        >
      </div>
    {/if}

    <div class="ml-auto flex items-center gap-1">
      <button
        type="button"
        class={buttonClass}
        onclick={() => viewer.copy(JSON.stringify(value, null, 2), t("jsonCopied"))}
        >{t("jsonCopy")}</button
      >
      <button
        type="button"
        class={buttonClass}
        onclick={() => viewer.copy(JSON.stringify(value), t("jsonCopied"))}
        >{t("jsonCopyMinified")}</button
      >
      <button type="button" class={buttonClass} onclick={download}>{t("jsonDownload")}</button>
      {#if onEdit}
        <button type="button" class={buttonClass} onclick={onEdit}>{t("jsonEdit")}</button>
      {/if}
    </div>
  </header>

  {#if prefix}
    <p class="border-b border-line px-3 py-1.5 text-xs text-ink-muted">
      {t("jsonPrefix", prefix)}
    </p>
  {/if}

  <main class="min-h-0 grow overflow-auto font-mono text-[13px] leading-6">
    {#if viewer.view === "tree"}
      <div class="py-2 pr-2 pl-6" role="tree">
        <TreeNode {viewer} {value} path={[]} />
      </div>
    {:else if viewer.view === "pretty"}
      {#if tokens}
        <pre class="p-3 whitespace-pre-wrap break-words">{#each tokens as token, index (index)}{#if token.kind === "key"}<span
                class="text-sky-700 dark:text-sky-300">{token.text}</span
              >{:else if token.kind === "string"}<span class="text-emerald-700 dark:text-emerald-400"
                >{token.text}</span
              >{:else if token.kind === "number"}<span class="text-amber-700 dark:text-amber-300"
                >{token.text}</span
              >{:else if token.kind === "literal"}<span class="text-violet-700 dark:text-violet-300"
                >{token.text}</span
              >{:else if token.kind === "punctuation"}<span class="text-ink-muted">{token.text}</span
              >{:else}{token.text}{/if}{/each}</pre>
      {:else}
        <p class="px-3 pt-2 font-sans text-xs text-ink-muted">{t("jsonPlain")}</p>
        <pre class="p-3 whitespace-pre-wrap break-words">{pretty}</pre>
      {/if}
    {:else}
      <pre class="p-3 whitespace-pre-wrap break-all">{text}</pre>
    {/if}
  </main>

  <footer
    class="flex items-center gap-2 border-t border-line bg-surface-raised px-3 py-1 font-mono text-xs"
  >
    <nav class="flex min-w-0 grow flex-wrap items-center text-ink-muted">
      <button type="button" class="hover:text-ink" onclick={() => viewer.select([])}>$</button>
      {#each crumbs as crumb (pathKey(crumb))}
        <button
          type="button"
          class="hover:text-ink {crumb.length === viewer.selected.length ? 'text-ink' : ''}"
          onclick={() => {
            viewer.select(crumb);
            void reveal(crumb);
          }}>{formatPath(crumb).slice(formatPath(crumb.slice(0, -1)).length)}</button
        >
      {/each}
      <button
        type="button"
        class="ml-2 rounded border border-line px-1.5 font-sans text-[11px] hover:text-ink"
        onclick={() => viewer.copy(formatPath(viewer.selected), t("jsonCopied"))}
        >{t("jsonCopyPath")}</button
      >
    </nav>

    {#if viewer.notice}
      <span class="font-sans text-on">{viewer.notice}</span>
    {/if}
    <span class="shrink-0 text-ink-muted tabular-nums">{formatBytes(text.length)}</span>
  </footer>
</div>
