<!--
  One feature: its label, its on state if it has one, and the star that makes
  it a favourite.

  Shared by the menus and the Search tab. Only the menu copy carries the
  feature id as its element id -- resize.js and tools.js find their lists by
  the ids inside them, and the same id twice in one popup would hand them the
  wrong one.

  The li stays a plain block, and the star is positioned rather than laid out
  beside the link, for the same two files: they take the parent of
  #edit-tools and #edit-resize-dimensions and prepend the user's own entries
  inside it. A flex row there would put those entries side by side with the
  link. Positioned at the bottom, the star stays level with the feature's own
  row, which is always the last thing in the li.
-->
<script lang="ts">
  import type { Feature } from "@/features/types";
  import { t } from "@/lib/i18n";
  import { ui } from "./ui.svelte";

  interface Props {
    feature: Feature;
    /** Sets the element id; true for the copy in the feature's own menu. */
    withId?: boolean;
    /** The menu's name, shown on the right where rows from several menus mix. */
    menu?: string;
    /** The row the keyboard is on in the Search results. */
    highlighted?: boolean;
  }

  let { feature, withId = false, menu, highlighted = false }: Props = $props();

  const favorite = $derived(ui.isFavorite(feature.id));
</script>

<li class="group/row relative" data-feature={feature.id}>
  <a
    href="#{feature.id}"
    id={withId ? feature.id : undefined}
    class="group flex items-start gap-1.5 rounded py-1 pr-6 pl-1.5 text-xs text-ink
           no-underline hover:bg-surface-raised {highlighted ? 'bg-surface-raised' : ''}"
    class:font-medium={ui.isActive(feature.id)}
    onclick={(event) => {
      event.preventDefault();
      void ui.run(feature);
    }}
  >
    <!--
      A toggle that is off draws nothing: a marker on every item is noise, and
      the group already says what kind of item this is. A tick means on, and
      hovering it shows the cross that says clicking will switch it off.
    -->
    {#if feature.stateful && ui.isActive(feature.id)}
      <svg class="mt-px size-3.5 shrink-0 text-on group-hover:hidden" aria-hidden="true">
        <use href="/svg/icons/icons.svg#i-check"></use>
      </svg>
      <svg class="mt-px hidden size-3.5 shrink-0 text-off group-hover:block" aria-hidden="true">
        <use href="/svg/icons/icons.svg#s-remove"></use>
      </svg>
    {:else}
      <span class="mt-px size-3.5 shrink-0"></span>
    {/if}
    <span class="min-w-0 grow">{t(feature.labelKey)}</span>
    {#if menu}
      <span class="shrink-0 pl-2 text-[0.65rem] text-ink-muted">{menu}</span>
    {/if}
  </a>

  <!--
    Hidden until the row is hovered, except once starred: a column of stars
    on every row would compete with the labels.
  -->
  <button
    type="button"
    class="absolute right-0.5 bottom-0.5 rounded p-0.5 hover:bg-surface-sunken
           {favorite
      ? 'text-warn'
      : 'text-ink-muted opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100'}"
    aria-pressed={favorite}
    aria-label={favorite ? t("removeFromFavorites") : t("addToFavorites")}
    title={favorite ? t("removeFromFavorites") : t("addToFavorites")}
    onclick={() => void ui.toggleFavorite(feature.id)}
  >
    <svg class="size-3.5 {favorite ? 'fill-current' : 'fill-none'}" aria-hidden="true">
      <use href="/svg/overlay/menus.svg#star"></use>
    </svg>
  </button>
</li>
