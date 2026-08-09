<!--
  The popup.

  Rendered from the feature registry rather than from 486 lines of markup: the
  eleven tabs, their columns and every item come from `visibleMenus()`, and the
  label from each feature's message key. Adding a feature is one registry entry.

  What is still legacy is behind the seam in bridge.ts -- clicking an item calls
  the handler that shipped, which is why this is a UI change and not a rewrite
  of 119 behaviours at once.
-->
<script lang="ts">
  import DOMPurify from "dompurify";

  import { visibleMenus } from "@/features/registry";
  import { FEATURE_KINDS, type Feature, type FeatureKind, type MenuId } from "@/features/types";
  import { t } from "@/lib/i18n";
  import { runFeature } from "./bridge";
  import { ui } from "./ui.svelte";
  import AddCookieDialog from "./AddCookieDialog.svelte";
  import ResizeDialog from "./ResizeDialog.svelte";

  const menus = visibleMenus();
  const current = $derived(menus.find((menu) => menu.id === ui.menu) ?? menus[0]!);

  function label(feature: Feature): string {
    return t(feature.labelKey);
  }

  function click(feature: Feature, event: MouseEvent): void {
    event.preventDefault();

    runFeature(feature, ui);
  }

  // A sprite reference rather than an <img>: an external SVG in an <img> is
  // its own document and cannot see this page's CSS, so currentColor never
  // resolves and the icon cannot follow the theme.
  function menuIcon(menu: MenuId): string {
    return `/svg/overlay/menus.svg#${menu}`;
  }

  // The menu ids are message keys in their own right -- "cookies", "css" and
  // the rest are already in the locale, named by what the tab shows.
  function menuName(menu: MenuId): string {
    return t(menu);
  }

  /**
   * A menu split into its groups, in a fixed order and skipping the empty
   * ones.
   *
   * The order is deliberate: what is switched on now, then what happens once,
   * then what opens a tab, then what asks a question first. That runs from
   * "state I am in" to "thing I am going far away to do".
   */
  function groups(features: Feature[]): { kind: FeatureKind; features: Feature[] }[] {
    return FEATURE_KINDS.map((kind) => ({
      kind,
      features: features.filter((feature) => feature.kind === kind),
    })).filter((group) => group.features.length > 0);
  }

  const GROUP_LABELS = {
    toggle: "groupToggles",
    action: "groupActions",
    report: "groupReports",
    dialog: "groupDialogs",
  } as const;

  /**
   * How many columns a group is laid out in.
   *
   * Two, and the reason is the label lengths. A grid row is as tall as its
   * tallest cell, so one label wrapping to two lines anywhere in a row leaves
   * a band of space under every other cell in it. At three columns the cells
   * are about 200px and the longer names -- "Outline Images With Oversized
   * Dimensions" and its like -- wrap; at two they are about 305px and the
   * longest name in the registry still fits on one line, so every row is one
   * line tall and the rhythm is even.
   *
   * This is the second version of this rule. The first used CSS `columns`,
   * where the block is as tall as its tallest column, which left the same kind
   * of dead space -- but under the whole group, so the gaps between groups
   * came out uneven.
   */
  function columnsFor(count: number): number {
    return count === 1 ? 1 : 2;
  }

  /**
   * Two menus grow a list of the user's own entries: saved window sizes and
   * custom tools. resize.js and tools.js still render those, and they find the
   * list by id and insert relative to the "Edit ..." item inside it -- which
   * is a dialog, so the id belongs on that group's list and nowhere else.
   */
  function listId(menu: MenuId): string | undefined {
    if (menu === "resize") {
      return "custom-resize-options";
    }

    return menu === "tools" ? "custom-tools" : undefined;
  }
</script>

<!--
  800px is the widest a browser will make a popup, and eleven tabs do not fit
  across it -- so they run down the side instead, where all eleven are always
  visible and nothing scrolls.

  The items flow into CSS columns rather than the fixed columns the markup
  had. Those were only a reading order, not a grouping -- each menu ran
  alphabetically down one column and on to the next -- so letting the browser
  balance them costs nothing and keeps the long menus off the scrollbar.
