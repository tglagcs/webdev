<!--
  The JSON viewer page: where the document comes from, and what to show when
  there is none or it does not parse.

  Three sources. Framed over a JSON response (`?embed`), the content script
  posts it. Opened from the popup (`?tab=`), it is asked of that tab's content
  script. Opened with neither, or when the tab has no JSON, it is pasted.
-->
<script lang="ts">
  import { t } from "@/lib/i18n";
  import { sendToContent } from "@/lib/content-messaging";
  import { JSON_VIEWER_READY, isJsonViewerDocument } from "@/lib/json-embed";
  import { parseJson, type ParseResult } from "@/lib/json-view";
  import Viewer from "@/json-viewer/Viewer.svelte";

  interface Props {
    embed: boolean;
    tabId?: number;
  }

  let { embed, tabId }: Props = $props();

  interface Loaded {
    text: string;
    url?: string;
    result: ParseResult;
  }

  let loaded = $state<Loaded | null>(null);
  let pasting = $state(false);
  let notFound = $state(false);
  let draft = $state("");
  let pasteError = $state<Extract<ParseResult, { ok: false }> | null>(null);

  function fromParent(): Promise<{ text: string; url?: string }> {
    return new Promise((resolve) => {
      const listener = (event: MessageEvent): void => {
        if (event.source !== parent || !isJsonViewerDocument(event.data)) {
          return;
        }

        removeEventListener("message", listener);
        resolve({ text: event.data.text, url: event.data.url });
      };

      addEventListener("message", listener);
      parent.postMessage({ type: JSON_VIEWER_READY }, "*");
    });
  }

  async function fromTab(id: number): Promise<{ text: string; url?: string } | null> {
    try {
      const response = await sendToContent(id, "get-json");

      return response.text === null ? null : { text: response.text, url: response.url };
    } catch {
      return null;
    }
  }

  function show(text: string, url?: string): void {
    loaded = { text, url, result: parseJson(text) };
  }

  async function load(): Promise<void> {
    const source = embed ? await fromParent() : tabId !== undefined ? await fromTab(tabId) : null;

    if (source) {
      show(source.text, source.url);

      if (source.url && !embed) {
        document.title = `${t("jsonViewer")} · ${source.url}`;
      }
    } else {
      notFound = tabId !== undefined;
      pasting = true;
    }
  }

  function viewDraft(): void {
    const result = parseJson(draft);

    if (result.ok) {
      pasteError = null;
      pasting = false;
      loaded = { text: draft, result };
    } else {
      pasteError = result;
    }
  }

  function edit(): void {
    draft = loaded?.text ?? draft;
    pasting = true;
  }

  void load();
</script>

{#snippet errorLine(error: Extract<ParseResult, { ok: false }>)}
  <p class="text-sm">
    <span class="font-medium text-off">{t("jsonInvalid")}</span>
    {#if error.line !== undefined && error.column !== undefined}
      <span class="text-ink-muted">
        · {t("jsonErrorAt", [String(error.line), String(error.column)])}</span
      >
    {/if}
  </p>
  <p class="mt-1 font-mono text-xs text-ink-muted">{error.message}</p>
{/snippet}

{#if pasting}
  <div class="flex min-h-screen justify-center bg-surface-sunken p-6">
    <div class="flex w-full max-w-4xl flex-col gap-3">
      <h1 class="flex items-center gap-2 text-lg font-semibold">
        <img src="/svg/logos/color/logo.svg" width="22" height="22" alt="" />
        {t("jsonViewer")}
      </h1>

      {#if notFound}
        <p class="text-sm text-ink-muted">{t("jsonNotFound")}</p>
      {/if}

      <!-- svelte-ignore a11y_autofocus -->
      <textarea
        bind:value={draft}
        autofocus
        spellcheck="false"
        placeholder={t("jsonPastePrompt")}
        class="h-[65vh] w-full resize-y rounded-lg border border-line bg-surface p-3 font-mono
               text-[13px] text-ink outline-none focus:border-accent"
        onkeydown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            viewDraft();
          }
        }}
      ></textarea>

      <div class="flex items-start gap-4">
        <button
          type="button"
          class="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-on-accent hover:opacity-90"
          onclick={viewDraft}>{t("jsonView")}</button
        >
        {#if pasteError}
          <div>{@render errorLine(pasteError)}</div>
        {/if}
      </div>
    </div>
  </div>
{:else if loaded?.result.ok}
  <Viewer
    value={loaded.result.value}
    text={loaded.text}
    url={loaded.url}
    prefix={loaded.result.prefix}
    onEdit={embed ? undefined : edit}
  />
{:else if loaded && !loaded.result.ok}
  <div class="flex h-screen flex-col bg-surface text-ink">
    <div class="flex items-start gap-4 border-b border-line bg-surface-raised px-4 py-3">
      <div class="grow">{@render errorLine(loaded.result)}</div>
      {#if !embed}
        <button
          type="button"
          class="rounded-md border border-line px-2 py-1 text-xs hover:bg-surface"
          onclick={edit}>{t("jsonEdit")}</button
        >
      {/if}
    </div>
    <pre
      class="min-h-0 grow overflow-auto p-3 font-mono text-[13px] break-all whitespace-pre-wrap">{loaded.text}</pre>
  </div>
{/if}
