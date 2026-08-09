<!--
  Add Cookie.

  Markup only. `overlay/cookies.js` still owns this dialog -- it fills the
  labels, validates the fields and submits -- and it finds every part of it by
  id, so the ids and the `for` attributes are a contract, not decoration. The
  `d-none` and `is-invalid` classes are written by that code too and are
  defined in app.css for exactly that reason.

  It moves into Svelte proper when the cookie handlers are ported.
-->
<script lang="ts"></script>
<form id="add-cookie-dialog" class="d-none space-y-2 p-3 text-xs">
  <fieldset class="space-y-2">
    <legend class="mb-1 text-sm font-medium"></legend>

    {#each ["name", "value", "host", "path", "expires"] as field (field)}
      <div class="flex items-center gap-2">
        <label for="add-cookie-{field}" class="w-20 shrink-0 text-ink-muted"></label>
        <div class="grow">
          <input
            id="add-cookie-{field}"
            type="text"
            class="w-full rounded border border-line bg-surface px-2 py-1 disabled:opacity-50"
          />
          <!-- Only four of the five are validated; the empty one stays unused. -->
          <div id="add-cookie-{field}-invalid" class="mt-0.5 text-off"></div>
        </div>
      </div>
    {/each}

    <div class="flex items-center gap-4 pl-22">
      <span class="flex items-center gap-1.5">
        <input id="add-cookie-secure" type="checkbox" />
        <label for="add-cookie-secure" class="text-ink-muted"></label>
      </span>
      <span class="flex items-center gap-1.5">
        <input id="add-cookie-session" type="checkbox" />
        <label for="add-cookie-session" class="text-ink-muted"></label>
      </span>
    </div>

    <div class="flex justify-end gap-2 pt-1">
      <button
        id="add-cookie-cancel"
        type="button"
        class="rounded border border-line px-2.5 py-1 hover:bg-surface-raised"
      ></button>
      <button
        id="add-cookie-submit"
        type="button"
        class="rounded bg-accent px-2.5 py-1 font-medium text-white hover:opacity-90"
      ></button>
    </div>
  </fieldset>
</form>
