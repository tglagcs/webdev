<!--
  Change Date and Time: what the page's clock reads, and the controls to set
  it, stop it, give the page another time zone, or put it back.

  With a zone, the date and time entered are a reading on that zone's clock:
  switching zones keeps the reading and moves the instant it names.

  The popup's own dialog, not legacy markup, so it is Svelte throughout. It is
  laid over the menus rather than in place of them, which keeps the popup the
  height it always is.
-->
<script lang="ts">
  import { onDestroy } from "svelte";

  import { t } from "@/lib/i18n";
  import {
    fakeNow,
    fromLocalInput,
    shift,
    toLocalInput,
    type Shift,
    type TimeTravelState,
  } from "@/lib/time-travel";
  import {
    formatOffset,
    fromWall,
    systemTimeZone,
    timeZones,
    zoneOffset,
  } from "@/lib/time-zone";
  import { readTimeTravel, writeTimeTravel } from "./time-travel";
  import { ui } from "./ui.svelte";

  const tabId = ui.tab?.id;

  let loaded = $state(false);
  let unreadable = $state(false);
  let current = $state<TimeTravelState | null>(null);
  let value = $state(toLocalInput(Date.now()));
  let stopped = $state(false);
  let invalid = $state(false);
  let clock = $state(Date.now());
  let zoneOn = $state(false);
  let zone = $state(systemTimeZone());
  let search = $state("");

  const ZONES = timeZones();

  /** The zone the entered date is read in; undefined for the browser's. */
  const inputZone = $derived(zoneOn ? zone : undefined);

  // Each zone with its offset at the entered date -- the offset that reading
  // would have there, so a summer date shows summer offsets.
  const zoneOptions = $derived.by(() => {
    if (!zoneOn) {
      return [];
    }

    const query = search.trim().toLowerCase().replaceAll(" ", "_");
    const entered = Date.parse(`${value}Z`);
    const wall = Number.isNaN(entered) ? Date.now() : entered;

    return ZONES.filter((id) => id.toLowerCase().includes(query)).map((id) => ({
      id,
      label: `${id.replaceAll("_", " ")} (UTC${formatOffset(zoneOffset(id, fromWall(id, wall)))})`,
    }));
  });

  // The page's clock, ticking here as it ticks there.
  const timer = setInterval(() => (clock = Date.now()), 1000);

  onDestroy(() => clearInterval(timer));

  const pageNow = $derived(current ? fakeNow(current, clock) : clock);

  function format(epoch: number, timeZone?: string): string {
    const text = new Date(epoch).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone,
    });

    return timeZone === undefined ? text : `${text} (${timeZone})`;
  }

  async function load(): Promise<void> {
    if (tabId === undefined) {
      unreadable = true;

      return;
    }

    try {
      current = await readTimeTravel(tabId);
      zoneOn = current?.zone !== undefined;
      zone = current?.zone ?? zone;
      value = toLocalInput(current ? fakeNow(current, Date.now()) : Date.now(), current?.zone);
      stopped = current?.stopped ?? false;
    } catch {
      unreadable = true;
    }

    loaded = true;
  }

  const SHIFTS: { by: Shift; label: string }[] = [
    { by: "-1d", label: t("timeTravelMinusDay") },
    { by: "+1d", label: t("timeTravelPlusDay") },
    { by: "+1w", label: t("timeTravelPlusWeek") },
    { by: "+1M", label: t("timeTravelPlusMonth") },
    { by: "+1y", label: t("timeTravelPlusYear") },
  ];

  function move(by: Shift): void {
    const from = fromLocalInput(value, inputZone);

    value = toLocalInput(shift(Number.isNaN(from) ? Date.now() : from, by, inputZone), inputZone);
    invalid = false;
  }

  async function apply(): Promise<void> {
    const fake = fromLocalInput(value, inputZone);

    if (Number.isNaN(fake) || tabId === undefined) {
      invalid = true;

      return;
    }

    const state: TimeTravelState = { fake, real: Date.now(), stopped };

    if (inputZone !== undefined) {
      state.zone = inputZone;
    }

    await writeTimeTravel(tabId, state);
    current = state;
    ui.dialog = null;
    ui.notify(t("timeTravelApplied", format(fake, inputZone)));
  }

  async function reset(): Promise<void> {
    if (tabId === undefined) {
      return;
    }

    await writeTimeTravel(tabId, null);
    current = null;
    ui.dialog = null;
    ui.notify(t("timeTravelResetDone"));
  }

  async function reload(): Promise<void> {
    if (tabId !== undefined) {
      await browser.tabs.reload(tabId);
    }
  }

  void load();

  const buttonClass = "rounded border border-line px-2 py-1 hover:bg-surface-raised";
