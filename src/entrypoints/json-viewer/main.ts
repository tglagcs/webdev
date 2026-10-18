// The JSON viewer page. See App.svelte for where the document comes from.
import { mount } from "svelte";

import "@/app.css";
import { t } from "@/lib/i18n";
import { initTheme } from "@/lib/theme";
import App from "./App.svelte";

// Before the mount, so a dark setup never sees a light frame.
await initTheme();

document.title = t("jsonViewer");

const params = new URLSearchParams(location.search);
const tab = Number(params.get("tab"));

mount(App, {
  target: document.getElementById("app")!,
  props: {
    embed: params.has("embed"),
    tabId: Number.isInteger(tab) && params.has("tab") ? tab : undefined,
  },
});
