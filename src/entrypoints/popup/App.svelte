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

  import { HOMEPAGE_URL } from "@/branding";
  import { columns, visibleMenus } from "@/features/registry";
  import type { Feature, MenuId } from "@/features/types";
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

  function menuIcon(menu: MenuId): string {
    return `/svg/overlay/color/${menu}.svg`;
  }

  // The menu ids are message keys in their own right -- "cookies", "css" and
  // the rest are already in the locale, named by what the tab shows.
  function menuName(menu: MenuId): string {
    return t(menu);
  }

  function listId(menu: MenuId, index: number): string | undefined {
    if (index !== 0) {
      return undefined;
    }

    return menu === "resize" ? "custom-resize-options" : menu === "tools" ? "custom-tools" : undefined;
  }
</script>

<div class="flex min-h-full w-[34rem] flex-col bg-surface text-ink">
  <nav class="flex shrink-0 gap-0.5 border-b border-line bg-surface-raised px-1 pt-1">
    {#each menus as menu (menu.id)}
      <button
        type="button"
        title={menuName(menu.id)}
        aria-current={menu.id === current.id}
        class="flex items-center gap-1.5 rounded-t-md border border-transparent px-2.5 py-1.5 text-xs
               text-ink-muted transition-colors hover:bg-surface hover:text-ink
               aria-[current=true]:border-line aria-[current=true]:border-b-surface
               aria-[current=true]:bg-surface aria-[current=true]:text-ink"
        onclick={() => ui.selectMenu(menu.id)}
      >
        {#if ui.labels !== "text"}
          <img src={menuIcon(menu.id)} width="14" height="14" alt="" />
        {/if}
        {#if ui.labels !== "icons"}
          <span>{menuName(menu.id)}</span>
        {/if}
      </button>
    {/each}
  </nav>

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
    Every menu is rendered and the inactive ones are hidden, rather than only
    the open one being in the DOM. The two dynamic lists -- saved window sizes
    and custom tools -- are still filled in by resize.js and tools.js at
    startup, and they look their containers up by id.
  -->
  <div class="tab-content grow p-2">
    {#each menus as menu (menu.id)}
      <div class="flex flex-wrap gap-x-6 gap-y-1" hidden={menu.id !== current.id}>
        {#each columns(menu) as column, index (index)}
          <ul class="min-w-40 grow basis-0 space-y-0.5" id={listId(menu.id, index)}>
            {#each column as feature (feature.id)}
              <li>
                <a
                  href="#{feature.id}"
                  id={feature.id}
                  class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-ink no-underline
                         hover:bg-surface-raised"
                  class:font-medium={ui.isActive(feature.id)}
                  onclick={(event) => click(feature, event)}
                >
                  {#if feature.stateful}
                    <svg
                      class="size-3.5 shrink-0"
                      class:text-on={ui.isActive(feature.id)}
                      class:text-ink-muted={!ui.isActive(feature.id)}
                      aria-hidden="true"
                    >
                      <use
                        href="/svg/icons/icons.svg#{ui.isActive(feature.id)
                          ? 'i-check'
                          : 's-remove'}"
                      ></use>
                    </svg>
                  {:else}
                    <span class="size-3.5 shrink-0"></span>
                  {/if}
                  {label(feature)}
                </a>
              </li>
            {/each}

            <!--
              Not a feature: an ordinary link to the documentation, which the
              markup carried in the options menu and nothing toggles.
            -->
            {#if menu.id === "options" && index === columns(menu).length - 1}
              <li>
                <a
                  href={`${HOMEPAGE_URL}help/`}
                  target="_blank"
                  rel="noreferrer"
                  class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-ink no-underline
                         hover:bg-surface-raised"
                >
                  <span class="size-3.5 shrink-0"></span>
                  {t("help")}
                </a>
              </li>
            {/if}
          </ul>
        {/each}
      </div>
    {/each}
  </div>

  <AddCookieDialog />
  <ResizeDialog />
</div>
