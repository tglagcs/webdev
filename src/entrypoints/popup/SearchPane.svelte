<!--
  The Search tab: every feature in one list, the favourites above it, and a
  box that narrows both down to what was typed.

  It is laid over the menus rather than beside them. The menus share one grid
  cell so the popup is as tall as the tallest of them; a list of all 119
  features in that cell would make it as tall as all of them, so this one is
  positioned instead and scrolls within that height.
-->
<script lang="ts">
  import { tick } from "svelte";

  import { visibleMenus } from "@/features/registry";
  import type { Feature } from "@/features/types";
  import { t } from "@/lib/i18n";
  import { ui } from "./ui.svelte";
  import FeatureRow from "./FeatureRow.svelte";

  let { active }: { active: boolean } = $props();

  interface Entry {
    feature: Feature;
    label: string;
    menu: string;
  }

  const entries: Entry[] = visibleMenus()
    .flatMap((menu) =>
      menu.features.map((feature) => ({ feature, label: t(feature.labelKey), menu: t(menu.id) })),
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  const byId = new Map(entries.map((entry) => [entry.feature.id, entry]));

  let query = $state("");
  let cursor = $state(0);
  let input: HTMLInputElement | undefined = $state();
  let list: HTMLElement | undefined = $state();

  const words = $derived(query.trim().toLowerCase().split(/\s+/).filter(Boolean));

  const favorites = $derived(
    ui.favorites.flatMap((id) => {
      const entry = byId.get(id);

      return entry ? [entry] : [];
    }),
  );

  /**
   * What was typed, every word somewhere in the label or the menu's name.
   * Labels that start with the query come first, then labels with a word that
   * does, then the rest -- each alphabetical, since `entries` already is and
   * the sort is stable.
   */
  const results = $derived.by(() => {
    if (words.length === 0) {
      return [];
    }

    const whole = query.trim().toLowerCase();

    const rank = (entry: Entry): number => {
      const label = entry.label.toLowerCase();

      if (label.startsWith(whole)) {
        return 0;
      }

      return label.split(/\s+/).some((word) => word.startsWith(words[0]!)) ? 1 : 2;
    };

    return entries
      .filter((entry) => {
        const haystack = `${entry.label} ${entry.menu}`.toLowerCase();

        return words.every((word) => haystack.includes(word));
      })
      .sort((a, b) => rank(a) - rank(b));
  });

  $effect(() => {
    if (active) {
      void tick().then(() => input?.focus());
    }
  });

  async function moveTo(index: number): Promise<void> {
    cursor = index;

    await tick();

    list
      ?.querySelector(`[data-feature="${CSS.escape(results[cursor]?.feature.id ?? "")}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      void moveTo((cursor + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      void moveTo((cursor - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && results[cursor]) {
      event.preventDefault();
      void ui.run(results[cursor]!.feature);
    } else if (event.key === "Escape" && query !== "") {
      // Only while there is a query: otherwise Escape is the browser's, and
      // closes the popup.
      event.preventDefault();
      query = "";
    }
  }

  /**
   * Typing anywhere in the popup searches. A printable key outside a field
   * switches to this tab and starts the query with it, so the user does not
   * have to click the box first.
   */
  function onWindowKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    if (
      event.key.length !== 1 ||
      event.key === " " ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
      target.isContentEditable
    ) {
      return;
    }

    event.preventDefault();
    ui.selectMenu("search");
    query += event.key;
    cursor = 0;
    void tick().then(() => input?.focus());
  }
</script>

<svelte:window onkeydown={onWindowKey} />

{#snippet heading(icon: string, label: string)}
  <h2
    class="mb-1 flex items-center gap-1.5 px-1.5 text-[0.65rem] font-medium tracking-wide
           text-ink-muted uppercase"
  >
    <svg class="size-3.5 shrink-0 {icon === 'star' ? 'fill-current' : ''}" aria-hidden="true">
      <use href="/svg/overlay/menus.svg#{icon}"></use>
    </svg>
    {label}
  </h2>
{/snippet}

<div class="absolute inset-0 flex flex-col p-2" class:invisible={!active} inert={!active}>
  <div class="relative mb-2">
    <svg
      class="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-ink-muted"
      aria-hidden="true"
    >
      <use href="/svg/overlay/menus.svg#search"></use>
    </svg>
    <input
      bind:this={input}
      bind:value={query}
      type="search"
      placeholder={t("searchFeatures")}
      aria-label={t("searchFeatures")}
      class="w-full rounded-md border border-line bg-surface-sunken py-1.5 pr-2 pl-7 text-xs text-ink
             outline-none focus:border-accent"
      oninput={() => (cursor = 0)}
      onkeydown={onKey}
    />
  </div>

  <div bind:this={list} class="min-h-0 grow space-y-2.5 overflow-y-auto">
    {#if words.length > 0}
      {#if results.length === 0}
        <p class="px-1.5 py-1 text-xs text-ink-muted">{t("noFeaturesFound")}</p>
      {:else}
        <ul>
          {#each results as entry, index (entry.feature.id)}
            <FeatureRow feature={entry.feature} menu={entry.menu} highlighted={index === cursor} />
          {/each}
        </ul>
      {/if}
    {:else}
      <section>
        {@render heading("star", t("favorites"))}
        {#if favorites.length === 0}
          <p class="px-1.5 py-1 text-xs text-ink-muted">{t("favoritesHint")}</p>
        {:else}
          <ul>
            {#each favorites as entry (entry.feature.id)}
              <FeatureRow feature={entry.feature} menu={entry.menu} />
            {/each}
          </ul>
        {/if}
      </section>

      <section>
        {@render heading("search", t("allFeatures"))}
        <ul>
          {#each entries as entry (entry.feature.id)}
            <FeatureRow feature={entry.feature} menu={entry.menu} />
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>