</script>

<form
  class="absolute inset-0 z-10 space-y-3 overflow-y-auto bg-surface p-3 text-xs"
  onsubmit={(event) => {
    event.preventDefault();
    void apply();
  }}
>
  <h2 class="text-sm font-medium">{t("timeTravelTitle")}</h2>

  {#if unreadable}
    <p class="text-off">{t("timeTravelUnreadable")}</p>
    <div class="flex justify-end">
      <button type="button" class={buttonClass} onclick={() => (ui.dialog = null)}
        >{t("cancel")}</button
      >
    </div>
  {:else if loaded}
    <div class="rounded-md border border-line bg-surface-raised px-3 py-2">
      <div class="text-[0.65rem] font-medium tracking-wide text-ink-muted uppercase">
        {t("timeTravelPageSees")}
        <span class="normal-case">· {current ? t("timeTravelFakeTime") : t("timeTravelRealTime")}</span>
      </div>
      <div class="mt-0.5 font-mono text-sm tabular-nums {current ? 'text-warn' : ''}">
        {format(pageNow, current?.zone)}
      </div>
    </div>

    <div class="space-y-1.5">
      <label for="time-travel-value" class="block text-ink-muted"
        >{inputZone === undefined ? t("timeTravelSet") : t("timeTravelSetIn", inputZone)}</label
      >
      <div class="flex gap-1.5">
        <input
          id="time-travel-value"
          type="datetime-local"
          step="1"
          bind:value
          oninput={() => (invalid = false)}
          class="grow rounded border bg-surface-sunken px-2 py-1 text-ink
                 {invalid ? 'border-off' : 'border-line'}"
        />
        <button
          type="button"
          class={buttonClass}
          onclick={() => {
            value = toLocalInput(Date.now(), inputZone);
            invalid = false;
          }}>{t("timeTravelNow")}</button
        >
      </div>
      {#if invalid}
        <p class="text-off">{t("timeTravelInvalid")}</p>
      {/if}
      <div class="flex flex-wrap gap-1">
        {#each SHIFTS as step (step.by)}
          <button type="button" class={buttonClass} onclick={() => move(step.by)}
            >{step.label}</button
          >
        {/each}
      </div>
    </div>

    <label class="flex items-center gap-1.5">
      <input type="checkbox" bind:checked={stopped} />
      {t("timeTravelStop")}
    </label>

    <div class="space-y-1.5">
      <label class="flex items-center gap-1.5">
        <input type="checkbox" bind:checked={zoneOn} />
        {t("timeTravelZone")}
      </label>
      {#if zoneOn}
        <input
          type="search"
          bind:value={search}
          placeholder={t("timeTravelZoneSearch")}
          aria-label={t("timeTravelZoneSearch")}
          class="w-full rounded border border-line bg-surface-sunken px-2 py-1 text-ink"
        />
        {#if zoneOptions.length > 0}
          <select
            size="6"
            bind:value={zone}
            aria-label={t("timeTravelZone")}
            class="w-full rounded border border-line bg-surface-sunken text-ink"
          >
            {#each zoneOptions as option (option.id)}
              <option value={option.id}>{option.label}</option>
            {/each}
          </select>
        {:else}
          <p class="text-ink-muted">{t("timeTravelZoneNone")}</p>
        {/if}
      {/if}
    </div>

    <p class="text-ink-muted">{t("timeTravelNote")}</p>

    <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
      <button type="button" class="{buttonClass} mr-auto" onclick={reload}
        >{t("timeTravelReload")}</button
      >
      {#if current}
        <button type="button" class={buttonClass} onclick={reset}>{t("timeTravelReset")}</button>
      {/if}
      <button type="button" class={buttonClass} onclick={() => (ui.dialog = null)}
        >{t("cancel")}</button
      >
      <button
        type="submit"
        class="rounded bg-accent px-3 py-1 font-medium text-on-accent hover:opacity-90"
        >{t("timeTravelApply")}</button
      >
    </div>
  {/if}
</form>
