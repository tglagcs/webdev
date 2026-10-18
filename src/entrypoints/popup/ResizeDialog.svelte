<!--
  Resize Window, and the Mustache template resize.js renders the user's own
  window sizes from.

  Same arrangement as AddCookieDialog: `overlay/resize.js` finds all of this by
  id and fills it in. The <script type="x-tmpl-mustache"> is read as text, never
  executed -- it is the template for one saved size, inserted into
  #custom-resize-options in the Resize menu.
-->
<script lang="ts"></script>
<form id="resize-window-dialog" class="d-none space-y-2 p-3 text-xs">
  <fieldset class="space-y-2">
    <legend class="mb-1 text-sm font-medium"></legend>

    {#each ["width", "height"] as dimension (dimension)}
      <div class="flex items-center gap-2">
        <label for="resize-window-{dimension}" class="w-20 shrink-0 text-ink-muted"></label>
        <div class="grow">
          <div class="flex items-center gap-1">
            <input
              id="resize-window-{dimension}"
              type="text"
              class="w-full rounded border border-line bg-surface px-2 py-1"
            />
            <span class="text-ink-muted">px</span>
          </div>
          <div id="resize-window-{dimension}-invalid" class="mt-0.5 text-off"></div>
        </div>
      </div>
    {/each}

    <div class="flex justify-end gap-2 pt-1">
      <button
        id="resize-window-cancel"
        type="button"
        class="rounded border border-line px-2.5 py-1 hover:bg-surface-raised"
      ></button>
      <button
        id="resize-window-submit"
        type="button"
        class="rounded bg-accent px-2.5 py-1 font-medium text-white hover:opacity-90"
      ></button>
    </div>
  </fieldset>
</form>

{@html `<script id="custom-resize-option" type="x-tmpl-mustache">
  <li><a href="#" data-height="{{height}}" data-width="{{width}}" class="custom-resize-window flex items-center gap-1.5 rounded py-1 pr-1.5 pl-6 text-xs text-ink no-underline hover:bg-surface-raised"><span class="size-3.5 shrink-0"></span>{{description}}</a></li>
</script>
<script id="custom-tool" type="x-tmpl-mustache">
  <li><a href="#" data-url="{{url}}" class="custom-tool flex items-center gap-1.5 rounded py-1 pr-1.5 pl-6 text-xs text-ink no-underline hover:bg-surface-raised"><span class="size-3.5 shrink-0"></span>{{description}}</a></li>
</script>`}