-->
<div class="flex min-h-full w-[800px] max-w-full bg-surface text-ink">
  <nav class="flex w-40 shrink-0 flex-col gap-0.5 border-r border-line bg-surface-raised p-1.5">
    {#each menus as menu (menu.id)}
      <button
        type="button"
        aria-current={menu.id === current.id}
        class="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left
               text-xs text-ink-muted transition-colors hover:bg-surface hover:text-ink
               aria-[current=true]:border-line aria-[current=true]:bg-surface
               aria-[current=true]:text-ink aria-[current=true]:shadow-sm"
        onclick={() => ui.selectMenu(menu.id)}
      >
        {#if ui.labels !== "text"}
          <svg
            class="size-4 shrink-0 {menu.id === current.id ? 'text-accent' : ''}"
            aria-hidden="true"
          >
            <use href={menuIcon(menu.id)}></use>
          </svg>
        {/if}
        {#if ui.labels !== "icons"}
          <span class="truncate">{menuName(menu.id)}</span>
        {/if}
      </button>
    {/each}
  </nav>

  <div class="flex min-w-0 grow flex-col">
    {#if ui.confirmation}
      <div
        class="m-2 flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-2 text-xs"
      >
        <span class="grow">{ui.confirmation.message}</span>
        <button
          type="button"
          class="rounded border border-line px-2 py-1 hover:bg-surface-raised"
          onclick={() => (ui.confirmation = null)}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          class="rounded bg-amber-500 px-2 py-1 font-medium text-black hover:bg-amber-400"
          onclick={() => {
            const confirmation = ui.confirmation;
            ui.confirmation = null;
            confirmation?.confirm();
          }}
        >
          {ui.confirmation.buttonText}
        </button>
      </div>
    {/if}

    {#if ui.notification}
      <div
        class="m-2 flex items-start gap-2 rounded-md border p-2 text-xs {ui.notification.type ===
        'danger'
          ? 'border-off/50 bg-off/10'
          : 'border-line bg-surface-raised'}"
      >
        <!-- Sanitized because a few result messages carry markup, as upstream's did. -->
        <span class="grow">{@html DOMPurify.sanitize(ui.notification.message)}</span>
        <button
          type="button"
          aria-label={t("cancel")}
          class="text-ink-muted hover:text-ink"
          onclick={() => (ui.notification = null)}>&times;</button
        >
      </div>
    {/if}

    <!--
      All eleven menus share one grid cell, so the popup is always as tall as
      the tallest of them and does not resize when the user switches to
      Information. Measuring them and setting a height would do the same, but
      a number in the source is one a longer translation quietly outgrows.

      The inactive ones are hidden with `visibility`, not `display`: they stay
      laid out, which is what gives the cell its height, and they stay out of
      the tab order and off the hit-testing. They also have to stay in the DOM
      regardless -- resize.js and tools.js fill their lists in at startup and
      find them by id, whichever menu is open.
    -->
    <div class="tab-content grid grow p-2">
      {#each menus as menu (menu.id)}
        <div
          class="col-start-1 row-start-1 space-y-2.5"
          class:invisible={menu.id !== current.id}
          inert={menu.id !== current.id}
        >
          {#each groups(menu.features) as group (group.kind)}
            <section>
              <h2
                class="mb-1 flex items-center gap-1.5 px-1.5 text-[0.65rem] font-medium
                       tracking-wide text-ink-muted uppercase"
              >
                <svg class="size-3.5 shrink-0" aria-hidden="true">
                  <use href="/svg/overlay/menus.svg#kind-{group.kind}"></use>
                </svg>
                {t(GROUP_LABELS[group.kind])}
              </h2>

              <ul
                class="grid gap-x-6"
                style="grid-template-columns: repeat({columnsFor(
                  group.features.length,
                )}, minmax(0, 1fr))"
                id={group.kind === "dialog" ? listId(menu.id) : undefined}
              >
                {#each group.features as feature (feature.id)}
                  <li>
                    <a
                      href="#{feature.id}"
                      id={feature.id}
                      class="group flex items-start gap-1.5 rounded px-1.5 py-1 text-xs text-ink
                             no-underline hover:bg-surface-raised"
                      class:font-medium={ui.isActive(feature.id)}
                      onclick={(event) => click(feature, event)}
                    >
                      <!--
                        A toggle that is off draws nothing: a marker on every
                        item is noise, and the group already says what kind of
                        item this is. A tick means on, and hovering it shows
                        the cross that says clicking will switch it off.
                      -->
                      {#if feature.stateful && ui.isActive(feature.id)}
                        <svg
                          class="mt-px size-3.5 shrink-0 text-on group-hover:hidden"
                          aria-hidden="true"
                        >
                          <use href="/svg/icons/icons.svg#i-check"></use>
                        </svg>
                        <svg
                          class="mt-px hidden size-3.5 shrink-0 text-off group-hover:block"
                          aria-hidden="true"
                        >
                          <use href="/svg/icons/icons.svg#s-remove"></use>
                        </svg>
                      {:else}
                        <span class="mt-px size-3.5 shrink-0"></span>
                      {/if}
                      {label(feature)}
                    </a>
                  </li>
                {/each}

              </ul>
            </section>
          {/each}
        </div>
      {/each}
    </div>

    <AddCookieDialog />
    <ResizeDialog />
  </div>
</div>
